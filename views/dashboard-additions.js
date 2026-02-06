function runCredentials() {
            const apiKey = document.getElementById('apiKey').value;
            
            if (!apiKey) {
                showNotification('error', 'Missing API Key', 'Please enter an API key first');
                return;
            }
            
            // Create agent code with current API key
            const agentCode = generateAgentCodeWithApiKey(apiKey);
            
            // Create a new window with agent code
            const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
            newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>PC Agent - Ready to Run</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a2e; color: #00ff88; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .code-block { background: #000; padding: 20px; border-radius: 8px; border: 2px solid #00ff88; margin: 20px 0; }
                        .instructions { background: rgba(0, 255, 136, 0.1); padding: 15px; border-radius: 8px; margin: 20px 0; }
                        .btn { background: #00ff88; color: #000; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; margin: 10px 5px; }
                        .btn:hover { background: #00cc70; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🚀 PC Agent Ready</h1>
                        <p>Your agent is configured and ready to connect to the dashboard</p>
                    </div>
                    
                    <div class="instructions">
                        <h3>📋 Instructions:</h3>
                        <ol>
                            <li>Copy the code below</li>
                            <li>Save it as <code>agent.html</code></li>
                            <li>Open the file in your web browser</li>
                            <li>The agent will automatically connect to your dashboard</li>
                        </ol>
                    </div>
                    
                    <div class="code-block">
                        <pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word;">${agentCode}</pre>
                    </div>
                    
                    <div style="text-align: center;">
                        <button class="btn" onclick="navigator.clipboard.writeText(\`${agentCode.replace(/`/g, '\\`')}\`)">
                            📋 Copy Code
                        </button>
                        <button class="btn" onclick="window.close()">
                            ❌ Close
                        </button>
                    </div>
                </body>
                </html>
            `);
        }
        
        function generateAgentCodeWithApiKey(apiKey) {
            const websiteUrl = window.location.origin;
            
            return '<!-- PC Agent for Dashboard Connection -->' +
                   '<script src="' + websiteUrl + '/agent.js"><\/script>' +
                   '<script>' +
                   '// Auto-start with credentials from URL parameters' +
                   'const urlParams = new URLSearchParams(window.location.search);' +
                   'const pcId = urlParams.get("pc_id") || localStorage.getItem("pc_id");' +
                   'const authToken = urlParams.get("auth_token") || localStorage.getItem("auth_token");' +
                   'if (pcId && authToken) {' +
                   '    const agent = new PCAgent(pcId, authToken, "' + websiteUrl + '");' +
                   '    agent.start();' +
                   '}' +
                   '<\/script>';
        }
