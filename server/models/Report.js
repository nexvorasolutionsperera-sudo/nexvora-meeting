const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  reportedBy: { type: String, default: 'guest' },
  reportedByName: { type: String, default: 'Anonymous Guest' },
  meetingId: { type: String, default: '' },
  targetType: { type: String, default: 'user' },
  targetId: { type: String, default: '' },
  targetName: { type: String, default: 'Unknown' },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'investigating', 'resolved', 'dismissed'], default: 'pending' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Report || mongoose.model('Report', ReportSchema);
