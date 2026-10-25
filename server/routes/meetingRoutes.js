const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { readDb, writeDb } = require('../db');
const { authMiddleware, optionalAuthMiddleware } = require('../auth');

function generateMeetingId() {
  const p1 = Math.floor(100 + Math.random() * 900);
  const p2 = Math.floor(100 + Math.random() * 900);
  const p3 = Math.floor(100 + Math.random() * 900);
  return `nex-${p1}-${p2}`;
}

// Create Meeting (Instant or Scheduled)
router.post('/', authMiddleware, (req, res) => {
  try {
    const {
      title,
      scheduledDate,
      durationMinutes,
      passcode,
      waitingRoomEnabled,
      allowScreenShare = true,
      allowChat = true,
      isInstant = false
    } = req.body;

    const db = readDb();
    const meetingId = generateMeetingId();

    const newMeeting = {
      id: meetingId,
      title: title?.trim() || `${req.user.name}'s Nexvora Meeting`,
      hostId: req.user.id,
      hostName: req.user.name,
      scheduledDate: isInstant ? new Date().toISOString() : (scheduledDate || new Date().toISOString()),
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 45,
      passcode: passcode?.trim() || '',
      waitingRoomEnabled: !!waitingRoomEnabled,
      allowScreenShare: allowScreenShare !== false,
      allowChat: allowChat !== false,
      isLocked: false,
      status: isInstant ? 'active' : 'scheduled',
      createdAt: new Date().toISOString()
    };

    db.meetings.unshift(newMeeting);
    writeDb(db);

    res.status(201).json(newMeeting);
  } catch (err) {
    console.error('Create meeting error:', err);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Get Upcoming Meetings for logged in user
router.get('/upcoming', authMiddleware, (req, res) => {
  const db = readDb();
  const userMeetings = db.meetings.filter(m => m.hostId === req.user.id);
  res.json(userMeetings);
});

// Get Meeting History for logged in user
router.get('/history', authMiddleware, (req, res) => {
  const db = readDb();
  const userHistory = (db.meetingHistory || []).filter(h => h.hostId === req.user.id);
  res.json(userHistory);
});

// Check/Get Meeting by ID
router.get('/:id', optionalAuthMiddleware, (req, res) => {
  const db = readDb();
  const meetingId = req.params.id;

  // Check if it's a PMI lookup
  let meeting = db.meetings.find(m => m.id === meetingId);
  if (!meeting) {
    // Check if it corresponds to a user's PMI
    const pmiUser = db.users.find(u => u.pmi === meetingId || `pmi-${u.id}` === meetingId);
    if (pmiUser) {
      meeting = {
        id: meetingId,
        title: `${pmiUser.name}'s Personal Meeting Room`,
        hostId: pmiUser.id,
        hostName: pmiUser.name,
        scheduledDate: new Date().toISOString(),
        durationMinutes: 60,
        passcode: '',
        waitingRoomEnabled: false,
        allowScreenShare: true,
        allowChat: true,
        isLocked: false,
        status: 'active',
        isPmi: true
      };
    }
  }

  // If meeting doesn't exist in scheduled DB, create an on-the-fly room definition so any valid ID can be joined
  if (!meeting) {
    const isHost = req.user ? true : false;
    meeting = {
      id: meetingId,
      title: `Meeting ${meetingId}`,
      hostId: req.user ? req.user.id : 'guest_host',
      hostName: req.user ? req.user.name : 'Host',
      scheduledDate: new Date().toISOString(),
      durationMinutes: 45,
      passcode: '',
      waitingRoomEnabled: false,
      allowScreenShare: true,
      allowChat: true,
      isLocked: false,
      status: 'active',
      isDynamic: true
    };
  }

  // Hide passcode from public response
  const sanitized = {
    ...meeting,
    hasPasscode: !!meeting.passcode,
    passcode: undefined
  };

  res.json(sanitized);
});

// Verify Passcode
router.post('/:id/verify-passcode', (req, res) => {
  const { passcode } = req.body;
  const db = readDb();
  const meeting = db.meetings.find(m => m.id === req.params.id);

  if (!meeting || !meeting.passcode) {
    return res.json({ success: true });
  }

  if (meeting.passcode === passcode?.trim()) {
    return res.json({ success: true });
  } else {
    return res.status(400).json({ success: false, error: 'Incorrect meeting password' });
  }
});

// Update Meeting Settings
router.put('/:id', authMiddleware, (req, res) => {
  const db = readDb();
  const idx = db.meetings.findIndex(m => m.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Meeting not found' });
  }

  if (db.meetings[idx].hostId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the host or admin can modify this meeting' });
  }

  const { title, scheduledDate, durationMinutes, passcode, waitingRoomEnabled, allowScreenShare, allowChat, isLocked } = req.body;

  if (title !== undefined) db.meetings[idx].title = title;
  if (scheduledDate !== undefined) db.meetings[idx].scheduledDate = scheduledDate;
  if (durationMinutes !== undefined) db.meetings[idx].durationMinutes = parseInt(durationMinutes, 10);
  if (passcode !== undefined) db.meetings[idx].passcode = passcode;
  if (waitingRoomEnabled !== undefined) db.meetings[idx].waitingRoomEnabled = !!waitingRoomEnabled;
  if (allowScreenShare !== undefined) db.meetings[idx].allowScreenShare = !!allowScreenShare;
  if (allowChat !== undefined) db.meetings[idx].allowChat = !!allowChat;
  if (isLocked !== undefined) db.meetings[idx].isLocked = !!isLocked;

  writeDb(db);
  res.json(db.meetings[idx]);
});

// Delete Meeting
router.delete('/:id', authMiddleware, (req, res) => {
  const db = readDb();
  const idx = db.meetings.findIndex(m => m.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Meeting not found' });
  }

  if (db.meetings[idx].hostId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the host or admin can delete this meeting' });
  }

  db.meetings.splice(idx, 1);
  writeDb(db);
  res.json({ message: 'Meeting deleted successfully' });
});

// Report Abuse / Block user
router.post('/report', optionalAuthMiddleware, (req, res) => {
  try {
    const { targetType, targetId, targetName, reason, meetingId } = req.body;
    const db = readDb();
    if (!db.reports) db.reports = [];

    const newReport = {
      id: 'rep_' + uuidv4().slice(0, 8),
      reportedBy: req.user ? req.user.id : 'guest',
      reportedByName: req.user ? req.user.name : 'Anonymous Guest',
      meetingId: meetingId || '',
      targetType: targetType || 'user',
      targetId: targetId || '',
      targetName: targetName || 'Unknown',
      reason: reason || 'Inappropriate behavior',
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    db.reports.unshift(newReport);
    writeDb(db);
    res.status(201).json({ message: 'Report submitted for admin review', report: newReport });
  } catch (err) {
    console.error('Report abuse error:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router;
