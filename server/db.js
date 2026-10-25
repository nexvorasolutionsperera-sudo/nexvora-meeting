const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('./models/User');
const Meeting = require('./models/Meeting');
const MeetingHistory = require('./models/MeetingHistory');
const Report = require('./models/Report');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let isMongoConnected = false;

const defaultData = {
  users: [
    {
      id: 'usr_admin',
      name: 'Nexvora Admin',
      email: 'admin@nexvora.com',
      passwordHash: bcrypt.hashSync('admin123', 10),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'admin',
      isBlocked: false,
      pmi: '888-777-666',
      createdAt: new Date().toISOString(),
      settings: {
        muteAudioOnJoin: true,
        turnOffVideoOnJoin: false,
        mirrorVideo: true,
        theme: 'dark',
        hdVideo: true
      }
    },
    {
      id: 'usr_teacher',
      name: 'Dr. Kasun Perera',
      email: 'teacher@nexvora.com',
      passwordHash: bcrypt.hashSync('demo123', 10),
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      role: 'user',
      isBlocked: false,
      pmi: '702-541-998',
      createdAt: new Date().toISOString(),
      settings: {
        muteAudioOnJoin: false,
        turnOffVideoOnJoin: false,
        mirrorVideo: true,
        theme: 'dark',
        hdVideo: true
      }
    }
  ],
  meetings: [
    {
      id: 'nex-class-101',
      title: 'Advanced Web Engineering Lecture',
      hostId: 'usr_teacher',
      hostName: 'Dr. Kasun Perera',
      scheduledDate: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
      durationMinutes: 90,
      passcode: '123456',
      waitingRoomEnabled: true,
      allowScreenShare: true,
      allowChat: true,
      isLocked: false,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    },
    {
      id: 'nex-demo-today',
      title: 'Nexvora Platform Kickoff Meeting',
      hostId: 'usr_admin',
      hostName: 'Nexvora Admin',
      scheduledDate: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
      durationMinutes: 45,
      passcode: '',
      waitingRoomEnabled: false,
      allowScreenShare: true,
      allowChat: true,
      isLocked: false,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    }
  ],
  meetingHistory: [
    {
      id: 'hist_1',
      meetingId: 'nex-intro-web',
      title: 'Nexvora Architecture Review',
      hostId: 'usr_admin',
      hostName: 'Nexvora Admin',
      date: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
      durationMinutes: 52,
      participantCount: 8
    },
    {
      id: 'hist_2',
      meetingId: 'nex-ui-sprint',
      title: 'Design System & Online Class UI Sprint',
      hostId: 'usr_teacher',
      hostName: 'Dr. Kasun Perera',
      date: new Date(Date.now() - 3600 * 1000 * 24 * 5).toISOString(),
      durationMinutes: 75,
      participantCount: 14
    }
  ],
  reports: [
    {
      id: 'rep_1',
      reportedBy: 'usr_teacher',
      reportedByName: 'Dr. Kasun Perera',
      targetType: 'user',
      targetId: 'anonymous_spammer',
      targetName: 'Suspicious Guest',
      reason: 'Inappropriate screen sharing during lecture',
      status: 'investigating',
      timestamp: new Date(Date.now() - 3600 * 1000 * 12).toISOString()
    }
  ]
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDb(defaultData);
      return defaultData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json, returning default data', err);
    return defaultData;
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Connect to MongoDB
async function initDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexvorameeting';
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000 // Fast failover if mongo server is not running
    });
    isMongoConnected = true;
    console.log('🍃 MongoDB connected successfully at:', mongoUri.replace(/\/\/.*@/, '//<credentials>@'));

    // Seed default data into MongoDB if empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Seeding initial users into MongoDB...');
      for (const u of defaultData.users) {
        await User.create(u);
      }
      for (const m of defaultData.meetings) {
        await Meeting.create(m);
      }
      for (const h of defaultData.meetingHistory) {
        await MeetingHistory.create(h);
      }
      for (const r of defaultData.reports) {
        await Report.create(r);
      }
      console.log('✅ MongoDB seeded successfully.');
    }
  } catch (err) {
    console.log('ℹ️  MongoDB connection not established (or not running). Using resilient persistent local JSON database (server/data/db.json).');
    isMongoConnected = false;
  }
}

module.exports = {
  readDb,
  writeDb,
  initDatabase,
  get isMongoConnected() {
    return isMongoConnected;
  },
  models: {
    User,
    Meeting,
    MeetingHistory,
    Report
  }
};
