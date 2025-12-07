const { QdrantClient } = require('@qdrant/js-client-rest');

// Qdrant configuration from environment variables
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || '';

// Create Qdrant client
const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY || undefined, // Only include API key if it's set
});

// Test connection function
async function testQdrantConnection() {
  try {
    const collections = await qdrantClient.getCollections();
    console.log('✅ Qdrant connected successfully');
    console.log(`📊 Available collections: ${collections.collections.length}`);
    return true;
  } catch (error) {
    console.error('❌ Qdrant connection failed:', error.message);
    return false;
  }
}

// Initialize Qdrant connection
async function connectQdrant() {
  try {
    console.log(`🔌 Connecting to Qdrant at ${QDRANT_URL}...`);
    const isConnected = await testQdrantConnection();
    if (!isConnected) {
      console.warn('⚠️  Qdrant connection failed, but continuing...');
    }
    return qdrantClient;
  } catch (error) {
    console.error('❌ Failed to initialize Qdrant:', error);
    return null;
  }
}

module.exports = {
  qdrantClient,
  connectQdrant,
  testQdrantConnection,
};

