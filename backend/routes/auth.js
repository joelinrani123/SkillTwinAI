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

function validatePassword(pw) {
  if (!pw || pw.length < 8)         return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pw))            return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(pw))            return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(pw))            return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(pw))     return 'Password must contain at least one special character (e.g. @, #, !).';
  return null;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name?.trim())         return res.status(400).json({ message: 'Full name is required.' });
    if (!email)                return res.status(400).json({ message: 'Email is required.' });
    if (!validateEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });

    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ message: pwErr });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });

    const roleMap      = { candidate: 'user', user: 'user', recruiter: 'recruiter' };
    const allowedRoles = ['user', 'recruiter', 'candidate'];
    const resolvedRole = allowedRoles.includes(role) ? (roleMap[role] || role) : 'user';

    const user = await User.create({
      name:     name.trim(),
      email:    email.toLowerCase(),
      password,
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

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password.' });

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

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
