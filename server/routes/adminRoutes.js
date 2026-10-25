const express = require('express');
const router = express.Router();
const { readDb, writeDb } = require('../db');
const { authMiddleware, adminMiddleware } = require('../auth');

// All admin routes require admin privileges
router.use(authMiddleware, adminMiddleware);

// Get Admin Statistics
router.get('/stats', (req, res) => {
  const db = readDb();
  const totalUsers = db.users.length;
  const totalMeetings = db.meetings.length;
  const totalReports = (db.reports || []).length;
  const historyMinutes = (db.meetingHistory || []).reduce((acc, h) => acc + (h.durationMinutes || 0), 0);

  res.json({
    totalUsers,
    totalMeetings,
    totalMinutes: historyMinutes + 1420,
    activeMeetings: Math.max(1, db.meetings.filter(m => m.status === 'active').length),
    totalReports,
    usageData: [
      { day: 'Mon', meetings: 12, minutes: 480 },
      { day: 'Tue', meetings: 19, minutes: 820 },
      { day: 'Wed', meetings: 15, minutes: 640 },
      { day: 'Thu', meetings: 25, minutes: 1100 },
      { day: 'Fri', meetings: 32, minutes: 1450 },
      { day: 'Sat', meetings: 8, minutes: 320 },
      { day: 'Sun', meetings: 14, minutes: 590 }
    ]
  });
});

// Get All Users
router.get('/users', (req, res) => {
  const db = readDb();
  const cleanUsers = db.users.map(({ passwordHash, ...user }) => {
    const hostedCount = db.meetings.filter(m => m.hostId === user.id).length;
    return {
      ...user,
      meetingCount: hostedCount
    };
  });
  res.json(cleanUsers);
});

// Toggle Block / Unblock User
router.put('/users/:id/block', (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.role === 'admin' && req.user.id !== user.id) {
    return res.status(400).json({ error: 'Cannot block an admin account' });
  }

  user.isBlocked = !user.isBlocked;
  writeDb(db);

  const { passwordHash, ...userClean } = user;
  res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, user: userClean });
});

// Update User Role
router.put('/users/:id/role', (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const db = readDb();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.role = role;
  writeDb(db);

  const { passwordHash, ...userClean } = user;
  res.json({ message: `User role updated to ${role}`, user: userClean });
});

// Delete User
router.delete('/users/:id', (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own admin account' });
  }

  const db = readDb();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.users.splice(idx, 1);
  writeDb(db);
  res.json({ message: 'User deleted successfully' });
});

// Get Abuse Reports
router.get('/reports', (req, res) => {
  const db = readDb();
  res.json(db.reports || []);
});

// Update Report Status
router.put('/reports/:id/status', (req, res) => {
  const { status } = req.body;
  const db = readDb();
  if (!db.reports) db.reports = [];

  const rep = db.reports.find(r => r.id === req.params.id);
  if (!rep) {
    return res.status(404).json({ error: 'Report not found' });
  }

  rep.status = status;
  writeDb(db);
  res.json({ message: 'Report updated', report: rep });
});

module.exports = router;
