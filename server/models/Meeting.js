const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  hostId: { type: String, required: true },
  hostName: { type: String, required: true },
  scheduledDate: { type: Date, default: Date.now },
  durationMinutes: { type: Number, default: 45 },
  passcode: { type: String, default: '' },
  waitingRoomEnabled: { type: Boolean, default: false },
  allowScreenShare: { type: Boolean, default: true },
  allowChat: { type: Boolean, default: true },
  isLocked: { type: Boolean, default: false },
  status: { type: String, enum: ['scheduled', 'active', 'ended'], default: 'scheduled' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Meeting || mongoose.model('Meeting', MeetingSchema);
