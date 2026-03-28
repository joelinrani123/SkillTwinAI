const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  id:          { type: String, required: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  type:        { type: String, enum: ['read','quiz','code','project'], default: 'read' },
  completed:   { type: Boolean, default: false },
  completedAt: { type: Date },
}, { _id: false });

const ModuleSchema = new mongoose.Schema({
  id:             { type: String, required: true },
  title:          { type: String, required: true },
  content:        { type: String, default: '' },        
  readingContent: { type: String, default: '' },       
  keyPoints:      [{ type: String }],                   
  tasks:          [TaskSchema],
  completed:      { type: Boolean, default: false },
  estimatedMins:  { type: Number, default: 15 },
}, { _id: false });

const LearningPathSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  skillName:    { type: String, required: true, trim: true },
  category:     { type: String, default: 'General' },
  modules:      [ModuleSchema],
  progress:     { type: Number, default: 0, min: 0, max: 100 },
  completed:    { type: Boolean, default: false },
  completedAt:  { type: Date },
  certUnlocked: { type: Boolean, default: false },
}, { timestamps: true });

LearningPathSchema.index({ userId: 1, skillName: 1 }, { unique: true });

module.exports = mongoose.model('LearningPath', LearningPathSchema);
