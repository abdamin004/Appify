const { qdrantClient } = require('../config/qdrant');

// Initialize OpenAI client (only if API key is available)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

const COLLECTION_NAME = 'events_embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536; // text-embedding-3-small produces 1536-dimensional vectors

/**
 * Create the events_embeddings collection in Qdrant if it doesn't exist
 */
async function ensureCollectionExists() {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    
    if (exists) {
      console.log(`✅ Collection "${COLLECTION_NAME}" already exists`);
      return;
    }

    // Create collection
    await qdrantClient.createCollection(COLLECTION_NAME, {
      vectors: {
        size: EMBEDDING_DIMENSION,
        distance: 'Cosine', // Cosine similarity for text embeddings
      },
    });

    console.log(`✅ Collection "${COLLECTION_NAME}" created successfully`);
  } catch (error) {
    console.error(`❌ Error creating collection "${COLLECTION_NAME}":`, error.message);
    throw error;
  }
}

/**
 * Generate embedding for event text using OpenAI
 * @param {string} text - The text to embed (title + description + tags)
 * @returns {Promise<number[]>} - The embedding vector
 */
async function generateEmbedding(text) {
  try {
    if (!text || !text.trim()) {
      throw new Error('Text is required for embedding generation');
    }

    if (!openai || !process.env.OPENAI_API_KEY) {
      // Return null instead of throwing error - allows graceful degradation
      console.warn('⚠️  OPENAI_API_KEY not set, skipping embedding generation');
      return null;
    }

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
    });

    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error('Invalid response from OpenAI embeddings API');
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

/**
 * Prepare text for embedding (title + description + tags)
 * @param {Object} event - Event object with title, description, and tags
 * @returns {string} - Combined text for embedding
 */
function prepareEventText(event) {
  const parts = [];
  
  if (event.title) {
    parts.push(event.title);
  }
  
  if (event.description) {
    parts.push(event.description);
  }
  
  if (event.tags && Array.isArray(event.tags) && event.tags.length > 0) {
    parts.push(event.tags.join(', '));
  }
  
  return parts.join(' ');
}

/**
 * Store event embedding in Qdrant
 * @param {string} eventId - MongoDB event ID
 * @param {number[]} embedding - The embedding vector
 * @param {Object} payload - Additional metadata to store
 */
async function storeEventEmbedding(eventId, embedding, payload = {}) {
  try {
    // Convert MongoDB ObjectId string to a numeric ID for Qdrant
    // Qdrant requires numeric IDs (uint64) or UUIDs, not arbitrary strings
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(eventId).digest('hex');
    // Use first 15 characters of hash to create a number (safe for uint64)
    const numericId = parseInt(hash.substring(0, 15), 16);
    
    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: numericId,
          vector: embedding,
          payload: {
            eventId: eventId, // Store original MongoDB ID in payload
            ...payload,
          },
        },
      ],
    });

    console.log(`✅ Event embedding stored for event: ${eventId} (Qdrant ID: ${numericId})`);
  } catch (error) {
    console.error('Error storing event embedding:', error.message);
    if (error.response) {
      console.error('Qdrant error details:', error.response.data);
    }
    throw error;
  }
}

/**
 * Generate and store event embedding
 * @param {Object} event - Event object
 * @param {string} eventId - MongoDB event ID
 * @returns {Promise<{embedding: number[], text: string}>} - The embedding and text used
 */
async function generateAndStoreEventEmbedding(event, eventId) {
  try {
    // Check if OpenAI is available
    if (!openai || !process.env.OPENAI_API_KEY) {
      console.warn(`⚠️  OPENAI_API_KEY not set, skipping embedding for event ${eventId}`);
      return null;
    }

    // Prepare text for embedding
    const text = prepareEventText(event);
    
    if (!text.trim()) {
      console.warn(`⚠️  No text available for embedding event ${eventId}`);
      return null;
    }

    // Generate embedding
    const embedding = await generateEmbedding(text);
    
    if (!embedding) {
      // generateEmbedding already logged the warning
      return null;
    }

    // Prepare payload
    const payload = {
      title: event.title || '',
      description: event.description || '',
      tags: event.tags || [],
      type: event.type || '',
      location: event.location || '',
      startDate: event.startDate ? new Date(event.startDate).toISOString() : null,
    };

    // Store in Qdrant
    await storeEventEmbedding(eventId, embedding, payload);

    return {
      embedding,
      text,
      payload,
    };
  } catch (error) {
    console.error('Error in generateAndStoreEventEmbedding:', error.message);
    // Don't throw - allow event creation to succeed even if embedding fails
    return null;
  }
}

/**
 * Search for similar events in Qdrant based on query embeddings
 * @param {number[][]} queryEmbeddings - Array of embedding vectors to search with
 * @param {number} limit - Maximum number of results per query
 * @param {Set<string>} excludeEventIds - Event IDs to exclude from results
 * @returns {Promise<Array>} - Array of recommended event IDs
 */
async function searchSimilarEvents(queryEmbeddings, limit = 10, excludeEventIds = new Set()) {
  try {
    if (!openai || !process.env.OPENAI_API_KEY) {
      console.warn('⚠️  OPENAI_API_KEY not set, skipping Qdrant search');
      return [];
    }

    if (!queryEmbeddings || queryEmbeddings.length === 0) {
      console.warn('⚠️  No query embeddings provided for Qdrant search');
      return [];
    }

    const allResults = new Map(); // Use Map to deduplicate by eventId

    // Search with each query embedding and aggregate results
    for (const queryEmbedding of queryEmbeddings) {
      try {
        const results = await qdrantClient.search(COLLECTION_NAME, {
          vector: queryEmbedding,
          limit: limit,
          with_payload: true,
          score_threshold: 0.5, // Minimum similarity score (0-1)
        });

        // Process results
        for (const result of results) {
          const eventId = result.payload?.eventId;
          if (eventId && !excludeEventIds.has(String(eventId))) {
            // Store with highest score if event appears multiple times
            const currentScore = allResults.get(eventId)?.score || 0;
            if (result.score > currentScore) {
              allResults.set(eventId, {
                eventId: eventId,
                score: result.score,
                payload: result.payload,
              });
            }
          }
        }
      } catch (searchErr) {
        console.error('Error in Qdrant search iteration:', searchErr.message);
        // Continue with other embeddings
      }
    }

    // Sort by score and return event IDs
    const sortedResults = Array.from(allResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return sortedResults;
  } catch (error) {
    console.error('Error searching similar events in Qdrant:', error.message);
    return [];
  }
}

/**
 * Get embeddings for multiple events from Qdrant
 * @param {string[]} eventIds - Array of MongoDB event IDs
 * @returns {Promise<Array>} - Array of {eventId, embedding} objects
 */
async function getEventEmbeddings(eventIds) {
  try {
    if (!eventIds || eventIds.length === 0) {
      return [];
    }

    // Convert MongoDB IDs to Qdrant numeric IDs
    const crypto = require('crypto');
    const qdrantIds = eventIds.map(eventId => {
      const hash = crypto.createHash('md5').update(eventId).digest('hex');
      return parseInt(hash.substring(0, 15), 16);
    });

    // Retrieve points from Qdrant
    const result = await qdrantClient.retrieve(COLLECTION_NAME, {
      ids: qdrantIds,
      with_payload: true,
      with_vectors: true,
    });

    // Map back to MongoDB event IDs
    const embeddings = [];
    for (const point of result) {
      const eventId = point.payload?.eventId;
      if (eventId && point.vector) {
        embeddings.push({
          eventId: eventId,
          embedding: point.vector,
          payload: point.payload,
        });
      }
    }

    return embeddings;
  } catch (error) {
    console.error('Error getting event embeddings from Qdrant:', error.message);
    return [];
  }
}

module.exports = {
  ensureCollectionExists,
  generateEmbedding,
  prepareEventText,
  storeEventEmbedding,
  generateAndStoreEventEmbedding,
  searchSimilarEvents,
  getEventEmbeddings,
  COLLECTION_NAME,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSION,
};

