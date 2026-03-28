const router      = require('express').Router();
const auth        = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const User        = require('../models/User');
const TestResult  = require('../models/TestResult');
const SkillData   = require('../models/SkillData');
const Message     = require('../models/Message');

function normaliseProjects(projects = []) {
  return projects.map(p => ({
    id:          p._id ? p._id.toString() : '',
    name:        p.name,
    description: p.description || '',
    tech:        p.tech || [],
    link:        p.link || p.url || '',
  }));
}

router.get('/', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    const { skill, minScore, maxScore, cert, search, limit } = req.query;

    const filter = { role: 'user' };

    if (search) {
      filter.$or = [
        { name:  { $regex: new RegExp(search, 'i') } },
        { email: { $regex: new RegExp(search, 'i') } },
        { title: { $regex: new RegExp(search, 'i') } },
      ];
    }
    if (skill) filter['skills.name'] = { $regex: new RegExp(skill, 'i') };
    if (minScore || maxScore) {
      filter.overallScore = {};
      if (minScore) filter.overallScore.$gte = Number(minScore);
      if (maxScore) filter.overallScore.$lte = Number(maxScore);
    }
    if (cert) {
      filter['certifications'] = {
        $elemMatch: { name: { $regex: new RegExp(cert, 'i') }, completed: true },
      };
    }

    const maxLimit = Math.min(parseInt(limit) || 50, 100);
    const users = await User.find(filter)
      .select('-password -__v')
      .sort({ overallScore: -1 })
      .limit(maxLimit)
      .lean();

    const candidates = users.map(u => ({
      _id:          u._id,
      name:         u.name,
      email:        u.email,
      title:        u.title,
      bio:          u.bio,
      location:     u.location,
      github:       u.github,
      linkedin:     u.linkedin,
      avatar:       u.avatar || '',
      skills:       u.skills,
      gaps:         u.gaps,
      overallScore: u.overallScore,
      certifications: (u.certifications || []).filter(c => c.completed),
      mlPrediction: u.mlPrediction,
      testCount:    (u.testResults || []).length,
      projects:     normaliseProjects(u.projects),
      education:    u.education || [],
      createdAt:    u.createdAt,
    }));

    res.json({ candidates, total: candidates.length });
  } catch (err) {
    console.error('[candidates/getAll]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.get('/:id', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -__v')
      .lean();

    if (!user || user.role !== 'user') {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const [testHistory, skillHistory] = await Promise.all([
      TestResult.find({ userId: user._id }).sort({ createdAt: -1 }).lean(),
      SkillData.find({ userId: user._id }).lean(),
    ]);

    const totalTests   = testHistory.length;
    const uniqueSkills = new Set(testHistory.map(t => t.skill)).size;
    const avgScore     = totalTests
      ? Math.round(testHistory.reduce((a, t) => a + t.score, 0) / totalTests) : 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTests   = testHistory.filter(t => new Date(t.createdAt) >= thirtyDaysAgo);

    const candidate = {
      _id:            user._id,
      name:           user.name,
      email:          user.email,
      title:          user.title,
      bio:            user.bio,
      location:       user.location,
      github:         user.github,
      linkedin:       user.linkedin,
      avatar:         user.avatar || '',
      skills:         user.skills,
      gaps:           user.gaps,
      overallScore:   user.overallScore,
      certifications: (user.certifications || []).filter(c => c.completed),
      mlPrediction:   user.mlPrediction,
      createdAt:      user.createdAt,
      projects:       normaliseProjects(user.projects),
      education:      user.education || [],
    };

    const practiceHistory = {
      totalTests,
      uniqueSkillsTested: uniqueSkills,
      averageScore:       avgScore,
      testsLast30Days:    recentTests.length,
      activeSince:        testHistory.length ? testHistory[testHistory.length - 1].createdAt : null,
      skillData: skillHistory.map(s => ({
        skill:         s.skillName,
        category:      s.category,
        practiceCount: s.practiceCount,
        lastPracticed: s.lastPracticed,
        currentLevel:  s.currentLevel,
        recentScores:  (s.practiceLog || []).slice(-5).map(p => p.score),
      })),
      recentTestHistory: testHistory.slice(0, 20).map(t => ({
        skill:   t.skill,
        score:   t.score,
        correct: t.correct,
        total:   t.total,
        date:    t.createdAt,
      })),
    };

    res.json({ candidate, practiceHistory });
  } catch (err) {
    console.error('[candidates/getOne]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.post('/:id/shortlist', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    const candidate = await User.findById(req.params.id).select('name').lean();
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });


    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { shortlistedCandidates: req.params.id },
    });

    res.json({ message: 'Candidate shortlisted', candidateId: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.delete('/:id/shortlist', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { shortlistedCandidates: req.params.id },
    });
    res.json({ message: 'Removed from shortlist' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/shortlisted/all', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    const recruiter = await User.findById(req.user._id)
      .select('shortlistedCandidates')
      .lean();

    const ids = recruiter.shortlistedCandidates || [];
    if (!ids.length) return res.json({ candidates: [] });

    const users = await User.find({ _id: { $in: ids }, role: 'user' })
      .select('-password -__v')
      .lean();

    const candidates = users.map(u => ({
      _id:          u._id,
      name:         u.name,
      email:        u.email,
      title:        u.title,
      location:     u.location,
      skills:       u.skills,
      overallScore: u.overallScore,
      certifications: (u.certifications || []).filter(c => c.completed),
      projects:     normaliseProjects(u.projects),
    }));

    res.json({ candidates });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
