// Error Tracking Agent for PC monitoring
class ErrorTrackingAgent {
    constructor(pcName, ownerWebsite, apiKey) {
        this.pcName = pcName;
        this.ownerWebsite = ownerWebsite;
        this.apiKey = apiKey;
        this.isRunning = false;
        this.lastReportSent = null;
        this.errorCount = 0;
        this.lastError = null;
        
        console.log(`🖥 Error Tracking Agent initialized for: ${pcName}`);
        this.start();
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log(`🚀 Starting error monitoring for: ${this.pcName}`);
        
        // Monitor for application errors
        this.monitorErrors();
        
        // Monitor for crashes
        this.monitorCrashes();
        
        // Periodic status check
        this.statusInterval = setInterval(() => {
            this.sendStatus();
        }, 60000); // Every minute
    }
    
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        clearInterval(this.statusInterval);
        console.log(`⏹️ Stopped error monitoring for: ${this.pcName}`);
    }
    
    monitorErrors() {
        // Monitor for JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError('javascript', event.error);
        });
        
        // Monitor for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('unhandledrejection', event.reason);
        });
        
        // Monitor for console errors
        const originalConsoleError = console.error;
        console.error = (...args) => {
            this.handleError('console', args.join(' '));
            originalConsoleError(...args);
        };
    }
    
    monitorCrashes() {
        // Monitor for page visibility changes (app crashes)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.handleError('visibility', 'Application hidden - possible crash');
            }
        });
        
        // Monitor for beforeunload events (app closing)
        window.addEventListener('beforeunload', () => {
            this.handleError('beforeunload', 'Application closing');
        });
    }
    
    handleError(errorType, errorDetails) {
        this.errorCount++;
        this.lastError = {
            type: errorType,
            details: errorDetails,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            appVersion: this.getAppVersion()
        };
        
        console.error(`🚨 Error detected on ${this.pcName}:`, errorType, errorDetails);
        
        // Send report immediately
        this.sendErrorReport();
    }
    
    getAppVersion() {
        // Try to get app version from meta tags or manifest
        const metaTags = document.querySelectorAll('meta[name]');
        const versionTag = Array.from(metaTags).find(tag => tag.name === 'version');
        
        if (versionTag) {
            return versionTag.content;
        }
        
        // Try to get from package.json (if available)
        try {
            const manifest = JSON.parse(localStorage.getItem('manifest') || '{}');
            return manifest.version || 'Unknown';
        } catch (e) {
            return 'Unknown';
        }
    }
    
    async sendErrorReport() {
        try {
            const reportData = {
                pcName: this.pcName,
                errorCount: this.errorCount,
                lastError: this.lastError,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                appVersion: this.getAppVersion(),
                agentVersion: 'v1.0.0'
            };
            
            console.log('📡 Sending error report for:', this.pcName);
            
            const response = await fetch(`${this.ownerWebsite}/api/error-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reportData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Error report sent successfully:', result);
                this.lastReportSent = new Date().toISOString();
            } else {
                console.error('❌ Failed to send error report:', response.status);
            }
            
        } catch (error) {
            console.error('❌ Error sending report:', error);
        }
    }
    
    getStatus() {
        return {
            pcName: this.pcName,
            isRunning: this.isRunning,
            errorCount: this.errorCount,
            lastError: this.lastError,
            lastReportSent: this.lastReportSent,
            timestamp: new Date().toISOString(),
            status: this.isRunning ? 'online' : 'offline'
        };
    }
}

// Auto-start error tracking for this PC
const startErrorTracking = (pcName, ownerWebsite, apiKey) => {
    // Only start if not already running
    if (window.errorTrackingAgent) {
        return;
    }
    
    window.errorTrackingAgent = new ErrorTrackingAgent(pcName, ownerWebsite, apiKey);
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorTrackingAgent, startErrorTracking };
}
