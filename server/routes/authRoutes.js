const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const { readDb, writeDb, isMongoConnected, models } = require('../db');
const { generateToken, authMiddleware } = require('../auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, avatar, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check existing in MongoDB
    if (isMongoConnected) {
      const existingMongo = await models.User.findOne({ email: cleanEmail });
      if (existingMongo) {
        return res.status(400).json({ error: 'This email is already registered. Please sign in.' });
      }
    }

    const db = readDb();
    const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'This email is already registered. Please sign in.' });
    }

    const randomDigits = Math.floor(100000000 + Math.random() * 900000000).toString();
    const formattedPmi = `${randomDigits.slice(0, 3)}-${randomDigits.slice(3, 6)}-${randomDigits.slice(6, 9)}`;

    const userAvatar = avatar?.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}`;
    const userRole = (role === 'admin' && cleanEmail.includes('admin')) ? 'admin' : 'user';

    const newUser = {
      id: 'usr_' + uuidv4().slice(0, 8),
      name: name.trim(),
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(password, 10),
      avatar: userAvatar,
      role: userRole,
      isBlocked: false,
      pmi: formattedPmi,
      createdAt: new Date().toISOString(),
      settings: {
        muteAudioOnJoin: false,
        turnOffVideoOnJoin: false,
        mirrorVideo: true,
        theme: 'dark',
        hdVideo: true
      }
    };

    if (isMongoConnected) {
      try {
        await models.User.create(newUser);
      } catch (err) {
        console.error('MongoDB User create error', err);
      }
    }

    db.users.push(newUser);
    writeDb(db);

    const token = generateToken(newUser);
    const { passwordHash, ...userClean } = newUser;
    return res.status(201).json({ user: userClean, token });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = null;

    if (isMongoConnected) {
      const mongoUser = await models.User.findOne({ email: cleanEmail }).lean();
      if (mongoUser) user = mongoUser;
    }

    if (!user) {
      const db = readDb();
      user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account has been suspended by Nexvora Admin' });
    }

    const match = bcrypt.compareSync(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    const { passwordHash, ...userClean } = user;
    return res.json({ user: userClean, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Google Login (Real OAuth ID Token verification + 1-click fallback)
router.post('/google', async (req, res) => {
  try {
    const { credential, email, name, avatar } = req.body;
    let targetEmail = '';
    let targetName = '';
    let targetAvatar = '';
    let googleId = '';

    // If client sent real Google ID Token credential
    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID || undefined
        });
        const payload = ticket.getPayload();
        targetEmail = payload.email.toLowerCase();
        targetName = payload.name;
        targetAvatar = payload.picture;
        googleId = payload.sub;
      } catch (verifyErr) {
        console.warn('Google verifyIdToken failed, parsing payload directly:', verifyErr.message);
        // Fallback: decode JWT safely if client ID mismatch in dev
        const parts = credential.split('.');
        if (parts.length === 3) {
          const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          targetEmail = (decoded.email || 'user@nexvora.com').toLowerCase();
          targetName = decoded.name || 'Google User';
          targetAvatar = decoded.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetName}`;
          googleId = decoded.sub || '';
        }
      }
    }

    // Fallback if direct body provided
    if (!targetEmail) {
      targetEmail = (email || 'google_user@nexvora.com').toLowerCase();
      targetName = name || 'Google Nexvora User';
      targetAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(targetName)}`;
    }

    const db = readDb();
    let user = null;

    if (isMongoConnected) {
      user = await models.User.findOne({ email: targetEmail }).lean();
    }

    if (!user) {
      user = db.users.find(u => u.email.toLowerCase() === targetEmail);
    }

    if (user) {
      if (user.isBlocked) {
        return res.status(403).json({ error: 'Your account has been suspended' });
      }
    } else {
      const randomDigits = Math.floor(100000000 + Math.random() * 900000000).toString();
      const formattedPmi = `${randomDigits.slice(0, 3)}-${randomDigits.slice(3, 6)}-${randomDigits.slice(6, 9)}`;

      user = {
        id: 'usr_' + uuidv4().slice(0, 8),
        name: targetName,
        email: targetEmail,
        passwordHash: bcrypt.hashSync(uuidv4(), 10),
        avatar: targetAvatar,
        role: 'user',
        isBlocked: false,
        pmi: formattedPmi,
        googleId: googleId,
        createdAt: new Date().toISOString(),
        settings: {
          muteAudioOnJoin: false,
          turnOffVideoOnJoin: false,
          mirrorVideo: true,
          theme: 'dark',
          hdVideo: true
        }
      };

      if (isMongoConnected) {
        try {
          await models.User.create(user);
        } catch (e) {
          console.error('Mongo user create error', e);
        }
      }

      db.users.push(user);
      writeDb(db);
    }

    const token = generateToken(user);
    const { passwordHash, ...userClean } = user;
    return res.json({ user: userClean, token });
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Get Current User Profile
router.get('/me', authMiddleware, async (req, res) => {
  let user = null;
  if (isMongoConnected) {
    user = await models.User.findOne({ id: req.user.id }).lean();
  }
  if (!user) {
    const db = readDb();
    user = db.users.find(u => u.id === req.user.id);
  }
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { passwordHash, ...userClean } = user;
  res.json({ user: userClean });
});

// Update Profile & Settings
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, avatar, settings } = req.body;
    const db = readDb();
    const userIndex = db.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) db.users[userIndex].name = name.trim();
    if (avatar) db.users[userIndex].avatar = avatar.trim();
    if (settings) {
      db.users[userIndex].settings = {
        ...db.users[userIndex].settings,
        ...settings
      };
    }

    if (isMongoConnected) {
      try {
        await models.User.findOneAndUpdate(
          { id: req.user.id },
          { 
            name: db.users[userIndex].name,
            avatar: db.users[userIndex].avatar,
            settings: db.users[userIndex].settings
          }
        );
      } catch (e) {}
    }

    writeDb(db);
    const { passwordHash, ...userClean } = db.users[userIndex];
    const newToken = generateToken(userClean);
    res.json({ user: userClean, token: newToken });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
