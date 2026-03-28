const router      = require('express').Router();
const auth        = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Job         = require('../models/Job');
const User        = require('../models/User');
const Activity    = require('../models/Activity');


router.get('/', auth, async (req, res) => {
  try {
    const { search, type, remote } = req.query;
    const filter = { active: true };
    if (type)            filter.type   = type;
    if (remote === 'true') filter.remote = true;

    let jobs = await Job.find(filter)
      .select('-applications')
      .sort({ createdAt: -1 })
      .lean();

    if (search) {
      const re = new RegExp(search, 'i');
      jobs = jobs.filter(j =>
        re.test(j.title) || re.test(j.company) ||
        (j.skills || []).some(s => re.test(s))
      );
    }

    const jobsWithCounts = await Promise.all(jobs.map(async j => {
      const [agg] = await Job.aggregate([
        { $match: { _id: j._id } },
        { $project: { count: { $size: '$applications' } } },
      ]);
      return { ...j, applicants: agg?.count || 0, postedAt: j.createdAt };
    }));

    res.json({ jobs: jobsWithCounts });
  } catch (err) {
    console.error('[jobs/getAll]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.get('/applied', auth, async (req, res) => {
  try {
    const jobs = await Job.find({
      'applications.candidateId': req.user._id,
      active: true,
    }).select('title company applications.$').lean();

    const applications = jobs.map(j => ({
      jobId:         j._id,
      jobTitle:      j.title,
      title:         j.title,
      company:       j.company,
      applicationId: j.applications[0]?._id,
      status:        j.applications[0]?.status || 'pending',
      appliedAt:     j.applications[0]?.appliedAt,
    }));

    res.json({ applications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post('/:id/apply', auth, async (req, res) => {
  try {
    const { cover } = req.body;
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only candidates can apply to jobs' });
    }

    const job = await Job.findById(req.params.id);
    if (!job || !job.active) return res.status(404).json({ message: 'Job not found or closed' });

    const alreadyApplied = job.applications.some(
      a => a.candidateId.toString() === req.user._id.toString()
    );
    if (alreadyApplied) return res.status(409).json({ message: 'Already applied to this job' });

    const candidate = await User.findById(req.user._id).select('name email overallScore').lean();

    if (job.minScore > 0 && (candidate.overallScore || 0) < job.minScore) {
      return res.status(403).json({
        message: `Your score (${candidate.overallScore || 0}%) is below the minimum required (${job.minScore}%).`,
      });
    }

    job.applications.push({
      candidateId: req.user._id,
      name:        candidate.name,
      email:       candidate.email,
      cover:       cover || '',
      score:       candidate.overallScore || 0,
      status:      'pending',
      appliedAt:   new Date(),
    });
    await job.save();

    await Activity.create({
      userId: req.user._id, user: req.user.name,
      action: `${req.user.name} applied to "${job.title}"`, type: 'job_apply',
    });

    res.json({ message: 'Application submitted successfully' });
  } catch (err) {
    console.error('[jobs/apply]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.get('/recruiter', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { recruiterId: req.user._id };
    const jobs = await Job.find(filter).sort({ createdAt: -1 }).lean();
    const withCounts = jobs.map(j => ({
      ...j,
      applicants: (j.applications || []).length,
      postedAt:   j.createdAt,
    }));
    res.json({ jobs: withCounts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post('/', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    const { title, company, description, location, type, salary, remote, skills, minScore } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Job title is required' });

    const recruiter = await User.findById(req.user._id).select('name').lean();
    const job = await Job.create({
      recruiterId: req.user._id,
      company:     company  || recruiter.name,
      title:       title.trim(),
      description: description || '',
      location:    location    || '',
      type:        type        || 'Full-time',
      salary:      salary      || '',
      remote:      !!remote,
      skills:      Array.isArray(skills) ? skills.filter(Boolean) : [],
      minScore:    Math.min(100, Math.max(0, Number(minScore) || 0)),
      active:      true,
    });

    await Activity.create({
      userId: req.user._id, user: req.user.name,
      action: `${req.user.name} posted job: "${title}"`, type: 'job_post',
    });

    res.status(201).json({ job });
  } catch (err) {
    console.error('[jobs/post]', err.message);
    res.status(500).json({ message: err.message });
  }
});


router.get('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).select('-applications').lean();
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, recruiterId: req.user._id };

    const job = await Job.findOne(filter);
    if (!job) return res.status(404).json({ message: 'Job not found or not yours' });

    const editable = ['title','company','description','location','type','salary','remote','skills','minScore','active'];
    for (const field of editable) {
      if (req.body[field] !== undefined) job[field] = req.body[field];
    }
    await job.save();
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.delete('/:id', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, recruiterId: req.user._id };

    const job = await Job.findOneAndDelete(filter);
    if (!job) return res.status(404).json({ message: 'Job not found or not yours' });
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/:id/applicants', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, recruiterId: req.user._id };

    const job = await Job.findOne(filter)
      .populate('applications.candidateId', 'name title skills gaps overallScore certifications location github linkedin')
      .lean();

    if (!job) return res.status(404).json({ message: 'Job not found' });

    const applicants = job.applications.map(a => ({
      applicationId: a._id,
      candidateId:   a.candidateId?._id || a.candidateId,
      name:          a.candidateId?.name  || a.name,
      email:         a.email,
      cover:         a.cover,
      score:         a.score,
      status:        a.status,
      appliedAt:     a.appliedAt,
      profile:       a.candidateId || null,
    })).sort((a, b) => (b.score || 0) - (a.score || 0));

    res.json({ applicants, jobTitle: job.title });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.put('/:id/applicants/:appId/status', auth, requireRole('recruiter', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending','reviewed','shortlisted','selected','rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, recruiterId: req.user._id };

    const job = await Job.findOne(filter);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const app = job.applications.id(req.params.appId);
    if (!app) return res.status(404).json({ message: 'Application not found' });

    const prevStatus = app.status;
    app.status = status;
    await job.save();

   
    const notifyStatuses = ['selected','rejected','shortlisted','reviewed'];
    if (notifyStatuses.includes(status) && status !== prevStatus) {
      try {
        const Message = require('../models/Message');
        const msgs = {
          selected:    `Congratulations! You have been selected for "${job.title}" at ${job.company || 'the company'}. We will be in touch with next steps.`,
          rejected:    `Thank you for applying to "${job.title}" at ${job.company || 'our company'}. We have moved forward with other candidates at this time.`,
          shortlisted: `Your application for "${job.title}" at ${job.company || 'our company'} has been shortlisted. We will review your profile shortly.`,
          reviewed:    `Your application for "${job.title}" at ${job.company || 'our company'} is under review. We will update you soon.`,
        };
        await Message.create({
          from: req.user._id, to: app.candidateId,
          message:     msgs[status],
          subject:     `Application Update — ${job.title}`,
          isSelection: status === 'selected',
          jobId:       job._id,
          jobTitle:    job.title,
        });
      } catch (msgErr) {
        console.warn('[jobs/status] Auto-message failed:', msgErr.message);
      }
    }

    res.json({ message: 'Status updated', status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
