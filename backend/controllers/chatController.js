const axios = require('axios');
const User = require('../models/User');

const chatController = {
    async sendMessage(req, res) {
        try {
            const { message } = req.body;
            const userId = req.user?._id;
            
            if (!message || !message.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Message is required'
                });
            }

            // Get user info for context
            let userInfo = null;
            if (userId) {
                try {
                    const user = await User.findById(userId).select('name email role').lean();
                    if (user) {
                        userInfo = {
                            name: user.name,
                            email: user.email,
                            role: user.role
                        };
                    }
                } catch (userErr) {
                    console.warn('Could not fetch user info for chat:', userErr);
                }
            }

            // Prepare payload for n8n webhook
            const payload = {
                message: message.trim(),
                userId: userId ? userId.toString() : null,
                userInfo: userInfo,
                timestamp: new Date().toISOString()
            };

            // Determine webhook URL
            const webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://host.docker.internal:5678';
            const chatWebhookPath = process.env.N8N_CHAT_WEBHOOK_PATH || '/webhook/chatbot';

            try {
                const response = await axios.post(
                    `${webhookUrl}${chatWebhookPath}`,
                    payload,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        timeout: 30000 // 30 second timeout
                    }
                );

                // Handle response from n8n's "Respond to Webhook" node
                let botResponse = null;
                
                if (response.data) {
                    if (typeof response.data === 'object' && !Array.isArray(response.data)) {
                        // Check if n8n wrapped it in a specific format
                        if (response.data.output) {
                            botResponse = response.data.output;
                        } else if (response.data.data) {
                            botResponse = response.data.output;
                        } else if (response.data.message) {
                            botResponse = response.data.output;
                        } else if (response.data.text) {
                            botResponse = response.data.output;
                        } else if (response.data.response) {
                            botResponse = response.data.output;
                        } else {
                            // Use the entire response.data as response
                            botResponse = response.data.output;
                        }
                    } else if (typeof response.data === 'string') {
                        botResponse = response.data;
                    } else {
                        botResponse = response.data;
                    }
                }

                // If botResponse is a JSON string, parse it
                if (typeof botResponse === 'string') {
                    try {
                        const parsed = JSON.parse(botResponse);
                        if (parsed.message || parsed.text || parsed.response) {
                            botResponse = parsed.message || parsed.text || parsed.response;
                        }
                    } catch (parseErr) {
                        // If parsing fails, use the string as is
                        console.log('Bot response is a plain string, using as is');
                    }
                }

                // Ensure we have a string response
                const finalResponse = typeof botResponse === 'string' 
                    ? botResponse 
                    : (botResponse?.message || botResponse?.text || botResponse?.response || 'I received your message, but I\'m not sure how to respond.');

                return res.status(200).json({
                    success: true,
                    message: finalResponse
                });

            } catch (webhookErr) {
                console.error('Chat webhook error:', webhookErr.message);

                // Handle different error types
                if (webhookErr.code === 'ECONNREFUSED' || webhookErr.code === 'ETIMEDOUT') {
                    return res.status(503).json({
                        success: false,
                        message: 'Chat service is currently unavailable. Please try again later.',
                        error: 'Service unavailable'
                    });
                }

                if (webhookErr.response) {
                    return res.status(webhookErr.response.status || 500).json({
                        success: false,
                        message: webhookErr.response.data?.message || webhookErr.response.data || 'Failed to get response from chat service',
                        error: webhookErr.response.data
                    });
                }

                return res.status(500).json({
                    success: false,
                    message: webhookErr.message || 'Failed to send message'
                });
            }

        } catch (err) {
            console.error('Error in sendMessage:', err);
            return res.status(500).json({
                success: false,
                message: err.message || 'An unexpected error occurred'
            });
        }
    }
};

module.exports = chatController;

