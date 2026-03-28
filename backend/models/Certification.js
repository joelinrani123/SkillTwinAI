const mongoose = require('mongoose');

const CertificationSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  skillName:         { type: String, required: true, trim: true },
  name:              { type: String, required: true },
  category:          { type: String, default: 'General' },
  scoreBoost:        { type: Number, default: 5 },
  earnedScore:       { type: Number, default: 75 },
  learningCompleted: { type: Boolean, default: false },
  issuedAt:          { type: Date, default: Date.now },
}, { timestamps: true });

CertificationSchema.index({ userId: 1, skillName: 1 }, { unique: true });

module.exports = mongoose.model('Certification', CertificationSchema);
