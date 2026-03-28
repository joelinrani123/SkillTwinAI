const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String },
  email:       { type: String },
  cover:       { type: String, default: '' },
  score:       { type: Number, default: 0 },
  status:      { type: String, enum: ['pending','reviewed','shortlisted','selected','rejected'], default: 'pending' },
  appliedAt:   { type: Date, default: Date.now },
}, { _id: true });

const JobSchema = new mongoose.Schema({
  recruiterId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company:      { type: String, default: '' },
  title:        { type: String, required: true, trim: true },
  description:  { type: String, default: '' },
  location:     { type: String, default: '' },
  type:         { type: String, enum: ['Full-time','Part-time','Contract','Internship'], default: 'Full-time' },
  salary:       { type: String, default: '' },
  remote:       { type: Boolean, default: false },
  skills:       [String],
  minScore:     { type: Number, default: 0, min: 0, max: 100 },
  active:       { type: Boolean, default: true },
  applications: [ApplicationSchema],
}, { timestamps: true });

JobSchema.index({ recruiterId: 1 });
JobSchema.index({ active: 1, createdAt: -1 });
module.exports = mongoose.model('Job', JobSchema);
