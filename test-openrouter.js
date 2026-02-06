// Test OpenRouter API directly
const testOpenRouterAPI = async () => {
    const apiKey = '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';
    
    try {
        console.log('🔑 Testing OpenRouter API with key:', apiKey.substring(0, 10) + '...');
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://dynamic-website-hzu1.onrender.com',
                'X-Title': 'API Key Test'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3-haiku',
                messages: [
                    {
                        role: 'user',
                        content: 'Hello, this is a test message to verify the API key is working'
                    }
                ],
                max_tokens: 100,
                temperature: 0.7
            })
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ OpenRouter API error:', errorText);
            return { success: false, error: errorText };
        }
        
        const data = await response.json();
        console.log('✅ OpenRouter response data:', data);
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            console.log('🤖 AI Response:', data.choices[0].message.content);
            return { success: true, response: data.choices[0].message.content };
        } else {
            console.error('❌ Invalid response format from OpenRouter');
            return { success: false, error: 'Invalid response format' };
        }
        
    } catch (error) {
        console.error('❌ OpenRouter API test failed:', error);
        return { success: false, error: error.message };
    }
};

// Run the test
testOpenRouterAPI().then(result => {
    console.log('🎯 Test result:', result);
}).catch(error => {
    console.error('💥 Test failed:', error);
});
