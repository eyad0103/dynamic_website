// Test API key with different approach
const testApiKey = () => {
    const apiKey = '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';
    
    console.log('🔑 Testing API key:', apiKey);
    console.log('🔑 API key length:', apiKey.length);
    console.log('🔑 API key format check:', apiKey.startsWith('sk-or-v1-'));
    
    // Test with curl-like fetch
    const testWithFetch = async () => {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://dynamic-website-hzu1.onrender.com',
                    'X-Title': 'API Test'
                },
                body: JSON.stringify({
                    model: 'anthropic/claude-3-haiku',
                    messages: [
                        {
                            role: 'user',
                            content: 'Test message'
                        }
                    ],
                    max_tokens: 50,
                    temperature: 0.7
                })
            });
            
            console.log('📡 Status:', response.status);
            const text = await response.text();
            console.log('📡 Response:', text);
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    };
    
    testWithFetch();
};

testApiKey();
