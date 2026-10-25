const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String },
  avatar: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isBlocked: { type: Boolean, default: false },
  pmi: { type: String, required: true },
  googleId: { type: String },
  settings: {
    muteAudioOnJoin: { type: Boolean, default: false },
    turnOffVideoOnJoin: { type: Boolean, default: false },
    mirrorVideo: { type: Boolean, default: true },
    theme: { type: String, default: 'dark' },
    hdVideo: { type: Boolean, default: true },
    resolution: { type: String, default: '720p' }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
