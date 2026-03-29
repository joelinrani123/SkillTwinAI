const router   = require('express').Router();
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
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

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always respond success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    // Generate a secure token
    const rawToken   = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetToken   = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    // If email service is configured, send the email
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}?reset_token=${rawToken}`;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host:   process.env.SMTP_HOST,
          port:   parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
          from:    `"SkillTwinAI" <${process.env.SMTP_USER}>`,
          to:      user.email,
          subject: 'Reset your SkillTwinAI password',
          html: `
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
              <h2 style="color:#1F2937;margin-bottom:8px">Reset your password</h2>
              <p style="color:#6B7280;margin-bottom:24px">You requested a password reset for your SkillTwinAI account. Click the button below to set a new password. This link expires in 1 hour.</p>
              <a href="${resetURL}" style="display:inline-block;padding:13px 28px;background:#3B82F6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Reset Password</a>
              <p style="color:#9CA3AF;font-size:12px;margin-top:24px">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
              <p style="color:#9CA3AF;font-size:12px">Or copy this link: ${resetURL}</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.error('[auth/forgot-password] Mail error:', mailErr.message);
      }
    } else {
      // No email service — log the reset URL for dev/testing
      console.log(`[DEV] Password reset URL for ${user.email}: ${resetURL}`);
    }

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error('[auth/forgot-password]', err.message);
    res.status(500).json({ message: 'Failed to process request. Please try again.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ message: pwErr });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset link is invalid or has expired.' });
    }

    user.password             = password;
    user.passwordResetToken   = '';
    user.passwordResetExpires = undefined;
    await user.save();

    const jwtToken = signToken(user._id);
    res.json({ token: jwtToken, user: user.toPublicProfile(), message: 'Password reset successfully.' });
  } catch (err) {
    console.error('[auth/reset-password]', err.message);
    res.status(500).json({ message: 'Failed to reset password. Please try again.' });
  }
});

module.exports = router;