# PC Monitor Agent - Production Setup Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Create Agent Package
```bash
curl -X POST -H "Content-Type: application/json" \
-d '{"pcName":"YOUR-PC-NAME","pcLocation":"Office","pcOwner":"YOUR-NAME","pcType":"Workstation","pcDescription":"Main development PC"}' \
https://dynamic-website-hzu1.onrender.com/api/create-agent-package
```

### Step 2: Download Configuration
Replace `{packageId}` with the ID from Step 1:
```bash
curl https://dynamic-website-hzu1.onrender.com/api/agent-package/{packageId} > agent-config.json
```

### Step 3: Start Agent
```bash
# Navigate to agent directory
cd /path/to/pc-monitor-agent

# Start monitoring
node agent.js
```

## ✅ Verification

### Check Agent Registration
```bash
# Should show your PC in the list
curl https://dynamic-website-hzu1.onrender.com/api/agents-status
```

### Test Error Reporting
```bash
# Test error pipeline
curl -X POST -H "Content-Type: application/json" \
-d '{"pcId":"YOUR-PC-ID","appName":"test-app","errorType":"test-error","message":"Test error verification","stackTrace":"Test stack","severity":"low","timestamp":"2026-02-06T18:00:00.000Z"}' \
https://dynamic-website-hzu1.onrender.com/api/error-report
```

### View Dashboard
Visit: https://dynamic-website-hzu1.onrender.com/dashboard

## 🔧 Advanced Configuration

### Manual Config File
Create `agent-config.json`:
```json
{
  "serverUrl": "https://dynamic-website-hzu1.onrender.com",
  "wsUrl": "wss://dynamic-website-hzu1.onrender.com",
  "pcId": "YOUR-PC-ID",
  "token": "YOUR-64-CHAR-TOKEN"
}
```

### Windows Service Installation
```bash
npm run install-service
```

### Linux/macOS Service
```bash
sudo npm start
```

## 📊 System Features

### ✅ What's Working
- **Real-time Agent Registration**: Automatic PC detection
- **Error Reporting**: Live error capture and AI analysis
- **Dashboard**: Real-time PC status and error monitoring
- **AI Chat**: Stable error analysis with retry logic
- **Authentication**: Secure token-based validation

### 🔍 Monitoring Capabilities
- Windows Event Log monitoring
- Process crash detection
- System resource tracking
- Network status monitoring
- Application error capture

## 🚨 Troubleshooting

### Agent Won't Register
1. Verify PC ID format: `PC-{timestamp}-{hash}`
2. Check token is 64-character hex string
3. Ensure network connectivity to server
4. Check agent logs: `agent.log`

### No Errors Showing
1. Verify agent is registered: `/api/agents-status`
2. Check error endpoint: `/api/error-reports`
3. Test with manual error report
4. Review dashboard for PC status

### AI Chat Issues
1. Check API key configuration
2. Verify OpenRouter service status
3. Retry logic handles temporary failures
4. Response time tracking included

## 📞 Support

### System Status
- **Dashboard**: https://dynamic-website-hzu1.onrender.com
- **API Health**: https://dynamic-website-hzu1.onrender.com/api/system/status
- **Documentation**: This README file

### Error Reporting
All errors are automatically:
1. **Captured** in real-time from agents
2. **Validated** against registered PCs
3. **Analyzed** by AI specialists
4. **Stored** for historical tracking
5. **Displayed** in dashboard

---

**Version**: 2.0.5 - Production Ready  
**Last Updated**: 2026-02-06  
**Status**: ✅ Fully Operational
