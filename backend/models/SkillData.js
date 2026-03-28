const mongoose = require('mongoose');


const SkillDataSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  skillName:   { type: String, required: true, trim: true },
  category:    { type: String, default: 'Other' },
  currentLevel: { type: Number, default: 50, min: 0, max: 100 },
  practiceLog: [{
    date:  { type: Date, default: Date.now },
    score: { type: Number },
    type:  { type: String, enum: ['test', 'manual_update'], default: 'test' },
  }],
  lastPracticed: { type: Date },
  practiceCount: { type: Number, default: 0 },
}, { timestamps: true });

SkillDataSchema.index({ userId: 1, skillName: 1 }, { unique: true });

module.exports = mongoose.model('SkillData', SkillDataSchema);
