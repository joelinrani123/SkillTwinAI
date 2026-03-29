const jwt    = require('jsonwebtoken');
const { Clerk } = require('@clerk/clerk-sdk-node');
const User   = require('../models/User');

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'No token provided.' });

  // ── Try 1: your own backend JWT (issued by /auth/login or /auth/signup) ──
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(payload.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found.' });
    req.user = user;
    return next();
  } catch {
    // Not a backend JWT — fall through and try Clerk
  }

  // ── Try 2: Clerk session token ────────────────────────────────────────────
  try {
    const payload    = await clerk.verifyToken(token);
    const clerkUserId = payload?.sub;
    if (!clerkUserId) throw new Error('Invalid Clerk token');

    let user = await User.findOne({ clerkId: clerkUserId }).select('-password');
    if (!user) {
      // Might exist without clerkId if user pre-dates Clerk integration
      const email = payload.email_addresses?.[0]?.email_address || payload.email;
      if (email) user = await User.findOne({ email: email.toLowerCase() }).select('-password');
    }

    if (!user) return res.status(401).json({ message: 'No SkillTwin account for this Clerk user. Please sign up.' });

    // Back-fill clerkId if missing
    if (!user.clerkId) {
      await User.findByIdAndUpdate(user._id, { clerkId: clerkUserId });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};