const mongoose = require('mongoose');

const InterviewSchema = new mongoose.Schema({
  recruiterId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  candidateId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  candidateName: { type: String, required: true },
  recruiterName: { type: String, default: '' },
  company:       { type: String, default: '' },
  jobTitle:      { type: String, default: '' },
  date:          { type: String, required: true },  // YYYY-MM-DD
  time:          { type: String, required: true },  // HH:MM
  type:          { type: String, default: 'Video Call', enum: ['Video Call', 'Phone Call', 'In-Person', 'Technical', 'HR Round'] },
  notes:         { type: String, default: '' },
  status:        { type: String, default: 'scheduled', enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'] },
  notified:      { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Interview', InterviewSchema);
