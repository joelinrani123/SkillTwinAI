const router          = require('express').Router();
const auth            = require('../middleware/auth');
const requireRole     = require('../middleware/requireRole');
const User            = require('../models/User');
const MLTrainingData  = require('../models/MLTrainingData');
const mlService       = require('../ml/mlService');


router.post('/predict', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('skills testResults gaps overallScore certifications')
      .lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const prediction = await mlService.predict(user, User, MLTrainingData);


    await User.findByIdAndUpdate(req.user._id, {
      mlPrediction: {
        careerLevel:    prediction.careerLevel,
        readinessScore: prediction.readinessScore,
        topSkills:      prediction.topSkills,
        improvements:   prediction.improvements,
        rfLabel:        prediction._internal?.rfLabel,
        knnLabel:       prediction._internal?.knnLabel,
        predictedAt:    new Date(),
      },
    });

    const { _internal, ...client } = prediction;
    res.json(client);
  } catch (err) {
    console.error('[ML predict]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.post('/retrain', auth, requireRole('admin'), async (req, res) => {
  try {
    const result = await mlService.retrain(User, MLTrainingData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/info', auth, requireRole('admin'), (_req, res) => {
  res.json(mlService.getModelInfo());
});


router.get('/dataset-stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const total   = await MLTrainingData.countDocuments();
    const kaggle  = await MLTrainingData.countDocuments({ source: 'kaggle_derived' });
    const real    = await MLTrainingData.countDocuments({ source: 'real' });
    const byLevel = await MLTrainingData.aggregate([
      { $group: { _id: '$careerLevel', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ total, kaggle, real, byLevel, modelInfo: mlService.getModelInfo() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
