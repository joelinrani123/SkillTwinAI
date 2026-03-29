const router   = require('express').Router();
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const auth     = require('../middleware/auth');
const Activity = require('../models/Activity');

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What was the make of your first car?",
  "What is your oldest sibling's middle name?",
  "What street did you grow up on?",
  "What was your childhood nickname?",
];

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

// GET available security questions
router.get('/security-questions', (_req, res) => {
  res.json({ questions: SECURITY_QUESTIONS });
});

// SIGNUP (now requires security question)
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, securityQuestion, securityAnswer } = req.body;

    if (!name?.trim())         return res.status(400).json({ message: 'Full name is required.' });
    if (!email)                return res.status(400).json({ message: 'Email is required.' });
    if (!validateEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });

    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ message: pwErr });

    if (!securityQuestion || !SECURITY_QUESTIONS.includes(securityQuestion)) {
      return res.status(400).json({ message: 'Please select a valid security question.' });
    }
    if (!securityAnswer?.trim() || securityAnswer.trim().length < 2) {
      return res.status(400).json({ message: 'Security answer must be at least 2 characters.' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });

    const roleMap      = { candidate: 'user', user: 'user', recruiter: 'recruiter' };
    const allowedRoles = ['user', 'recruiter', 'candidate'];
    const resolvedRole = allowedRoles.includes(role) ? (roleMap[role] || role) : 'user';

    const hashedAnswer = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 10);

    const user = await User.create({
      name:             name.trim(),
      email:            email.toLowerCase(),
      password,
      role:             resolvedRole,
      securityQuestion,
      securityAnswer:   hashedAnswer,
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

// LOGIN
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

// ME
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: user.toPublicProfile() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// STEP 1: Verify email — return the security question
router.post('/reset/verify-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }
    if (!user.securityQuestion || !user.securityAnswer) {
      return res.status(400).json({ message: 'This account has no security question set. Please contact support.' });
    }
    res.json({ question: user.securityQuestion });
  } catch (err) {
    console.error('[reset/verify-email]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// STEP 2: Verify answer — return a short-lived reset token
router.post('/reset/verify-answer', async (req, res) => {
  try {
    const { email, answer } = req.body;
    if (!email || !answer) return res.status(400).json({ message: 'Email and answer are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.securityAnswer) return res.status(400).json({ message: 'Invalid request.' });

    const match = await bcrypt.compare(answer.trim().toLowerCase(), user.securityAnswer);
    if (!match) return res.status(400).json({ message: 'Incorrect answer. Please try again.' });

    const resetToken = jwt.sign(
      { id: user._id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );
    res.json({ resetToken });
  } catch (err) {
    console.error('[reset/verify-answer]', err.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// STEP 3: Set new password
router.post('/reset/set-password', async (req, res) => {
  try {
    const { resetToken, password } = req.body;
    if (!resetToken || !password) return res.status(400).json({ message: 'Reset token and new password are required.' });

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: 'Reset session expired. Please start over.' });
    }

    if (payload.purpose !== 'password-reset') return res.status(400).json({ message: 'Invalid reset token.' });

    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ message: pwErr });

    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.password = password;
    await user.save();

    const token = signToken(user._id);
    res.json({ token, user: user.toPublicProfile(), message: 'Password reset successfully.' });
  } catch (err) {
    console.error('[reset/set-password]', err.message);
    res.status(500).json({ message: 'Failed to reset password. Please try again.' });
  }
});

// Legacy stubs (kept so old clients don't crash)
router.post('/forgot-password', (_req, res) => res.json({ message: 'Please use the on-site password reset.' }));
router.post('/reset-password',  (_req, res) => res.status(410).json({ message: 'Deprecated. Use /reset/set-password.' }));

module.exports = router;