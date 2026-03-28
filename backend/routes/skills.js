const router   = require('express').Router();
const User     = require('../models/User');
const auth     = require('../middleware/auth');
const Activity = require('../models/Activity');


router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('skills gaps lastActive').lean();
    res.json({ skills: user.skills || [], gaps: user.gaps || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post('/', auth, async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Skill name is required' });

    const user = await User.findById(req.user._id);
    const dup  = user.skills.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (dup) return res.status(409).json({ message: 'Skill already exists' });

    user.skills.push({ name: name.trim(), level: 30, category: category || 'Other' });
    user.lastActive = new Date();
    await user.save();

    await Activity.create({
      userId: user._id, user: user.name,
      action: `${user.name} added skill: ${name}`, type: 'skill_add',
    });

    res.status(201).json({ skills: user.skills, overallScore: user.overallScore });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/gaps', auth, async (req, res) => {
  try {
    const { skillName } = req.body;
    if (!skillName?.trim()) return res.status(400).json({ message: 'skillName is required' });
    const user = await User.findById(req.user._id);
    if (!user.gaps.includes(skillName.trim())) {
      user.gaps.push(skillName.trim());
      await user.save();
    }
    res.json({ gaps: user.gaps });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.delete('/gaps/:name', auth, async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const user = await User.findById(req.user._id);
    user.gaps  = user.gaps.filter(g => g !== name);
    await user.save();
    res.json({ gaps: user.gaps });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.put('/:id', auth, async (req, res) => {
  try {
    const user  = await User.findById(req.user._id);
    const skill = user.skills.id(req.params.id);
    if (!skill) return res.status(404).json({ message: 'Skill not found' });

    const { name, category, level } = req.body;

    if (name !== undefined) {

      const duplicate = user.skills.find(
        s => s._id.toString() !== req.params.id &&
             s.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (duplicate) return res.status(409).json({ message: 'A skill with that name already exists' });
      skill.name = name.trim();
    }
    if (category !== undefined) skill.category = category;
    if (level    !== undefined) skill.level    = Math.min(100, Math.max(0, Number(level)));

    user.lastActive = new Date();
    await user.save();
    res.json({ skills: user.skills, overallScore: user.overallScore });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const user  = await User.findById(req.user._id);
    const skill = user.skills.id(req.params.id);
    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    skill.deleteOne();
    user.lastActive = new Date();
    await user.save();
    res.json({ skills: user.skills, overallScore: user.overallScore });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
