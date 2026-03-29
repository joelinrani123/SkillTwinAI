const router     = require('express').Router();
const User       = require('../models/User');
const TestResult = require('../models/TestResult');
const SkillData  = require('../models/SkillData');
const auth       = require('../middleware/auth');
const mlService  = require('../ml/mlService');


router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const inactivity = mlService.applyInactivityPenalty(user);
  
    if (inactivity.penalised) {
      user.lastActive = new Date();
      await user.save();
    }
    res.json({ user: user.toPublicProfile(), inactivity });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const allowed = ['name', 'title', 'company', 'bio', 'location', 'github', 'linkedin', 'avatar', 'education'];
    const updateFields = { lastActive: new Date() };
    for (const field of allowed) {
      if (req.body[field] !== undefined) updateFields[field] = req.body[field];
    }
    if (Array.isArray(req.body.projects)) {
      updateFields.projects = req.body.projects.map(p => {
        const resolvedLink = p.link || p.url || '';
        return {
          ...(p.id && p.id.length === 24 ? { _id: p.id } : {}),
          name:        (p.name || '').trim(),
          description: p.description || '',
          tech:        Array.isArray(p.tech) ? p.tech : [],
          url:         resolvedLink,
          link:        resolvedLink,
        };
      });
    }
    // Use findByIdAndUpdate to bypass the pre-save score recalculation hook
    // Profile updates (bio, title, etc.) should NOT affect the overall score
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: false }
    );
    res.json({ user: updated.toPublicProfile() });
  } catch (err) {
    console.error('[PUT /users/profile]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.get('/tests', auth, async (req, res) => {
  try {
    const raw = await TestResult.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

  
    const results = raw.map(r => ({
      ...r,
      questionDetails: r.questions || [],
    }));

    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/tests/:id', auth, async (req, res) => {
  try {
    const result = await TestResult.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!result) return res.status(404).json({ message: 'Test not found' });
    res.json({ result: { ...result, questionDetails: result.questions || [] } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post('/test-results', auth, async (req, res) => {
  try {
    const { skill, score, correct, total, timeTaken, questions } = req.body;
    if (!skill)                               return res.status(400).json({ message: 'skill is required' });
    if (score === undefined || score === null) return res.status(400).json({ message: 'score is required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await TestResult.create({
      userId:    user._id,
      skill,
      score:     Math.round(score),
      correct:   correct   || 0,
      total:     total     || 10,
      timeTaken: timeTaken || 0,
      questions: (questions || []).map(q => ({
        question:      q.question,
        options:       q.options || [],
        correctIndex:  q.correctIndex,
        correctAnswer: q.correctAnswer,
        chosenIndex:   q.chosenIndex !== undefined ? q.chosenIndex : null,
        chosenAnswer:  q.chosenAnswer || null,
        isCorrect:     q.isCorrect || false,
      })),
    });

    await SkillData.findOneAndUpdate(
      { userId: user._id, skillName: skill },
      {
        $push: { practiceLog: { date: new Date(), score: Math.round(score), type: 'test' } },
        $set:  { lastPracticed: new Date(), currentLevel: Math.round(score) },
        $inc:  { practiceCount: 1 },
        $setOnInsert: { category: (user.skills.find(s => s.name === skill)?.category) || 'Other' },
      },
      { upsert: true, new: true }
    );

    user.testResults.push({
      skill, score: Math.round(score), correct: correct || 0, total: total || 10, date: new Date(),
    });
    if (user.testResults.length > 200) user.testResults = user.testResults.slice(-200);

    const existingSkill = user.skills.find(s => s.name.toLowerCase() === skill.toLowerCase());
    if (existingSkill) {
      existingSkill.level = Math.round(existingSkill.level * 0.6 + score * 0.4);
    }

    if (score < 40) {
      if (!user.gaps.includes(skill)) user.gaps.push(skill);
    } else {
      user.gaps = user.gaps.filter(g => g.toLowerCase() !== skill.toLowerCase());
    }

    user.lastActive = new Date();
    await user.save();

    res.json({
      message:      'Test result saved',
      overallScore: user.overallScore,
      skillUpdated: !!existingSkill,
      gaps:         user.gaps,
    });
  } catch (err) {
    console.error('[POST /test-results]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.get('/skill-history', auth, async (req, res) => {
  try {
    const data = await SkillData.find({ userId: req.user._id }).lean();
    res.json({ skillHistory: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/inactivity', auth, async (req, res) => {
  try {
    const user       = await User.findById(req.user._id).select('testResults lastActive').lean();
    const inactivity = mlService.applyInactivityPenalty(user);
    res.json(inactivity);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;