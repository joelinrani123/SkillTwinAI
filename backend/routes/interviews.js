const router    = require('express').Router();
const auth      = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Interview = require('../models/Interview');
const User      = require('../models/User');

// Recruiter: get all their scheduled interviews
router.get('/', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    const interviews = await Interview.find({ recruiterId: req.user._id })
      .sort({ date: 1, time: 1 })
      .lean();
    res.json({ interviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Candidate: get interviews scheduled for them
router.get('/my', auth, async (req, res) => {
  try {
    const interviews = await Interview.find({ candidateId: req.user._id, status: { $ne: 'cancelled' } })
      .sort({ date: 1, time: 1 })
      .lean();
    res.json({ interviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Recruiter: schedule a new interview
router.post('/', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    const { candidateId, candidateName, jobTitle, date, time, type, notes, company, interviewLink } = req.body;
    if (!candidateId || !date || !time) {
      return res.status(400).json({ message: 'candidateId, date and time are required' });
    }

    const recruiter = await User.findById(req.user._id).select('name').lean();
    const candidate = await User.findById(candidateId).select('name').lean();
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const interview = await Interview.create({
      recruiterId:   req.user._id,
      candidateId,
      candidateName: candidateName || candidate.name,
      recruiterName: recruiter?.name || '',
      company:       company || '',
      jobTitle:      jobTitle || '',
      date,
      time,
      type:          type || 'Video Call',
      interviewLink: interviewLink || '',
      notes:         notes || '',
      status:        'scheduled',
    });

    res.status(201).json({ interview });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Recruiter: update interview status
router.put('/:id', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    const { status, notes, date, time, type, interviewLink } = req.body;
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, recruiterId: req.user._id },
      { $set: { ...(status && { status }), ...(notes !== undefined && { notes }), ...(date && { date }), ...(time && { time }), ...(type && { type }), ...(interviewLink !== undefined && { interviewLink }) } },
      { new: true }
    );
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    res.json({ interview });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Recruiter: delete interview
router.delete('/:id', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    await Interview.findOneAndDelete({ _id: req.params.id, recruiterId: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;