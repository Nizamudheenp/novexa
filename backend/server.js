require('dotenv').config();
const express = require('express');
const http = require('http');
const connectDB = require('./config/db');
const cors = require('cors');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const Message = require('./models/Message');
const Channel = require('./models/Channel');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000'
    }
});
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true
}));
app.use(express.json());

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
const presence = new Map();
io.on('connection', (socket) => {
    socket.on('authenticate', (payload) => {
        const { userId, name, channels } = payload || {};
        if (!userId) return;
        socket.userId = userId;
        socket.userName = name;
        const entry = presence.get(userId) || {
            socketIds: new Set(),
            name
        };
        entry.socketIds.add(socket.id);
        presence.set(userId, entry);
        io.emit('presence:update',
            Array.from(presence.entries()).map(([id, e]) => ({
                id, name: e.name,
                connections: e.socketIds.size
            })));
        if (Array.isArray(channels)) {
            channels.forEach(chId => socket.join(`channel_${chId}`));
        }

    });
    socket.on('joinChannel', (channelId) => {
        socket.join(`channel_${channelId}`);
    });
    socket.on('leaveChannel', (channelId) => {
        socket.leave(`channel_${channelId}`);
    });
    socket.on('sendMessage', async ({ channelId, content }) => {
        if (!socket.userId) return;
        const msg = await Message.create({
            sender: socket.userId,
            channel: channelId, content
        });
        await msg.populate('sender', 'name');
        io.to(`channel_${channelId}`).emit('message:new', msg);
    });
    socket.on('disconnect', () => {
        if (!socket.userId) return;
        const entry = presence.get(socket.userId);
        if (!entry) return;
        entry.socketIds.delete(socket.id);
        if (entry.socketIds.size === 0) presence.delete(socket.userId);
        else presence.set(socket.userId, entry);
        io.emit('presence:update',
            Array.from(presence.entries()).map(([id, e]) => ({
                id, name: e.name,
                connections: e.socketIds.size
            })));
    });
});
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`app listening at port ${PORT}`);
})