# Qdrant Embeddings Setup

## Overview
This system automatically generates embeddings for events using OpenAI's `text-embedding-3-small` model and stores them in Qdrant for semantic search.

## Configuration

### Environment Variables
Add to your `.env` file:

```env
# OpenAI API Key (required for embeddings)
OPENAI_API_KEY=your-openai-api-key-here

# Qdrant Configuration
QDRANT_URL=http://localhost:6333  # For local development
# OR
QDRANT_URL=http://qdrant:6333     # For Docker
QDRANT_API_KEY=your-qdrant-api-key-here  # Optional
```

### Collection Details
- **Collection Name**: `events_embeddings`
- **Embedding Model**: `text-embedding-3-small`
- **Vector Dimension**: 1536
- **Distance Metric**: Cosine similarity

## How It Works

1. **Collection Creation**: The `events_embeddings` collection is automatically created on server startup if it doesn't exist.

2. **Event Creation**: When a new event is created:
   - The system combines: `title + description + tags`
   - Generates an embedding using OpenAI's API
   - Stores the embedding in Qdrant with event metadata
   - Sends the vectors and payload to n8n webhook at `/webhook-test/embedding`

3. **Payload Sent to n8n**:
   ```json
   {
     "eventId": "mongodb-event-id",
     "vectors": [0.123, 0.456, ...],  // 1536-dimensional vector
     "payload": {
       "eventId": "mongodb-event-id",
       "title": "Event Title",
       "description": "Event Description",
       "tags": ["tag1", "tag2"],
       "type": "Workshop",
       "location": "Location",
       "startDate": "2024-01-01T00:00:00.000Z",
       "createdAt": "2024-01-01T00:00:00.000Z"
     },
     "text": "Combined title, description, and tags text"
   }
   ```

## Files

- `backend/utils/embeddings.js` - Embedding generation and Qdrant operations
- `backend/config/qdrant.js` - Qdrant client configuration
- `backend/controllers/eventController.js` - Event creation with embedding generation
- `backend/server.js` - Collection initialization on startup

## Testing

1. Create a new event via the API
2. Check server logs for:
   - `✅ Collection "events_embeddings" created successfully` (first time)
   - `✅ Event embedding stored for event: <eventId>`
   - `✅ Embedding sent to n8n for event: <eventId>`

3. Verify in Qdrant:
   - Check collections: `GET http://localhost:6333/collections`
   - View points: Use Qdrant UI or API

## Error Handling

- Embedding generation failures don't block event creation
- n8n webhook failures are logged but don't fail the request
- Missing OpenAI API key will cause embedding generation to fail gracefully

