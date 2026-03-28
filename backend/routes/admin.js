const router         = require('express').Router();
const auth           = require('../middleware/auth');
const requireRole    = require('../middleware/requireRole');
const User           = require('../models/User');
const Job            = require('../models/Job');
const Activity       = require('../models/Activity');
const MLTrainingData = require('../models/MLTrainingData');
const mlService      = require('../ml/mlService');


let systemSettings = {
  testPassScore:     70,
  maxSkillLevel:     100,
  systemName:        'SkillTwinAI',
  maintenanceMode:   false,
  allowRegistration: true,
  updatedAt:         null,
};


router.get('/stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const [
      totalUsers, candidates, recruiters, admins,
      totalJobs, testAgg, avgScoreAgg, certAgg
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'recruiter' }),
      User.countDocuments({ role: 'admin' }),
      Job.countDocuments({ active: true }),
      User.aggregate([{ $group: { _id: null, total: { $sum: { $size: '$testResults' } } } }]),
      User.aggregate([
        { $match: { role: 'user', overallScore: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$overallScore' } } },
      ]),
      User.aggregate([
        { $unwind: '$certifications' },
        { $match: { 'certifications.completed': true } },
        { $count: 'total' },
      ]),
    ]);

    res.json({
      totalUsers, candidates, recruiters, admins,
      jobPostings:       totalJobs,
      totalTests:        testAgg[0]?.total        || 0,
      testsTaken:        testAgg[0]?.total        || 0,
      avgScore:          Math.round(avgScoreAgg[0]?.avg || 0),
      avgCandidateScore: Math.round(avgScoreAgg[0]?.avg || 0),
      certificates:      certAgg[0]?.total        || 0,
      certCompletions:   certAgg[0]?.total        || 0,
      mlInfo:            mlService.getModelInfo(),
    });
  } catch (err) {
    console.error('[admin/stats]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.get('/users', auth, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .lean();


    const mapped = users.map(u => ({
      ...u,
      role: u.role === 'user' ? 'candidate' : u.role,
    }));

    res.json({ users: mapped });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/users/:id/role', auth, requireRole('admin'), async (req, res) => {
  try {
    let { role } = req.body;
   
    if (role === 'candidate') role = 'user';

    if (!['user', 'recruiter', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be candidate, recruiter, or admin.' });
    }
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own role.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id, { role }, { new: true }
    ).select('-password -__v').lean();

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      message: 'Role updated',
      user: { ...user, role: user.role === 'user' ? 'candidate' : user.role },
    });
  } catch (err) {
    console.error('[admin/updateRole]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.delete('/users/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post('/users/:id/reset-skills', auth, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    for (const skill of user.skills) skill.level = 0;
    user.overallScore = 0;
    await user.save();

    res.json({ message: 'All skill levels reset to 0 for user.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/activity', auth, requireRole('admin'), async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/settings', auth, requireRole('admin'), (_req, res) => {
  res.json({ settings: systemSettings });
});


router.put('/settings', auth, requireRole('admin'), async (req, res) => {
  try {
    const allowed = [
      'testPassScore',
      'maxSkillLevel','systemName','maintenanceMode','allowRegistration',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) systemSettings[key] = req.body[key];
    }
    systemSettings.updatedAt = new Date();
    res.json({ message: 'Settings saved', settings: systemSettings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.delete('/jobs/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post('/ml/retrain', auth, requireRole('admin'), async (req, res) => {
  try {
    const result = await mlService.retrain(User, MLTrainingData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/ml/dataset', auth, requireRole('admin'), async (req, res) => {
  try {
    const total   = await MLTrainingData.countDocuments();
    const kaggle  = await MLTrainingData.countDocuments({ source: 'kaggle_derived' });
    const real    = await MLTrainingData.countDocuments({ source: 'real' });
    const byLevel = await MLTrainingData.aggregate([
      { $group: { _id: '$careerLevel', count: { $sum: 1 } } },
      { $sort:  { _id: 1 } },
    ]);
    res.json({ total, kaggle, real, byLevel, modelInfo: mlService.getModelInfo() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
