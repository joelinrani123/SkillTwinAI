const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const EducationSchema = new mongoose.Schema({
  degree:      { type: String, default: '' },
  institution: { type: String, default: '' },
  year:        { type: String, default: '' },
  grade:       { type: String, default: '' },
}, { _id: true });

const SkillSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  level:    { type: Number, min: 0, max: 100, default: 30 },
  category: { type: String, default: 'Other' },
}, { _id: true });

const ProjectSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  tech:        [String],
  url:         { type: String, default: '' },
  link:        { type: String, default: '' },
}, { _id: true, timestamps: true });

const TestResultSchema = new mongoose.Schema({
  skill:   { type: String, required: true },
  score:   { type: Number, required: true, min: 0, max: 100 },
  correct: { type: Number, default: 0 },
  total:   { type: Number, default: 20 },
  date:    { type: Date, default: Date.now },
}, { _id: true });

const CertProgressSchema = new mongoose.Schema({
  certId:      { type: String, required: true },
  name:        { type: String, required: true },
  category:    { type: String, default: '' },
  scoreBoost:  { type: Number, default: 5 },
  progress:    { type: Number, default: 0, min: 0, max: 100 },
  completed:   { type: Boolean, default: false },
  completedAt: { type: Date },
  enrolledAt:  { type: Date, default: Date.now },
}, { _id: false });

const MLPredictionSchema = new mongoose.Schema({
  rfLabel:        String,
  rfProb:         Number,
  knnLabel:       String,
  knnProb:        Number,
  tfLabel:        String,
  tfProb:         Number,
  careerLevel:    String,
  readinessScore: Number,
  topSkills:      [String],
  improvements:   [String],
  predictedAt:    { type: Date, default: Date.now },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  // Clerk integration — stores the Clerk userId for fast lookup
  clerkId:  { type: String, default: '', index: true },

  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  // Password is now managed by Clerk. This field is kept for backwards
  // compatibility with existing records and for the pre-save hash hook,
  // but new Clerk-based users store a placeholder value.
  password: { type: String, default: 'clerk-managed', minlength: 8 },
  role:     { type: String, enum: ['user', 'recruiter', 'admin'], default: 'user' },

  title:    { type: String, default: '' },
  company:  { type: String, default: '' },
  bio:      { type: String, default: '' },
  location: { type: String, default: '' },
  github:   { type: String, default: '' },
  linkedin: { type: String, default: '' },

  skills:         [SkillSchema],
  gaps:           [String],
  projects:       [ProjectSchema],
  testResults:    [TestResultSchema],
  certifications: [CertProgressSchema],
  education:      [EducationSchema],

  overallScore: { type: Number, default: 0 },
  certScore:    { type: Number, default: 0 },

  mlPrediction: MLPredictionSchema,

  avatar:      { type: String, default: '' },
  lastActive:  { type: Date, default: Date.now },
  aiChatCount: { type: Number, default: 0 },

  shortlistedCandidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ overallScore: -1 });

// Only hash password when it is actually changed to a real value
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (this.password === 'clerk-managed') return next(); // skip hashing for Clerk users
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Recompute overall score when relevant fields change
UserSchema.pre('save', function (next) {
  if (this.isModified('skills') || this.isModified('testResults') || this.isModified('certifications')) {
    this.overallScore = computeOverallScore(this);
  }
  next();
});

function computeOverallScore(user) {
  const skills      = user.skills      || [];
  const testResults = user.testResults || [];
  const certs       = (user.certifications || []).filter(c => c.completed);

  if (!skills.length) return 0;

  const avgSkill      = skills.reduce((a, s) => a + (s.level || 0), 0) / skills.length;
  const testComponent = testResults.length
    ? testResults.reduce((a, t) => a + (t.score || 0), 0) / testResults.length : 0;

  const uniqueSkillsTested = new Set(testResults.map(t => (t.skill || '').toLowerCase())).size;
  const consistencyBonus   = (testResults.length >= 5 && uniqueSkillsTested >= 2)
    ? Math.min(testResults.length * 0.8, 15) : 0;

  const certBonus = Math.min(certs.length * 3, 10);
  const raw       = avgSkill * 0.35 + testComponent * 0.40 + consistencyBonus + certBonus;

  if (testResults.length < 3) return Math.min(Math.round(raw), 40);
  return Math.min(Math.max(Math.round(raw), 0), 100);
}

UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

UserSchema.methods.toPublicProfile = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  if (!obj.avatar) obj.avatar = '';

  if (Array.isArray(obj.projects)) {
    obj.projects = obj.projects.map(p => ({
      id:          p._id ? p._id.toString() : '',
      name:        p.name || '',
      description: p.description || '',
      tech:        p.tech || [],
      link:        p.link || p.url || '',
    }));
  }
  return obj;
};

UserSchema.methods.toCandidateView = function () {
  return {
    _id:            this._id,
    name:           this.name,
    title:          this.title,
    bio:            this.bio,
    location:       this.location,
    github:         this.github,
    linkedin:       this.linkedin,
    avatar:         this.avatar || '',
    skills:         this.skills,
    gaps:           this.gaps,
    projects:       (this.projects || []).map(p => ({
      id:          p._id ? p._id.toString() : p.id,
      name:        p.name,
      description: p.description || '',
      tech:        p.tech || [],
      link:        p.link || p.url || '',
    })),
    education:      this.education || [],
    overallScore:   this.overallScore,
    certifications: (this.certifications || []).filter(c => c.completed),
    mlPrediction:   this.mlPrediction,
  };
};

module.exports = mongoose.model('User', UserSchema);