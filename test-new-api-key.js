// Test new API key
const testNewApiKey = async () => {
    const apiKey = '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';
    
    console.log('🔑 Testing NEW API key:', apiKey.substring(0, 15) + '...');
    console.log('🔑 API key length:', apiKey.length);
    
    try {
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
                        content: 'Hello! This is a test to verify the API key is working correctly.'
                    }
                ],
                max_tokens: 100,
                temperature: 0.7
            })
        });
        
        console.log('📡 Response status:', response.status);
        
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

// Test the new API key
testNewApiKey().then(result => {
    console.log('🎯 NEW API KEY TEST RESULT:', result);
    if (result.success) {
        console.log('🎉 SUCCESS: API key is working!');
        console.log('🎉 AI Response:', result.response);
    } else {
        console.log('❌ FAILED:', result.error);
    }
}).catch(error => {
    console.error('💥 TEST FAILED:', error);
});
