require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const mongoose  = require('mongoose');

const authRoutes      = require('./routes/auth');
const userRoutes      = require('./routes/users');
const skillRoutes     = require('./routes/skills');
const projectRoutes   = require('./routes/projects');
const testRoutes      = require('./routes/tests');
const certRoutes      = require('./routes/certifications');
const jobRoutes       = require('./routes/jobs');
const candidateRoutes = require('./routes/candidates');
const mlRoutes        = require('./routes/ml');
const aiRoutes        = require('./routes/ai');
const adminRoutes     = require('./routes/admin');
const messageRoutes   = require('./routes/messages');
const interviewRoutes = require('./routes/interviews');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  dataset: 'Kaggle-derived 1000 records',
}));

app.use('/api/auth',           authRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/skills',         skillRoutes);
app.use('/api/projects',       projectRoutes);
app.use('/api/tests',          testRoutes);
app.use('/api/certifications', certRoutes);
app.use('/api/jobs',           jobRoutes);
app.use('/api/candidates',     candidateRoutes);
app.use('/api/ml',             mlRoutes);
app.use('/api/ai',             aiRoutes);
app.use('/api/admin',          adminRoutes);
app.use('/api/messages',       messageRoutes);
app.use('/api/interviews',     interviewRoutes);

app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} not found` }));
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.stack || err.message);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set in .env'); process.exit(1); }

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000, socketTimeoutMS: 45000 })
  .then(async () => {
    console.log(' MongoDB connected');

    // Pre-load models
    require('./models/LearningPath');
    require('./models/Certification');

    // Seed Kaggle dataset + start TF training
    const MLTrainingData = require('./models/MLTrainingData');
    const mlService      = require('./ml/mlService');

    await mlService.seedTrainingData(MLTrainingData);

    // Pre-warm models in background (non-blocking)
    const User = require('./models/User');
    mlService.retrain(User, MLTrainingData)
      .then(info => console.log('[ML] Pre-warm complete:', info.ensemble))
      .catch(e  => console.warn('[ML] Pre-warm failed:', e.message));

    app.listen(PORT, () => {
      console.log(` SkillTwinAI running on port ${PORT}`);
      console.log(` TF.js: install @tensorflow/tfjs-node for neural network`);
    });
  })
  .catch(err => { console.error('MongoDB failed:', err.message); process.exit(1); });

module.exports = app;
