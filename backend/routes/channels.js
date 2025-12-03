const express = require('express');
const Channel = require('../models/Channel');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
    const channels = await Channel.find().populate('members', 'name email');
    res.json(channels);
});

router.post('/', auth, async (req, res) => {
    const { name, isPrivate } = req.body;
    try {
        const existing = await Channel.findOne({ name });
        if (existing) return res.status(400).json({ message: 'Channel exists' });
        const channel = await Channel.create({
            name, isPrivate, members:
                [req.user._id]
        });
        res.json(channel);
    } catch (err) { res.status(500).json({ message: err.message }); }
});
router.post('/:id/join', auth, async (req, res) => {
    const ch = await Channel.findById(req.params.id);
    if (!ch) return res.status(404).json({ message: 'Not found' });
    if (!ch.members.includes(req.user._id)) {
        ch.members.push(req.user._id);
        await ch.save();
    }
    res.json(ch);
});
router.post('/:id/leave', auth, async (req, res) => {
    const ch = await Channel.findById(req.params.id);
    if (!ch) return res.status(404).json({ message: 'Not found' });
    ch.members = ch.members.filter(m => m.toString() !==
        req.user._id.toString());
    await ch.save();
    res.json({ message: 'left' });
});

router.get('/:id/members', auth, async (req, res) => {
    const ch = await Channel.findById(req.params.id).populate('members', 'name email');
    if (!ch) return res.status(404).json({ message: 'Not found' });
    res.json(ch.members);
});

module.exports = router;