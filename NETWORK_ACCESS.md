# Network Access Setup Guide

Your application is now configured to be accessible from other devices on your local network.

## How to Access from Other Devices

### Step 1: Find Your Local IP Address

**Option 1: Using the provided script**
```bash
get-local-ip.bat
```

**Option 2: Manual method**
1. Open Command Prompt or PowerShell
2. Type: `ipconfig`
3. Look for "IPv4 Address" under your active network adapter (usually Wi-Fi or Ethernet)
4. It will look something like: `192.168.1.xxx` or `10.0.0.xxx`

### Step 2: Start Your Application

Run the development server as usual:
```bash
npm run dev:full
```

or use the start script:
```bash
start.bat
```

### Step 3: Access from Other Devices

On any device connected to the same Wi-Fi network:

1. **Frontend (React App)**: Open a browser and go to:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```
   Example: `http://192.168.1.105:3000`

2. **Backend API**: The backend will be available at:
   ```
   http://YOUR_IP_ADDRESS:5000
   ```

## Important Notes

- **Same Network Required**: All devices must be on the same Wi-Fi/network
- **Firewall**: Windows Firewall may prompt you to allow Node.js through the firewall. Click "Allow access" when prompted.
- **Mobile Devices**: Works great on phones and tablets connected to the same Wi-Fi
- **Security**: This makes your development server accessible on your local network only (not publicly on the internet)

## Troubleshooting

### Can't access from other devices?

1. **Check Firewall**: Make sure Windows Firewall allows Node.js
   - Go to Windows Defender Firewall
   - Check if Node.js is in the allowed apps list

2. **Verify IP Address**: Make sure you're using the correct IP address
   - Use `ipconfig` to get the most current IP

3. **Check Network**: Ensure all devices are on the same network

4. **Verify Server is Running**: Check that both frontend (port 3000) and backend (port 5000) are running

## For Production Deployment

If you want to make this publicly accessible on the internet (not just local network), you'll need to:
- Deploy to a hosting service (Vercel, Netlify, AWS, etc.)
- Configure domain and SSL certificates
- Set up proper security measures

This configuration is for local network access only, which is perfect for testing on multiple devices during development.

