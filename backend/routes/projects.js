const router = require('express').Router();
const User   = require('../models/User');
const auth   = require('../middleware/auth');


function normalise(projects = []) {
  return projects.map(p => ({
    id:          p._id ? p._id.toString() : '',
    name:        p.name,
    description: p.description || '',
    tech:        p.tech || [],
    link:        p.link || p.url || '',
  }));
}

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('projects').lean();
    res.json({ projects: normalise(user.projects) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post('/', auth, async (req, res) => {
  try {
    const { name, description, tech, url, link } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Project name is required' });

    const user = await User.findById(req.user._id);
    const resolvedLink = link || url || '';
    user.projects.push({
      name:        name.trim(),
      description: description || '',
      tech:        Array.isArray(tech) ? tech : [],
      url:         resolvedLink,
      link:        resolvedLink,
    });
    await user.save();
    res.status(201).json({ projects: normalise(user.projects) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.put('/:id', auth, async (req, res) => {
  try {
    const user    = await User.findById(req.user._id);
    const project = user.projects.id(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const { name, description, tech, url, link } = req.body;
    if (name        !== undefined) project.name        = name.trim();
    if (description !== undefined) project.description = description;
    if (tech        !== undefined) project.tech        = tech;
    const resolvedLink = link !== undefined ? link : url;
    if (resolvedLink !== undefined) {
      project.url  = resolvedLink;
      project.link = resolvedLink;
    }

    await user.save();
    res.json({ projects: normalise(user.projects) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    const user    = await User.findById(req.user._id);
    const project = user.projects.id(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    project.deleteOne();
    await user.save();
    res.json({ projects: normalise(user.projects) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
