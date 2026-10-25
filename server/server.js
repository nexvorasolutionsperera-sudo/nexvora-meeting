const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');
const localtunnel = require('localtunnel');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { setupMeetingSocket } = require('./socket/meetingHandler');
const { initDatabase } = require('./db');

// Initialize MongoDB & Database
initDatabase();

const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'NexvoraMeeting Zoom Alternative',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Setup Real-time Meeting WebSockets
setupMeetingSocket(io);

// Serve frontend build fallback
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('NexvoraMeeting Backend API is running on port 5000');
    }
  });
});

// Helper to get local network IP
function getLocalNetworkIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 5000;
const localIp = getLocalNetworkIp();

server.listen(PORT, '0.0.0.0', async () => {
  console.log('\n================================================================');
  console.log('🚀 NEXVORA SOLUTIONS — NEXVORAMEETING PLATFORM ONLINE');
  console.log('================================================================');
  console.log(`💻 Local Access:        http://localhost:${PORT}`);
  console.log(`📱 Same Wi-Fi / LAN:    http://${localIp}:${PORT}`);

  // If tunnel requested in .env or arguments
  const autoTunnel = process.env.ENABLE_TUNNEL === 'true' || process.argv.includes('--tunnel') || process.argv.includes('--share');
  if (autoTunnel) {
    try {
      console.log('⏳ Connecting secure global public tunnel...');
      const tunnel = await localtunnel({ port: PORT });
      console.log('----------------------------------------------------------------');
      console.log(`🌍 GLOBAL PUBLIC INTERNET LINK (For Anyone Worldwide):`);
      console.log(`👉 ${tunnel.url}`);
      console.log('----------------------------------------------------------------');
      console.log('✨ Anyone on any Mobile Phone or PC can now join from anywhere!');
      console.log('✨ Full HD Camera, Microphone & Screen Share work over HTTPS!');
      console.log('================================================================\n');

      tunnel.on('close', () => {
        console.log('Public tunnel closed');
      });
    } catch (tErr) {
      console.error('Failed to start public tunnel:', tErr.message);
    }
  } else {
    console.log(`🌍 Worldwide Internet:  Run 'npm run share' to get a 100% public HTTPS link!`);
    console.log('================================================================\n');
  }
});
