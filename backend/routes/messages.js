const express = require('express');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const auth = require('../middleware/auth');
const router = express.Router();
router.post('/', auth, async (req, res) => {
    const { channelId, content } = req.body;
    if (!content) return res.status(400).json({ message: 'Empty' });
    const ch = await Channel.findById(channelId);
    if (!ch) return res.status(404).json({ message: 'Channel not found' });
    const msg = await Message.create({
        sender: req.user._id, channel:
            channelId, content
    });
    await msg.populate('sender', 'name email');
    res.json(msg);
});

router.get('/:channelId', auth, async (req, res) => {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit || '30');
    const before = req.query.before;
    const query = { channel: channelId };
    if (before) {
        const date = new Date(before);
        if (!isNaN(date)) {
            query.createdAt = { $lt: date };
        }
    }
    const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('sender', 'name');
    res.json(messages);
});
module.exports = router;