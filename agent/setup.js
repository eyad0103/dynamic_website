#!/usr/bin/env node

/**
 * Agent Setup Script
 * Creates agent configuration from user input
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function setupAgent() {
    console.log('🚀 PC Monitor Agent Setup');
    console.log('============================\n');
    
    try {
        // Get configuration from user
        const pcId = await question('Enter your PC ID: ');
        const token = await question('Enter your registration token: ');
        const serverUrl = await question('Enter server URL (default: https://dynamic-website-hzu1.onrender.com): ') || 
                         'https://dynamic-website-hzu1.onrender.com';
        
        if (!pcId || !token) {
            console.log('❌ PC ID and token are required!');
            process.exit(1);
        }
        
        // Create configuration
        const config = {
            serverUrl,
            pcId,
            token
        };
        
        // Write configuration file
        const configFile = path.join(__dirname, 'agent-config.json');
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        
        console.log('✅ Configuration saved to:', configFile);
        console.log('\n📋 Setup Complete!');
        console.log('Next steps:');
        console.log('1. Run: npm install');
        console.log('2. Run: npm run install-service (Windows) or sudo npm start (Linux/macOS)');
        console.log('3. The agent will start automatically on boot');
        console.log('\n📝 Logs will be saved to: agent.log');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

if (require.main === module) {
    setupAgent();
}

module.exports = { setupAgent };
