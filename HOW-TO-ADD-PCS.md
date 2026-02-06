# How to Add PCs to PC Monitor System

## 🚀 Quick Start - Adding New PCs

### Method 1: Web Dashboard (Recommended)
1. Visit: https://dynamic-website-hzu1.onrender.com/dashboard
2. Click "Create Agent Package" button
3. Fill in PC details:
   - **PC Name**: Descriptive name (e.g., "Office-PC-01")
   - **Location**: Physical location (e.g., "Office", "Home", "Data Center")
   - **Owner**: Responsible person/team
   - **Type**: Workstation, Server, Laptop, etc.
   - **Description**: Purpose or specs
4. Click "Create Package"
5. Download the generated configuration file
6. Install agent on the target PC

---

### Method 2: API (Automated)

#### Step 1: Create Agent Package
```bash
curl -X POST -H "Content-Type: application/json" \
-d '{
  "pcName": "Office-PC-01",
  "pcLocation": "Main Office", 
  "pcOwner": "John Doe",
  "pcType": "Workstation",
  "pcDescription": "Primary development workstation"
}' \
https://dynamic-website-hzu1.onrender.com/api/create-agent-package
```

**Response Example:**
```json
{
  "success": true,
  "packageId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "pcId": "PC-1770405904674-hj1cyd3ex",
  "downloadUrl": "/api/agent-package/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

#### Step 2: Download Configuration
```bash
# Replace {packageId} with your actual package ID
curl https://dynamic-website-hzu1.onrender.com/api/agent-package/{packageId} > agent-config.json
```

#### Step 3: Deploy Agent to Target PC
```bash
# Copy configuration to target PC
scp agent-config.json user@target-pc:/path/to/agent/

# Or download agent files
curl https://dynamic-website-hzu1.onrender.com/agent.js > agent.js

# Install dependencies
npm install

# Start agent
node agent.js
```

---

### Method 3: Batch Deployment (Multiple PCs)

#### Create Multiple Packages Script
```bash
#!/bin/bash
# add-pcs.sh - Add multiple PCs to monitoring system

PCs=(
  "Office-PC-01:Main Office:John Doe:Workstation:Primary development workstation"
  "Office-PC-02:Main Office:Jane Smith:Workstation:Secondary development workstation" 
  "Server-01:Data Center:IT Team:Server:Database server"
  "Laptop-01:Remote:John Doe:Laptop:Remote work laptop"
)

for pc in "${PCs[@]}"; do
  IFS=':' read -r name location owner type description <<< "$pc"
  
  echo "Creating package for: $name"
  
  curl -X POST -H "Content-Type: application/json" \
  -d "{
    \"pcName\": \"$name\",
    \"pcLocation\": \"$location\",
    \"pcOwner\": \"$owner\", 
    \"pcType\": \"$type\",
    \"pcDescription\": \"$description\"
  }" \
  https://dynamic-website-hzu1.onrender.com/api/create-agent-package
  
  echo "Package created for $name"
done
```

#### Deploy to Multiple Machines
```bash
#!/bin/bash
# deploy-agents.sh - Deploy agents to multiple PCs

TARGETS=(
  "192.168.1.100:office-pc-01"
  "192.168.1.101:office-pc-02"
  "10.0.0.50:server-01"
)

PACKAGE_IDS=(
  "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
  "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p7"
  "c3d4e5f6g7h8i9j0k1l2m3n4o5p8"
)

for i in "${!TARGETS[@]}"; do
  target="${TARGETS[$i]}"
  package_id="${PACKAGE_IDS[$i]}"
  
  echo "Deploying to: $target"
  
  # SSH deployment (requires SSH keys setup)
  ssh "$target" "
    cd /path/to/agent
    curl https://dynamic-website-hzu1.onrender.com/agent.js > agent.js
    curl https://dynamic-website-hzu1.onrender.com/api/agent-package/$package_id > agent-config.json
    npm install
    nohup node agent.js > agent.log 2>&1 &
    echo 'Agent deployed and started'
  "
  
  echo "Deployment to $target completed"
done
```

---

## 📋 PC Information Fields

### Required Fields
- **pcName**: Human-readable PC name (max 100 chars)
- **pcLocation**: Physical or logical location (max 100 chars)
- **pcOwner**: Responsible person/team (max 100 chars)
- **pcType**: PC category (Workstation/Server/Laptop/etc.)
- **pcDescription**: Purpose or specifications (max 500 chars)

### Optional Fields
- **pcOS**: Operating system (auto-detected)
- **pcSpecs**: Hardware specifications (auto-detected)
- **pcDepartment**: Department or cost center
- **pcAssetTag**: Asset tracking number

---

## 🔧 Agent Installation on Target PC

### Windows Installation
```powershell
# PowerShell script for Windows deployment
$pcName = "Office-PC-01"
$packageId = "your-package-id-here"

# Create agent directory
New-Item -Path "C:\PC-Monitor-Agent" -ItemType Directory -Force
Set-Location "C:\PC-Monitor-Agent"

# Download agent files
Invoke-WebRequest -Uri "https://dynamic-website-hzu1.onrender.com/agent.js" -OutFile "C:\PC-Monitor-Agent\agent.js"
Invoke-WebRequest -Uri "https://dynamic-website-hzu1.onrender.com/api/agent-package/$packageId" -OutFile "C:\PC-Monitor-Agent\agent-config.json"

# Install dependencies
Set-Location "C:\PC-Monitor-Agent"
npm install

# Install as Windows service
npm run install-service

# Start service
Start-Service "PC Monitor Agent"
```

### Linux Installation
```bash
#!/bin/bash
# Bash script for Linux deployment

PC_NAME="Office-PC-01"
PACKAGE_ID="your-package-id-here"
AGENT_DIR="/opt/pc-monitor-agent"

# Create agent directory
sudo mkdir -p $AGENT_DIR
cd $AGENT_DIR

# Download agent files
sudo curl -o agent.js https://dynamic-website-hzu1.onrender.com/agent.js
sudo curl -o agent-config.json https://dynamic-website-hzu1.onrender.com/api/agent-package/$PACKAGE_ID

# Install dependencies
sudo npm install

# Create systemd service
sudo tee /etc/systemd/system/pc-monitor-agent.service > /dev/null <<EOF
[Unit]
Description=PC Monitor Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$AGENT_DIR
ExecStart=/usr/bin/node agent.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable pc-monitor-agent
sudo systemctl start pc-monitor-agent

echo "Agent deployed and started on $PC_NAME"
```

### macOS Installation
```bash
#!/bin/bash
# Bash script for macOS deployment

PC_NAME="Office-Mac-01"
PACKAGE_ID="your-package-id-here"
AGENT_DIR="/Applications/PC-Monitor-Agent"

# Create agent directory
sudo mkdir -p $AGENT_DIR
cd $AGENT_DIR

# Download agent files
sudo curl -o agent.js https://dynamic-website-hzu1.onrender.com/agent.js
sudo curl -o agent-config.json https://dynamic-website-hzu1.onrender.com/api/agent-package/$PACKAGE_ID

# Install dependencies
sudo npm install

# Create launchd service
sudo tee /Library/LaunchDaemons/com.pcmonitor.agent.plist > /dev/null <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>PC Monitor Agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>$AGENT_DIR/agent.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$AGENT_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Load service
sudo launchctl load /Library/LaunchDaemons/com.pcmonitor.agent.plist
sudo launchctl start com.pcmonitor.agent

echo "Agent deployed and started on $PC_NAME"
```

---

## 📊 Verification

### Check Agent Registration
```bash
# Verify agent appears in dashboard
curl https://dynamic-website-hzu1.onrender.com/api/agents-status

# Should show your new PC in the list
```

### Test Agent Connectivity
```bash
# Test error reporting
curl -X POST -H "Content-Type: application/json" \
-d '{
  "pcId": "YOUR-PC-ID",
  "appName": "test-app",
  "errorType": "test-error", 
  "message": "Test error from new PC",
  "severity": "low"
}' \
https://dynamic-website-hzu1.onrender.com/api/error-report
```

### Monitor Agent Logs
```bash
# Check agent is running
tail -f /path/to/agent/agent.log

# Windows PowerShell
Get-Content "C:\PC-Monitor-Agent\agent.log" -Wait -Tail 10
```

---

## 🎯 Best Practices

### Naming Conventions
- **Consistent**: Use naming pattern (Office-PC-01, Server-01, etc.)
- **Descriptive**: Include location or purpose in name
- **Unique**: Avoid duplicate names

### Security
- **Unique Tokens**: Each PC gets unique authentication token
- **Secure Transfer**: Use HTTPS/WSS for all communications
- **Access Control**: Only authorized PCs can register

### Monitoring
- **Real-time**: Agents report status every 30 seconds
- **Error Capture**: Automatic error detection and reporting
- **Dashboard**: Live status updates in web interface

---

## 🚨 Troubleshooting

### Agent Won't Register
1. **Check Configuration**: Verify `agent-config.json` is correct
2. **Network Connectivity**: Test access to `https://dynamic-website-hzu1.onrender.com`
3. **Token Validity**: Ensure token matches package
4. **Firewall**: Check outbound connections on port 443

### Agent Not Visible in Dashboard
1. **Wait 2 Minutes**: Allow time for agent heartbeat
2. **Refresh Dashboard**: Manual refresh may be needed
3. **Check Agent Status**: Verify agent is running locally
4. **Verify Registration**: Check `/api/agents-status` endpoint

### Service Installation Issues
1. **Permissions**: Run as administrator/root
2. **Node.js Version**: Ensure Node.js 18+ is installed
3. **Dependencies**: Run `npm install` before starting service
4. **Logs**: Check system/service logs for errors

---

## 📞 Support

### System Status
- **Dashboard**: https://dynamic-website-hzu1.onrender.com/dashboard
- **Health Check**: https://dynamic-website-hzu1.onrender.com/api/health
- **Agent Status**: https://dynamic-website-hzu1.onrender.com/api/agents-status

### Documentation
- **Setup Guide**: https://dynamic-website-hzu1.onrender.com/setup-instructions
- **Agent Download**: https://dynamic-website-hzu1.onrender.com/agent.js

---

**This guide covers all methods for adding PCs to the PC Monitor Agent system, from single PC setup to enterprise batch deployment.**
