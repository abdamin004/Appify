# LinkedIn Post Integration Setup Guide

This guide explains how to set up the LinkedIn posting feature for events.

## Overview

The LinkedIn posting feature allows EventOffice, Admin, and Professor users to create LinkedIn posts for events. The entire posting process is handled by n8n workflow - the backend simply sends event data to n8n, and n8n handles generating the post description and posting it to LinkedIn.

## Prerequisites

1. **n8n Workflow**: A webhook workflow that handles LinkedIn posting
2. **LinkedIn API Credentials**: Configured in n8n (not in the backend)

## Step 1: Set Up n8n Workflow

1. Create a new n8n workflow
2. Add a **Webhook** node (trigger)
3. Configure the webhook path: `/webhook-test/post` (or your custom path)
4. The webhook will receive event data in the POST request body:
   ```json
   {
     "eventId": "...",
     "title": "Event Title",
     "description": "Event description...",
     "type": "Workshop",
     "location": "Location",
     "startDate": "2024-01-01",
     "endDate": "2024-01-02",
     "tags": ["tag1", "tag2"],
     "price": 100,
     "capacity": 50,
     "registeredCount": 10
   }
   ```

5. In your n8n workflow:
   - Generate LinkedIn post description from event data
   - Post to LinkedIn using LinkedIn API
   - Return a success response

6. Add a **Respond to Webhook** node to return the response

### Example n8n Workflow Structure:

```
Webhook (Trigger) - Path: /webhook-test/post
  ↓
Function/Code Node (Generate Post Text)
  ↓
LinkedIn API Node (Post to LinkedIn)
  ↓
Respond to Webhook (Return success/error)
```

## Step 2: Configure Environment Variables

Add these to your `.env` file:

### For Docker/Local Development:
```env
# n8n Webhook Configuration
N8N_WEBHOOK_URL=http://n8n:5678
N8N_LINKEDIN_WEBHOOK_PATH=/webhook/post
```

### For Production:
```env
# n8n Webhook Configuration (use your production n8n URL)
N8N_WEBHOOK_URL=https://your-n8n-instance.com
# or if n8n is on a different port:
# N8N_WEBHOOK_URL=https://your-n8n-instance.com:5678

# Webhook path must match exactly what you configured in n8n
N8N_LINKEDIN_WEBHOOK_PATH=/webhook/post
```

**Important Notes:**
- The `N8N_WEBHOOK_URL` should be the full base URL of your n8n instance (without the webhook path)
- The `N8N_LINKEDIN_WEBHOOK_PATH` must match exactly the path you configured in your n8n webhook node
- For Docker: use `http://n8n:5678` (service name)
- For Production: use your actual n8n domain/URL
- All LinkedIn API credentials (Client ID, Client Secret, Access Token, Person URN) should be configured in your n8n workflow, not in the backend environment variables.

## Step 3: Test the Integration

1. **Test n8n Webhook**:
   - Create a test event
   - Go to the event detail page
   - Click "💼 Post to LinkedIn" button
   - Check n8n workflow execution logs

2. **Verify LinkedIn Post**:
   - Check if the post appears on LinkedIn
   - Review n8n workflow logs for any errors

## How It Works

### Flow:

1. **User clicks "Post to LinkedIn"** button on event detail page
2. **Backend calls n8n webhook** with event data:
   ```json
   {
     "eventId": "...",
     "title": "Event Title",
     "description": "Event description...",
     "type": "Workshop",
     "location": "Location",
     "startDate": "2024-01-01",
     "endDate": "2024-01-02",
     "tags": ["tag1", "tag2"],
     "price": 100,
     "capacity": 50,
     "registeredCount": 10
   }
   ```

3. **n8n workflow processes the request**:
   - Generates LinkedIn post description
   - Posts to LinkedIn using LinkedIn API
   - Returns success/error response

4. **Backend returns response** to frontend

5. **Frontend shows success/error message**

## Troubleshooting

### Issue: "Failed to create LinkedIn post via n8n" or "404 Not Found"

**Solution:**
1. **Check the webhook URL in logs**: The backend logs will show the exact URL being called
   - Look for: `🔗 Webhook URL: ...` in the backend logs
   
2. **Verify environment variables**:
   - Check `N8N_WEBHOOK_URL` is set correctly:
     - Docker: `http://n8n:5678`
     - Production: Your actual n8n URL (e.g., `https://n8n.yourdomain.com`)
   - Check `N8N_LINKEDIN_WEBHOOK_PATH` matches your n8n webhook path exactly
   
3. **Verify n8n webhook configuration**:
   - Open your n8n workflow
   - Check the Webhook node path (e.g., `/webhook/post`)
   - Ensure it matches `N8N_LINKEDIN_WEBHOOK_PATH` exactly (case-sensitive)
   - Make sure the webhook is **active** and set to accept **POST** requests
   
4. **Test the webhook manually**:
   ```bash
   curl -X POST "https://your-n8n-url.com/webhook/post" \
     -H "Content-Type: application/json" \
     -d '{"eventId": "test", "title": "Test Event"}'
   ```
   
5. **Check n8n workflow logs**:
   - Go to n8n execution history
   - Check if the webhook was triggered
   - Review any error messages

### Issue: n8n workflow not receiving data

**Solution:**
- Verify `N8N_WEBHOOK_URL` is correct (use `http://n8n:5678` for Docker)
- Check webhook path matches exactly (case-sensitive)
- Test the webhook manually using Postman or curl

### Issue: LinkedIn posting fails in n8n

**Solution:**
- Check LinkedIn API credentials in n8n workflow
- Verify LinkedIn access token is valid and has required permissions
- Check LinkedIn API rate limits
- Review n8n workflow execution logs

## n8n Workflow Configuration

### Required LinkedIn API Permissions in n8n:

- `w_member_social` - Required for posting content
- `r_liteprofile` or `r_basicprofile` - For user profile access (if needed)

### LinkedIn API Endpoint:

Use the LinkedIn Share API endpoint in n8n:
- `POST https://api.linkedin.com/v2/ugcPosts`

### Example n8n LinkedIn Node Configuration:

1. **LinkedIn Node** (or HTTP Request node):
   - Method: POST
   - URL: `https://api.linkedin.com/v2/ugcPosts`
   - Headers:
     - `Authorization: Bearer {{$env.LINKEDIN_ACCESS_TOKEN}}`
     - `Content-Type: application/json`
     - `X-Restli-Protocol-Version: 2.0.0`
   - Body:
     ```json
     {
       "author": "urn:li:person:YOUR_PERSON_URN",
       "lifecycleState": "PUBLISHED",
       "specificContent": {
         "com.linkedin.ugc.ShareContent": {
           "shareCommentary": {
             "text": "{{$json.postText}}"
           },
           "shareMediaCategory": "NONE"
         }
       },
       "visibility": {
         "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
       }
     }
     ```

## Security Notes

⚠️ **Important:**
- Store LinkedIn credentials securely in n8n (use n8n credentials or environment variables)
- Never commit credentials to version control
- Use OAuth 2.0 flow for production (don't hardcode tokens)
- Rotate tokens regularly

## Response Format

The n8n webhook should return a JSON response:

**Success:**
```json
{
  "success": true,
  "message": "LinkedIn post created successfully",
  "postId": "urn:li:ugcPost:..."
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error information"
}
```

## Next Steps

1. Set up your n8n workflow for LinkedIn posting
2. Configure LinkedIn API credentials in n8n
3. Test with a sample event
4. Deploy to production

## Support

For issues or questions:
- Check n8n workflow logs
- Check backend logs for API errors
- Verify webhook URL and path configuration
- Test webhook manually using Postman or curl
