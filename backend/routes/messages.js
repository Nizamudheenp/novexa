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

    if (ch.isPrivate && !ch.members.includes(req.user._id)) {
        return res.status(403).json({ message: 'Join the channel to send messages' });
    }
    const msg = await Message.create({
        sender: req.user._id, channel:
            channelId, content
    });
    await msg.populate('sender', 'name email');
    res.json(msg);
});

router.put('/:messageId', auth, async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Not found' });
    if (msg.sender.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    msg.content = content;
    msg.edited = true;
    await msg.save();
    await msg.populate('sender', 'name');
    res.json(msg);
});

router.delete('/:messageId', auth, async (req, res) => {
    const { messageId } = req.params;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Not found' });
    if (msg.sender.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    await Message.deleteOne({ _id: messageId });
    res.json({ message: 'deleted', messageId });
});

router.get('/search', auth, async (req, res) => {
    const { channelId, q, limit = 50 } = req.query;
    if (!q || !channelId) return res.json([]);

    const messages = await Message.find({
        channel: channelId,
        content: { $regex: q, $options: 'i' }
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    res.json(messages);
});

module.exports = router;

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

