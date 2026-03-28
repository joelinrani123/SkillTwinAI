const router   = require('express').Router();
const auth     = require('../middleware/auth');
const User     = require('../models/User');
const Activity = require('../models/Activity');
const {
  chat,
  coach,
  generateRecommendations,
  analyzeProfile,
} = require('../services/groqService');


router.post('/chat', auth, async (req, res) => {
  try {
    const { messages, context } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'messages array required' });
    }

    const freshUser = await User.findById(req.user._id)
      .select('name skills gaps overallScore certifications mlPrediction')
      .lean();

    const response = await chat(messages, { ...context, user: freshUser });

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { aiChatCount: 1 },
      lastActive: new Date(),
    });

    res.json({ message: response, reply: response });
  } catch (err) {
    console.error('[ai/chat]', err.message);
    res.status(500).json({ message: err.message });
  }
});

router.post('/coach', auth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ message: 'question required' });

    const user = await User.findById(req.user._id)
      .select('name skills gaps overallScore testResults certifications mlPrediction')
      .lean();

    const response = await coach(question, user);

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { aiChatCount: 1 },
      lastActive: new Date(),
    });

    await Activity.create({
      userId: req.user._id,
      user:   req.user.name,
      action: `${req.user.name} used the AI Career Coach`,
      type:   'ai_coach',
    });

    res.json({ message: response, reply: response });
  } catch (err) {
    console.error('[ai/coach]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.get('/recommend/:userId', auth, async (req, res) => {
  try {
    if (
      req.user._id.toString() !== req.params.userId &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const user = await User.findById(req.params.userId)
      .select('name skills gaps testResults overallScore certifications mlPrediction')
      .lean();

    if (!user) return res.status(404).json({ message: 'User not found' });

    const recommendations = await generateRecommendations(user);

    await Activity.create({
      userId: user._id,
      user:   user.name,
      action: `${user.name} viewed learning recommendations`,
      type:   'ai_recommend',
    });

    res.json(recommendations);
  } catch (err) {
    console.error('[ai/recommend]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.get('/analyze/:userId', auth, async (req, res) => {
  try {
    if (
      req.user._id.toString() !== req.params.userId &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const user = await User.findById(req.params.userId)
      .select('name skills gaps testResults overallScore certifications mlPrediction')
      .lean();

    if (!user) return res.status(404).json({ message: 'User not found' });

    const analysis = await analyzeProfile(user);
    res.json(analysis);
  } catch (err) {
    console.error('[ai/analyze]', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
