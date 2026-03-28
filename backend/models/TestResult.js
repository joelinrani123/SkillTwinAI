const mongoose = require('mongoose');


const QuestionDetailSchema = new mongoose.Schema({
  question:      { type: String, required: true },
  options:       [String],
  correctIndex:  { type: Number, required: true },   
  correctAnswer: { type: String },                    
  chosenIndex:   { type: Number },                    
  chosenAnswer:  { type: String },                    
  isCorrect:     { type: Boolean, default: false },
}, { _id: false });

const TestResultSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  skill:     { type: String, required: true, trim: true },
  score:     { type: Number, required: true, min: 0, max: 100 },
  correct:   { type: Number, default: 0 },
  total:     { type: Number, default: 10 },
  timeTaken: { type: Number, default: 0 },           
  questions: [QuestionDetailSchema],                 
}, { timestamps: true });

TestResultSchema.index({ userId: 1, createdAt: -1 });
TestResultSchema.index({ userId: 1, skill: 1 });

module.exports = mongoose.model('TestResult', TestResultSchema);
