const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  from:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:      { type: String, required: true, trim: true },
  subject:      { type: String, default: '' },
  isSelection:  { type: Boolean, default: false }, 
  jobId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  jobTitle:     { type: String, default: '' },
  read:         { type: Boolean, default: false },
  parentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }, 
}, { timestamps: true });

MessageSchema.index({ to: 1, read: 1 });
MessageSchema.index({ from: 1 });
MessageSchema.index({ to: 1, createdAt: -1 });
module.exports = mongoose.model('Message', MessageSchema);
