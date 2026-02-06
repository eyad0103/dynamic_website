# PC Monitor Agent

Production-grade PC monitoring agent for real-time error detection and reporting.

## Features

- **Real-time Error Detection**: Monitors application crashes, system errors, and unhandled exceptions
- **Background Service**: Runs invisibly as a system service
- **Auto-start**: Automatically starts on system boot
- **Cross-platform**: Windows, Linux, and macOS support
- **Secure Communication**: Encrypted HTTPS and WebSocket connections
- **AI Analysis**: Automatic error analysis with specialized AI
- **Zero Configuration**: One-time setup, runs forever

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Agent
```bash
node setup.js
```
Enter your PC ID and registration token when prompted.

### 3. Install as Service

**Windows:**
```bash
npm run install-service
```

**Linux/macOS:**
```bash
sudo npm start
```

## Manual Configuration

If you prefer manual setup, copy `agent-config.template.json` to `agent-config.json` and edit:

```json
{
  "serverUrl": "https://dynamic-website-hzu1.onrender.com",
  "pcId": "YOUR_PC_ID_HERE",
  "token": "YOUR_TOKEN_HERE"
}
```

## Service Management

**Windows:**
- Install: `npm run install-service`
- Uninstall: `npm run uninstall-service`
- Status: Check Windows Services for "PC Monitor Agent"

**Linux/macOS:**
- Start: `sudo systemctl start pc-monitor-agent`
- Stop: `sudo systemctl stop pc-monitor-agent`
- Enable: `sudo systemctl enable pc-monitor-agent`

## What It Monitors

### Windows
- Application Event Log (errors and warnings)
- Unhandled exceptions
- Process crashes
- System errors

### Linux
- Systemd journal (errors and critical)
- Unhandled exceptions
- Process crashes
- System logs

### macOS
- System logs (errors and critical)
- Unhandled exceptions
- Process crashes

## Error Reporting

All errors are automatically:
1. **Detected** in real-time
2. **Collected** with system context
3. **Analyzed** by specialized AI
4. **Reported** to central backend
5. **Stored** for historical analysis

## Security

- **Encrypted Communication**: All traffic uses HTTPS/WSS
- **Token Authentication**: Secure token-based registration
- **No Data Collection**: Only error and system info sent
- **Local Storage**: Credentials stored locally only

## Logs

Agent logs are saved to `agent.log` in the agent directory:
- Connection status
- Error detection events
- System information
- Debug information

## Troubleshooting

### Agent Won't Start
1. Check `agent.log` for errors
2. Verify `agent-config.json` exists and is valid
3. Ensure network connectivity to server
4. Check service status

### No Errors Reported
1. Verify agent is running: `ps aux | grep agent`
2. Check logs for connection issues
3. Test with manual error trigger
4. Verify server connectivity

### Service Installation Issues
**Windows:**
- Run as Administrator
- Ensure Node.js is in PATH
- Check Windows Event Viewer

**Linux:**
- Use `sudo` for system commands
- Check systemd logs: `journalctl -u pc-monitor-agent`
- Verify file permissions

## Development

### Build Executable
```bash
npm run build
```

### Test Mode
```bash
npm test
```

### Debug Mode
```bash
node agent.js --debug
```

## Support

For issues and support:
1. Check `agent.log` first
2. Verify network connectivity
3. Test with manual configuration
4. Contact system administrator

## Privacy

This agent:
- Only sends error reports and system information
- Does not access personal files or data
- Uses minimal system resources
- Stores all data securely
- Complies with privacy regulations

---

**Version**: 1.0.0  
**Platform**: Node.js 18+  
**License**: MIT
