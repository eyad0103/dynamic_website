// PC Agent - REAL connection to dashboard
class PCAgent {
    constructor(pcId, authToken, serverUrl) {
        this.pcId = pcId;
        this.authToken = authToken;
        this.serverUrl = serverUrl || 'https://dynamic-website-hzu1.onrender.com';
        this.heartbeatInterval = null;
        this.isConnected = false;
    }

    async start() {
        try {
            console.log(`🚀 Starting PC Agent for ${this.pcId}`);
            
            // Get system info
            const systemInfo = await this.getSystemInfo();
            
            // Register with server
            await this.register(systemInfo);
            
            // Start heartbeat
            this.startHeartbeat();
            
            console.log(`✅ PC Agent started successfully for ${this.pcId}`);
            
        } catch (error) {
            console.error('❌ Failed to start PC Agent:', error);
            setTimeout(() => this.start(), 5000); // Retry after 5 seconds
        }
    }

    async getSystemInfo() {
        const info = {
            hostname: this.getHostname(),
            OS: this.getOS(),
            local_ip: this.getLocalIP()
        };
        
        console.log('📊 System Info:', info);
        return info;
    }

    getHostname() {
        return typeof window !== 'undefined' && window.location 
            ? window.location.hostname 
            : (typeof require !== 'undefined' ? require('os').hostname() : 'Unknown');
    }

    getOS() {
        if (typeof window !== 'undefined') {
            return navigator.platform || 'Unknown';
        } else if (typeof require !== 'undefined') {
            const os = require('os');
            return `${os.type()} ${os.release()}` || 'Unknown';
        }
        return 'Unknown';
    }

    getLocalIP() {
        if (typeof window !== 'undefined') {
            return 'Browser';
        } else if (typeof require !== 'undefined') {
            const os = require('os');
            const interfaces = os.networkInterfaces();
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name]) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        return iface.address;
                    }
                }
            }
        }
        return 'Unknown';
    }

    async register(systemInfo) {
        const response = await fetch(`${this.serverUrl}/api/register-agent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pc_id: this.pcId,
                auth_token: this.authToken,
                hostname: systemInfo.hostname,
                OS: systemInfo.OS,
                local_ip: systemInfo.local_ip
            })
        });

        const result = await response.json();
        
        if (result.success) {
            this.isConnected = true;
            console.log(`✅ Registered successfully: ${this.pcId}`);
        } else {
            throw new Error(result.error || 'Registration failed');
        }
    }

    startHeartbeat() {
        // Send heartbeat every 3 seconds
        this.heartbeatInterval = setInterval(async () => {
            try {
                const metrics = await this.getMetrics();
                await this.sendHeartbeat(metrics);
            } catch (error) {
                console.error('❌ Heartbeat failed:', error);
            }
        }, 3000);

        // Send initial heartbeat
        this.sendHeartbeat({});
    }

    async getMetrics() {
        if (typeof window !== 'undefined') {
            // Browser metrics
            return {
                cpu: 'N/A',
                ram: 'N/A'
            };
        } else if (typeof require !== 'undefined') {
            // Node.js metrics
            const os = require('os');
            const cpuUsage = process.cpuUsage();
            const memoryUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const usedMemory = memoryUsage.rss;
            
            return {
                cpu: Math.round(cpuUsage.user / 1000000), // Convert to percentage
                ram: Math.round((usedMemory / totalMemory) * 100)
            };
        }
        return { cpu: 0, ram: 0 };
    }

    async sendHeartbeat(metrics) {
        const response = await fetch(`${this.serverUrl}/api/heartbeat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pc_id: this.pcId,
                timestamp: new Date().toISOString(),
                cpu: metrics.cpu,
                ram: metrics.ram
            })
        });

        if (!response.ok) {
            throw new Error(`Heartbeat failed: ${response.status}`);
        }
    }

    stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        this.isConnected = false;
        console.log(`🛑 PC Agent stopped: ${this.pcId}`);
    }
}

// Auto-start if credentials are provided
if (typeof window !== 'undefined') {
    // Browser environment - check for credentials in URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const pcId = urlParams.get('pc_id') || localStorage.getItem('pc_id');
    const authToken = urlParams.get('auth_token') || localStorage.getItem('auth_token');
    
    if (pcId && authToken) {
        const agent = new PCAgent(pcId, authToken);
        agent.start();
    } else {
        console.log('⚠️ PC Agent: Missing credentials. Provide pc_id and auth_token as URL parameters or in localStorage.');
        console.log('Example: agent.html?pc_id=PC-123-abc&auth_token=your_token_here');
    }
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = PCAgent;
}
