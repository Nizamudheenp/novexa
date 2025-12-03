import React, { useState } from "react";
import { Box, TextField, Button } from "@mui/material";

export default function MessageInput({ socket, channel, user }) {
  const [text, setText] = useState("");
  const [typingTimeout, setTypingTimeout] = useState(null);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    socket.emit("sendMessage", { channelId: channel._id, content: text });
    socket.emit("typing:stop", { channelId: channel._id });
    setText("");
  };

  return (
    <Box component="form" onSubmit={send} sx={{ display: "flex", gap: 1 }}>
      <TextField
        fullWidth
        placeholder="Type a message..."
        value={text}
        onChange={(e) => {
          setText(e.target.value);

          if (!socket || !channel) return;

          socket.emit("typing:start", { channelId: channel._id });

          if (typingTimeout) clearTimeout(typingTimeout);

          setTypingTimeout(setTimeout(() => {
            socket.emit("typing:stop", { channelId: channel._id });
          }, 1200));
        }}
      />
      <Button type="submit" variant="contained">Send</Button>
    </Box>
  );
}
