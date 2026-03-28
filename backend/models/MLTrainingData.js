const mongoose = require('mongoose');


const MLTrainingDataSchema = new mongoose.Schema({
  sampleIndex:       { type: Number, required: true, unique: true },
  numSkills:         { type: Number, required: true },
  avgSkillLevel:     { type: Number, required: true },
  expertCount:       { type: Number, required: true },
  advancedCount:     { type: Number, required: true },
  intermediateCount: { type: Number, required: true },
  beginnerCount:     { type: Number, required: true },
  categoryCount:     { type: Number, required: true },
  gapCount:          { type: Number, required: true },
  testCount:         { type: Number, required: true },
  avgTestScore:      { type: Number, required: true },
  overallScore:      { type: Number, required: true },
  certCount:         { type: Number, required: true },
  careerLevelIndex:  { type: Number, required: true, enum: [0, 1, 2, 3] },
  careerLevel:       { type: String, required: true, enum: ['Junior', 'Mid-Level', 'Senior', 'Lead'] },
  source:            { type: String, enum: ['kaggle_derived', 'real'], default: 'kaggle_derived' },
}, { timestamps: true });

MLTrainingDataSchema.index({ careerLevel: 1 });
MLTrainingDataSchema.index({ source: 1 });

module.exports = mongoose.model('MLTrainingData', MLTrainingDataSchema);
