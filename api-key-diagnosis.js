// API Key Diagnosis
const apiKey = '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';

console.log('🔑 API Key Analysis:');
console.log('Full Key:', apiKey);
console.log('Length:', apiKey.length);
console.log('Format Check:', apiKey.startsWith('sk-or-v1-'));
console.log('Format Check:', apiKey.includes('sk-or-v1-'));
console.log('Format Check:', apiKey.length === 73);

// Check if key has the expected OpenRouter format
const expectedPrefix = 'sk-or-v1-';
const hasCorrectPrefix = apiKey.startsWith(expectedPrefix);
const expectedLength = 73;

console.log('\n🔍 Diagnosis Results:');
if (!hasCorrectPrefix) {
    console.log('❌ ERROR: API key does not start with "sk-or-v1-"');
    console.log('❌ Expected format: sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
} else {
    console.log('✅ API key has correct prefix');
}

if (apiKey.length !== expectedLength) {
    console.log(`❌ ERROR: API key length is ${apiKey.length}, expected ${expectedLength}`);
} else {
    console.log('✅ API key has correct length');
}

console.log('\n🚨 RECOMMENDATIONS:');
console.log('1. Check if the OpenRouter account is active');
console.log('2. Verify the API key in OpenRouter dashboard');
console.log('3. Generate a new API key if needed');
console.log('4. Ensure the account has sufficient credits');

console.log('\n🔗 Next Steps:');
console.log('1. Go to https://openrouter.ai/');
console.log('2. Check your account status');
console.log('3. Generate a new API key if needed');
console.log('4. Update the API key in the dashboard');
