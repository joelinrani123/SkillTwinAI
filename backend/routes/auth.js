const router   = require('express').Router();
const jwt      = require('jsonwebtoken');
const { Clerk } = require('@clerk/clerk-sdk-node');
const User     = require('../models/User');
const auth     = require('../middleware/auth');
const Activity = require('../models/Activity');

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

// ── Helpers ──────────────────────────────────────────────────────────────────

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * Verify a Clerk session token and return the Clerk userId.
 * Throws if the token is missing or invalid.
 */
async function verifyClerkToken(req) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new Error('No authorization token provided.');

  const payload = await clerk.verifyToken(token);
  if (!payload?.sub) throw new Error('Invalid Clerk token.');
  return payload; // payload.sub = Clerk userId
}

// ── POST /auth/signup ─────────────────────────────────────────────────────────
// After Clerk creates the user on the frontend, the app calls this once to
// register the user in your own MongoDB (with role, name, email etc.).
router.post('/signup', async (req, res) => {
  try {
    const clerkPayload = await verifyClerkToken(req);
    const clerkUserId  = clerkPayload.sub;

    const { name, email, role } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: 'Full name is required.' });
    if (!email)        return res.status(400).json({ message: 'Email is required.' });

    // Idempotent — if a record already exists for this Clerk user just return it
    let user = await User.findOne({ clerkId: clerkUserId });
    if (!user) {
      // Also check by email in case the user signed up via a different method
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      const roleMap      = { candidate: 'user', user: 'user', recruiter: 'recruiter' };
      const allowedRoles = ['user', 'recruiter', 'candidate'];
      const resolvedRole = allowedRoles.includes(role) ? (roleMap[role] || role) : 'user';

      user = await User.create({
        clerkId:  clerkUserId,
        name:     name.trim(),
        email:    email.toLowerCase(),
        password: 'clerk-managed', // password auth is handled by Clerk; store placeholder
        role:     resolvedRole,
      });

      await Activity.create({
        userId: user._id,
        user:   user.name,
        action: `${user.name} created an account`,
        type:   'signup',
      }).catch(() => {});
    } else if (!user.clerkId) {
      // Back-fill clerkId for users who existed before Clerk was added
      user.clerkId = clerkUserId;
      await user.save({ validateBeforeSave: false });
    }

    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toPublicProfile() });
  } catch (err) {
    console.error('[auth/signup]', err.message);
    res.status(err.message.includes('token') ? 401 : 500).json({ message: err.message || 'Signup failed.' });
  }
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
// Called by the frontend after Clerk completes sign-in to get a backend JWT.
router.post('/login', async (req, res) => {
  try {
    const clerkPayload = await verifyClerkToken(req);
    const clerkUserId  = clerkPayload.sub;

    let user = await User.findOne({ clerkId: clerkUserId });
    if (!user) {
      // Try to match by email (for users who existed before Clerk)
      const email = req.body.email?.toLowerCase();
      if (email) user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          message: 'No SkillTwin account found. Please sign up first.',
        });
      }
      // Back-fill
      user.clerkId = clerkUserId;
      await user.save({ validateBeforeSave: false });
    }

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
    res.status(err.message.includes('token') ? 401 : 500).json({ message: err.message || 'Login failed.' });
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

module.exports = router;