const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user:   { type: String },
  action: { type: String, required: true },
  type:   { type: String, default: 'general' },
}, { timestamps: true });

ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ userId: 1 });

module.exports = mongoose.model('Activity', ActivitySchema);
