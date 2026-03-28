const router  = require('express').Router();
const auth    = require('../middleware/auth');
const Message = require('../models/Message');
const User    = require('../models/User');


router.get('/', auth, async (req, res) => {
  try {
    const msgs = await Message.find({ to: req.user._id })
      .populate('from', 'name role title')
      .sort({ createdAt: -1 })
      .lean();
    const sent = await Message.find({ from: req.user._id })
      .populate('to', 'name role title')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ inbox: msgs, sent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({ to: req.user._id, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/contacts', auth, async (req, res) => {
  try {
    const uid = req.user._id;

    const received = await Message.find({ to: uid }).distinct('from');
    const sent     = await Message.find({ from: uid }).distinct('to');

    const allIds = [...new Set([...received.map(String), ...sent.map(String)])];
    if (!allIds.length) return res.json({ contacts: [] });

    const contacts = await User.find({ _id: { $in: allIds } })
      .select('name role title avatar')
      .lean();

    const contactsWithMeta = await Promise.all(contacts.map(async c => {
      const unread = await Message.countDocuments({ from: c._id, to: uid, read: false });
      const lastMsg = await Message.findOne({
        $or: [{ from: uid, to: c._id }, { from: c._id, to: uid }]
      }).sort({ createdAt: -1 }).lean();
      return { ...c, unread, lastMessage: lastMsg?.message || '', lastAt: lastMsg?.createdAt };
    }));

    // Sort by most recent message
    contactsWithMeta.sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0));

    res.json({ contacts: contactsWithMeta });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/thread/:userId', auth, async (req, res) => {
  try {
    const other = req.params.userId;
    const msgs = await Message.find({
      $or: [
        { from: req.user._id, to: other },
        { from: other, to: req.user._id },
      ]
    })
    .populate('from', 'name role title')
    .populate('to', 'name role title')
    .sort({ createdAt: 1 })
    .lean();
    
    await Message.updateMany({ from: other, to: req.user._id, read: false }, { read: true });
    res.json({ messages: msgs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post('/send', auth, async (req, res) => {
  try {
    const { toUserId, message, subject, isSelection, jobId, jobTitle, parentId } = req.body;
    if (!toUserId || !message?.trim()) {
      return res.status(400).json({ message: 'toUserId and message are required' });
    }
    const recipient = await User.findById(toUserId).select('name').lean();
    if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

    const msg = await Message.create({
      from:        req.user._id,
      to:          toUserId,
      message:     message.trim(),
      subject:     subject || '',
      isSelection: !!isSelection,
      jobId:       jobId   || null,
      jobTitle:    jobTitle|| '',
      parentId:    parentId|| null,
    });
    const populated = await msg.populate('from', 'name role');
    res.status(201).json({ message: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.put('/:id/read', auth, async (req, res) => {
  try {
    await Message.findOneAndUpdate({ _id: req.params.id, to: req.user._id }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    // Only allow deleting your own sent messages
    const msg = await Message.findOne({ _id: req.params.id, from: req.user._id });
    if (!msg) return res.status(404).json({ message: 'Message not found or you are not the sender' });
    await Message.findByIdAndDelete(req.params.id);
    res.json({ ok: true, deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
