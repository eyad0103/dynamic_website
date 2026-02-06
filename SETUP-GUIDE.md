# PC Monitor Agent - Complete Installation Guide

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+ installed
- Internet connection to `https://dynamic-website-hzu1.onrender.com`
- Administrator privileges (for service installation)

---

## 📋 Step-by-Step Installation

### Step 1: Create Agent Package
```bash
curl -X POST -H "Content-Type: application/json" \
-d '{"pcName":"YOUR-PC-NAME","pcLocation":"Office","pcOwner":"YOUR-NAME","pcType":"Workstation","pcDescription":"Main development PC"}' \
https://dynamic-website-hzu1.onrender.com/api/create-agent-package
```

**Response Example:**
```json
{
  "success": true,
  "packageId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "pcId": "PC-1770404695117-qjhkijpdd",
  "downloadUrl": "/api/agent-package/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

### Step 2: Download Agent Configuration
Replace `{packageId}` with your package ID from Step 1:
```bash
curl https://dynamic-website-hzu1.onrender.com/api/agent-package/{packageId} > agent-config.json
```

### Step 3: Download PC Monitor Agent
```bash
# Download the agent.js file
curl https://dynamic-website-hzu1.onrender.com/agent.js > agent.js

# Or download the complete agent package (includes all files)
curl https://dynamic-website-hzu1.onrender.com/api/agent-package/{packageId} > agent-package.zip
unzip agent-package.zip
```

### Step 4: Install Dependencies
```bash
npm install
```

### Step 5: Start the Agent
```bash
node agent.js
```

**Expected Output:**
```
info: PC Monitor Agent starting...
info: Configuration loaded
info: Agent registered successfully
info: PC Monitor Agent started successfully
```

---

## 🔧 Windows Service Installation

### Step 1: Install as Windows Service
```bash
npm run install-service
```

### Step 2: Verify Service Installation
```bash
# Check Windows Services
services.msc
# Look for "PC Monitor Agent"
```

### Step 3: Start the Service
```bash
# Automatic after installation
# Or manually:
net start "PC Monitor Agent"
```

---

## 🐧 Linux/macOS Service Installation

### Step 1: Create Systemd Service
```bash
sudo nano /etc/systemd/system/pc-monitor-agent.service
```

**Service Configuration:**
```ini
[Unit]
Description=PC Monitor Agent
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/pc-monitor-agent
ExecStart=/usr/bin/node agent.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Step 2: Enable and Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable pc-monitor-agent
sudo systemctl start pc-monitor-agent
```

### Step 3: Check Service Status
```bash
sudo systemctl status pc-monitor-agent
```

---

## ✅ Verification Commands

### Check Agent Registration
```bash
curl https://dynamic-website-hzu1.onrender.com/api/agents-status
```

### Test Error Reporting
```bash
curl -X POST -H "Content-Type: application/json" \
-d '{"pcId":"YOUR-PC-ID","appName":"test-app","errorType":"test-error","message":"Test error verification","stackTrace":"Test stack","severity":"low","timestamp":"2026-02-06T18:00:00.000Z"}' \
https://dynamic-website-hzu1.onrender.com/api/error-report
```

### View Dashboard
Visit: https://dynamic-website-hzu1.onrender.com/dashboard

---

## � File Structure

```
pc-monitor-agent/
├── agent.js              # Main agent application
├── agent-config.json     # Configuration file
├── agent.log            # Agent logs
├── package.json         # Dependencies
├── install-service.js   # Windows service installer
├── uninstall-service.js # Windows service uninstaller
└── node_modules/        # Installed dependencies
```

---

## 🔌 Configuration Options

### Manual Configuration File
Create `agent-config.json`:
```json
{
  "serverUrl": "https://dynamic-website-hzu1.onrender.com",
  "wsUrl": "wss://dynamic-website-hzu1.onrender.com",
  "pcId": "YOUR-PC-ID",
  "token": "YOUR-64-CHAR-TOKEN"
}
```

### Environment Variables
```bash
export PC_MONITOR_SERVER="https://dynamic-website-hzu1.onrender.com"
export PC_MONITOR_TOKEN="YOUR-TOKEN"
export PC_MONITOR_PC_ID="YOUR-PC-ID"
```

---

## 🚨 Troubleshooting

### Agent Won't Register
**Problem**: Agent shows registration errors  
**Solution**: 
1. Verify PC ID format: `PC-{timestamp}-{hash}`
2. Check token is 64-character hex string
3. Ensure network connectivity to server
4. Check agent logs: `agent.log`

```bash
# Test connectivity
curl -I https://dynamic-website-hzu1.onrender.com/api/system/status
```

### No Errors Showing
**Problem**: Dashboard shows 0 errors  
**Solution**:
1. Verify agent is registered: `/api/agents-status`
2. Check error endpoint: `/api/error-reports`
3. Test with manual error report
4. Review dashboard for PC status

### AI Chat Issues
**Problem**: AI chat returns errors  
**Solution**:
1. Check API key configuration on server
2. Verify OpenRouter service status
3. Retry logic handles temporary failures
4. Response time tracking included

### Service Installation Issues
**Windows**:
- Run as Administrator
- Ensure Node.js is in PATH
- Check Windows Event Viewer for errors

**Linux/macOS**:
- Use `sudo` for system commands
- Check systemd logs: `journalctl -u pc-monitor-agent`
- Verify file permissions

---

## 📊 System Features

### ✅ What's Working
- **Real-time Agent Registration**: Automatic PC detection and registration
- **Error Reporting**: Live error capture with AI analysis
- **Dashboard**: Real-time PC status and error monitoring
- **AI Chat**: Stable error analysis with retry logic
- **Authentication**: Secure token-based validation
- **Cross-platform**: Windows, Linux, macOS support
- **Service Integration**: Native system service installation

### 🔍 Monitoring Capabilities
- **Windows**: Event Log monitoring, process crash detection
- **Linux**: Systemd journal monitoring, process tracking
- **macOS**: System log monitoring, application crash detection
- **System Resources**: CPU, memory, disk, network monitoring
- **Application Errors**: Real-time error capture and reporting

---

## 🔄 Advanced Usage

### Multiple PC Management
```bash
# Create packages for multiple PCs
for pc in PC-OFFICE-1 PC-OFFICE-2 PC-SERVER-1; do
  curl -X POST -H "Content-Type: application/json" \
  -d "{\"pcName\":\"$pc\",\"pcLocation\":\"Office\",\"pcOwner\":\"Admin\",\"pcType\":\"Workstation\",\"pcDescription\":\"Office workstation\"}" \
  https://dynamic-website-hzu1.onrender.com/api/create-agent-package
done
```

### Batch Agent Deployment
```bash
# Deploy to multiple machines
#!/bin/bash
PC_IDS=("PC-1770404695117-qjhkijpdd" "PC-1770404479731-l3dm2zkka")
for pc_id in "${PC_IDS[@]}"; do
  echo "Deploying to $pc_id"
  scp agent-config.json $pc_id:/path/to/agent/
  ssh $pc_id "cd /path/to/agent && node agent.js"
done
```

### Custom Error Monitoring
```javascript
// Add custom error monitoring in your application
const axios = require('axios');

function reportError(error, context = {}) {
  axios.post('https://dynamic-website-hzu1.onrender.com/api/error-report', {
    pcId: process.env.PC_ID,
    appName: 'my-app',
    errorType: error.name || 'unknown',
    message: error.message,
    stackTrace: error.stack,
    severity: error.severity || 'error',
    timestamp: new Date().toISOString(),
    systemInfo: {
      platform: process.platform,
      nodeVersion: process.version,
      ...context
    }
  });
}

// Usage example
try {
  // Your application code
} catch (error) {
  reportError(error, { module: 'main', function: 'processData' });
}
```

---

## 📞 Support & Monitoring

### System Status
- **Dashboard**: https://dynamic-website-hzu1.onrender.com
- **API Health**: https://dynamic-website-hzu1.onrender.com/api/system/status
- **Agent Status**: https://dynamic-website-hzu1.onrender.com/api/agents-status

### Monitoring Commands
```bash
# Check system health
curl https://dynamic-website-hzu1.onrender.com/api/system/status

# Check registered agents
curl https://dynamic-website-hzu1.onrender.com/api/agents-status

# Check error reports
curl https://dynamic-website-hzu1.onrender.com/api/error-reports
```

### Log Analysis
```bash
# View agent logs
tail -f agent.log

# Filter for errors
grep "error" agent.log

# Monitor registration events
grep "Agent registered" agent.log
```

---

## 🚀 Production Deployment

### Environment Setup
```bash
# Production environment variables
export NODE_ENV=production
export PC_MONITOR_SERVER="https://dynamic-website-hzu1.onrender.com"
```

### Security Considerations
- Tokens are 64-character hex strings
- All communication uses HTTPS/WSS encryption
- No personal data collected beyond system information
- Credentials stored locally only

### Performance Tuning
```javascript
// In agent-config.json
{
  "serverUrl": "https://dynamic-website-hzu1.onrender.com",
  "wsUrl": "wss://dynamic-website-hzu1.onrender.com",
  "pcId": "YOUR-PC-ID",
  "token": "YOUR-TOKEN",
  "monitoring": {
    "interval": 30000,        // 30 seconds
    "retryAttempts": 3,
    "timeout": 10000
  }
}
```

---

**Version**: 2.0.5 - Production Ready  
**Last Updated**: 2026-02-06  
**Status**: ✅ Fully Operational and Deployed

**For support, check the dashboard at https://dynamic-website-hzu1.onrender.com/dashboard**
