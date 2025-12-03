import React, { useEffect, useRef, useState } from "react";
import { api } from "../api";
import MessageInput from "./MessageInput";
import { Box, Paper, Typography, Divider } from "@mui/material";

export default function ChatWindow({ channel, socket, token, user }) {
  const [messages, setMessages] = useState([]);
  const listRef = useRef();

  useEffect(() => {
    if (!channel) return;
    // load recent messages
    api.get(`/messages/${channel._id}?limit=30`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        // server returns newest first (sorted desc) — reverse to chronological
        const arr = Array.isArray(res.data) ? res.data.reverse() : [];
        setMessages(arr);
        // auto-scroll
        setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
      })
      .catch(err => console.error(err));
  }, [channel._id, token]);

  useEffect(() => {
    if (!socket) return;

    const onNew = (msg) => {
      if (msg.channel === channel._id) {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
      }
    };

    socket.on("message:new", onNew);
    return () => {
      socket.off("message:new", onNew);
    };
  }, [socket, channel._id]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">{channel.name}</Typography>
      </Paper>

      <Divider />

      <Box ref={listRef} sx={{ overflowY: "auto", flex: 1, p: 2 }}>
        {messages.map(m => (
          <Box key={m._id} sx={{ mb: 1 }}>
            <Typography variant="subtitle2">{m.sender?.name || "Unknown"} <Typography component="span" sx={{ color: "gray", fontSize: 12 }}> {new Date(m.createdAt).toLocaleString()}</Typography></Typography>
            <Typography variant="body1">{m.content}</Typography>
          </Box>
        ))}
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <MessageInput socket={socket} channel={channel} user={user} />
      </Box>
    </Box>
  );
}
