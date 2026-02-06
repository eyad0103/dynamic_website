const WebSocket = require('ws');
const si = require('systeminformation');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Configuration
const config = {
    serverUrl: 'wss://dynamic-website-hzu1.onrender.com',
    reconnectInterval: 5000,
    heartbeatInterval: 30000,
    errorQueueSize: 100
};

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'agent.log' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});

class PCMonitorAgent {
    constructor(pcId, token) {
        this.pcId = pcId;
        this.token = token;
        this.ws = null;
        this.isConnected = false;
        this.errorQueue = [];
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
        
        logger.info(`PC Monitor Agent initialized for PC: ${pcId}`);
    }

    async start() {
        logger.info('Starting PC Monitor Agent...');
        
        // Get system information
        const systemInfo = await this.getSystemInfo();
        logger.info('System info:', systemInfo);
        
        // Start monitoring
        this.startErrorMonitoring();
        this.connect();
    }

    async getSystemInfo() {
        try {
            const [cpu, osInfo, mem, disks] = await Promise.all([
                si.cpu(),
                si.osInfo(),
                si.mem(),
                si.disksLayout()
            ]);

            return {
                pcId: this.pcId,
                os: {
                    platform: osInfo.platform,
                    distro: osInfo.distro,
                    release: osInfo.release,
                    arch: osInfo.arch
                },
                hardware: {
                    cpu: cpu.model,
                    cores: cpu.cores,
                    memory: Math.round(mem.total / 1024 / 1024 / 1024) + 'GB',
                    disks: disks.map(d => `${d.device} - ${Math.round(d.size / 1024 / 1024 / 1024)}GB`)
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Failed to get system info:', error);
            return null;
        }
    }

    connect() {
        try {
            logger.info(`Connecting to server: ${config.serverUrl}`);
            this.ws = new WebSocket(`${config.serverUrl}/agent?pcId=${this.pcId}&token=${this.token}`);
            
            this.ws.on('open', () => {
                logger.info('Connected to server');
                this.isConnected = true;
                this.startHeartbeat();
                this.sendQueuedErrors();
            });

            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });

            this.ws.on('close', () => {
                logger.warn('Connection closed');
                this.isConnected = false;
                this.stopHeartbeat();
                this.scheduleReconnect();
            });

            this.ws.on('error', (error) => {
                logger.error('WebSocket error:', error);
                this.isConnected = false;
                this.scheduleReconnect();
            });

        } catch (error) {
            logger.error('Failed to connect:', error);
            this.scheduleReconnect();
        }
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'ping':
                    this.send({ type: 'pong', timestamp: new Date().toISOString() });
                    break;
                case 'revoke':
                    logger.warn('Agent revoked by server');
                    this.stop();
                    break;
                case 'config':
                    this.updateConfig(message.config);
                    break;
                default:
                    logger.debug('Unknown message type:', message.type);
            }
        } catch (error) {
            logger.error('Failed to handle message:', error);
        }
    }

    send(data) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            logger.warn('Not connected, message queued');
            this.queueError(data);
        }
    }

    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            this.send({
                type: 'heartbeat',
                pcId: this.pcId,
                timestamp: new Date().toISOString()
            });
        }, config.heartbeatInterval);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    scheduleReconnect() {
        if (this.reconnectTimer) return;
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, config.reconnectInterval);
    }

    startErrorMonitoring() {
        // Monitor application crashes and errors
        process.on('uncaughtException', (error) => {
            this.reportError('uncaughtException', error);
        });

        process.on('unhandledRejection', (reason) => {
            this.reportError('unhandledRejection', reason);
        });

        // Monitor system events
        this.monitorSystemEvents();
    }

    async monitorSystemEvents() {
        try {
            // Monitor CPU usage
            setInterval(async () => {
                const cpu = await si.currentLoad();
                if (cpu.currentLoad > 90) {
                    this.reportError('highCpu', {
                        usage: cpu.currentLoad,
                        threshold: 90
                    });
                }
            }, 10000);

            // Monitor memory usage
            setInterval(async () => {
                const mem = await si.mem();
                const usagePercent = (mem.used / mem.total) * 100;
                if (usagePercent > 90) {
                    this.reportError('highMemory', {
                        usage: usagePercent,
                        threshold: 90
                    });
                }
            }, 10000);

        } catch (error) {
            logger.error('System monitoring error:', error);
        }
    }

    reportError(type, details) {
        const error = {
            type: 'error',
            pcId: this.pcId,
            errorType: type,
            details: details,
            timestamp: new Date().toISOString(),
            stack: details?.stack || ''
        };

        logger.error('Error reported:', error);
        this.send(error);
    }

    queueError(error) {
        this.errorQueue.push(error);
        
        // Keep queue size limited
        if (this.errorQueue.length > config.errorQueueSize) {
            this.errorQueue.shift();
        }
    }

    sendQueuedErrors() {
        while (this.errorQueue.length > 0) {
            const error = this.errorQueue.shift();
            this.send(error);
        }
    }

    updateConfig(newConfig) {
        logger.info('Updating configuration:', newConfig);
        // Update agent configuration based on server settings
    }

    stop() {
        logger.info('Stopping PC Monitor Agent...');
        this.isConnected = false;
        this.stopHeartbeat();
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.ws) {
            this.ws.close();
        }
        
        process.exit(0);
    }
}

// Load configuration from file
function loadConfig() {
    try {
        const configPath = path.join(__dirname, 'agent-config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (error) {
        logger.error('Failed to load config:', error);
    }
    return null;
}

// Main execution
async function main() {
    const config = loadConfig();
    
    if (!config || !config.pcId || !config.token) {
        logger.error('Missing configuration. Please install agent from dashboard.');
        process.exit(1);
    }

    const agent = new PCMonitorAgent(config.pcId, config.token);
    await agent.start();
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    process.exit(0);
});

// Start the agent
main().catch(error => {
    logger.error('Failed to start agent:', error);
    process.exit(1);
});
