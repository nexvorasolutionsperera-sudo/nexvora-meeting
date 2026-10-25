const mongoose = require('mongoose');

const MeetingHistorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  meetingId: { type: String, required: true },
  title: { type: String, required: true },
  hostId: { type: String, required: true },
  hostName: { type: String, required: true },
  date: { type: Date, default: Date.now },
  durationMinutes: { type: Number, default: 0 },
  participantCount: { type: Number, default: 1 }
});

module.exports = mongoose.models.MeetingHistory || mongoose.model('MeetingHistory', MeetingHistorySchema);
