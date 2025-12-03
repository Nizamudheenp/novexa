import React, { useState } from "react";
import { Box, TextField, Button } from "@mui/material";

export default function MessageInput({ socket, channel, user }) {
  const [text, setText] = useState("");

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    // Emit to server; server creates & broadcasts message
    socket.emit("sendMessage", { channelId: channel._id, content: text });
    setText("");
  };

  return (
    <Box component="form" onSubmit={send} sx={{ display: "flex", gap: 1 }}>
      <TextField fullWidth placeholder="Type a message..." value={text} onChange={(e) => setText(e.target.value)} />
      <Button type="submit" variant="contained">Send</Button>
    </Box>
  );
}
