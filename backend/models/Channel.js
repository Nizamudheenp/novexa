const mongoose = require('mongoose');
const ChannelSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isPrivate: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('Channel', ChannelSchema);