const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const { JWT_SECRET } = process.env;
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {

        if (!name || !email || !password) return res.status(400).json({
            message: 'Missing'
        });
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: 'Email exists' });
        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({
            name, email, passwordHash:
                hash
        });
        const token = jwt.sign({ id: user._id }, JWT_SECRET);
        res.json({
            token, user: {
                id: user._id, name: user.name, email:
                    user.email
            }
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ id: user._id }, JWT_SECRET);
        res.json({
            token, user: {
                id: user._id, name: user.name, email:
                    user.email
            }
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});
module.exports = router