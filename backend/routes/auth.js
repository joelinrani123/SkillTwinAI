const router   = require('express').Router();
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const auth     = require('../middleware/auth');
const Activity = require('../models/Activity');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// ── POST /auth/signup ────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: 'Full name is required.' });
    if (!email)        return res.status(400).json({ message: 'Email is required.' });

    // Map frontend role names to DB enum values
    const roleMap      = { candidate: 'user', user: 'user', recruiter: 'recruiter', admin: 'admin' };
    const resolvedRole = roleMap[role] || 'user';

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      // ✅ Always update the role in DB to whatever was passed
      user.role = resolvedRole;
      user.lastActive = new Date();
      await user.save({ validateBeforeSave: false });
      const token = signToken(user._id);
      return res.status(200).json({ token, user: user.toPublicProfile() });
    }

    // New user
    user = await User.create({
      name:     name.trim(),
      email:    email.toLowerCase(),
      password: 'clerk-managed',
      role:     resolvedRole,
    });

    await Activity.create({
      userId: user._id,
      user:   user.name,
      action: `${user.name} created an account`,
      type:   'signup',
    }).catch(() => {});

    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toPublicProfile() });
  } catch (err) {
    console.error('[auth/signup]', err.message);
    res.status(500).json({ message: 'Signup failed. Please try again.' });
  }
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found. Please sign up.' });

    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });

    await Activity.create({
      userId: user._id,
      user:   user.name,
      action: `${user.name} logged in`,
      type:   'login',
    }).catch(() => {});

    const token = signToken(user._id);
    res.json({ token, user: user.toPublicProfile() });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/forgot-password', (_req, res) => res.json({ message: 'Please use Clerk password reset.' }));
router.post('/reset-password',  (_req, res) => res.status(410).json({ message: 'Deprecated.' }));

module.exports = router;