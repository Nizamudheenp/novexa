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
const path = require('path');
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

    function broadcastPresence() {
        const list = Array.from(presence.entries()).map(([id, e]) => ({
            id,
            name: e.name,
            connections: e.socketIds.size,
            channels: Array.from(e.channels || [])
        }));
        io.emit('presence:update', list);
    }

    socket.on('authenticate', (payload) => {
        const { userId, name, channels } = payload || {};
        if (!userId) return;
        socket.userId = userId;
        socket.userName = name;

        const entry = presence.get(userId) || { socketIds: new Set(), name, channels: new Set() };
        entry.socketIds.add(socket.id);
        (channels || []).forEach(ch => entry.channels.add(ch));
        presence.set(userId, entry);

        if (Array.isArray(channels)) {
            channels.forEach(chId => socket.join(`channel_${chId}`));
        }
        broadcastPresence();
    });

    socket.on('joinChannel', (channelId) => {
        if (!socket.userId) return;
        socket.join(`channel_${channelId}`);
        const entry = presence.get(socket.userId);
        if (entry) { entry.channels.add(channelId); presence.set(socket.userId, entry); broadcastPresence(); }
    });

    socket.on('leaveChannel', (channelId) => {
        if (!socket.userId) return;
        socket.leave(`channel_${channelId}`);
        const entry = presence.get(socket.userId);
        if (entry) {
            entry.channels.delete(channelId);
            presence.set(socket.userId, entry);
            broadcastPresence();
        }
    });

    socket.on('typing:start', ({ channelId }) => {
        if (!socket.userId) return;
        socket.to(`channel_${channelId}`).emit('typing:start', { userId: socket.userId, name: socket.userName, channelId });
    });
    socket.on('typing:stop', ({ channelId }) => {
        if (!socket.userId) return;
        socket.to(`channel_${channelId}`).emit('typing:stop', { userId: socket.userId, channelId });
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

    socket.on('editMessage', async ({ messageId, newContent }) => {
        if (!socket.userId) return;
        const msg = await Message.findById(messageId);
        if (!msg) return;
        if (msg.sender.toString() !== socket.userId.toString()) return; 
        msg.content = newContent;
        msg.edited = true;
        await msg.save();
        await msg.populate('sender', 'name');
        io.to(`channel_${msg.channel}`).emit('message:edited', msg);
    });

    socket.on('deleteMessage', async ({ messageId }) => {
        if (!socket.userId) return;
        const msg = await Message.findById(messageId);
        if (!msg) return;
        if (msg.sender.toString() !== socket.userId.toString()) return; 
        await Message.deleteOne({ _id: messageId });
        io.to(`channel_${msg.channel}`).emit('message:deleted', { messageId, channelId: msg.channel });
    });

    socket.on('disconnect', () => {
        if (!socket.userId) return;
        const entry = presence.get(socket.userId);
        if (!entry) return;
        entry.socketIds.delete(socket.id);
        if (entry.socketIds.size === 0) presence.delete(socket.userId);
        else presence.set(socket.userId, entry);
        broadcastPresence();
    });

});

const frontendPath = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendPath));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`app listening at port ${PORT}`);
})