import React, { useState } from "react";
import { api } from "../api";
import {
  Box, List, ListItemButton, ListItemText, Divider, Button, TextField, Typography, Paper
} from "@mui/material";

export default function ChannelList({ channels = [], currentChannel, setCurrentChannel, token, onCreated }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const create = async () => {
    if (!name.trim()) return alert("Enter channel name");
    try {
      const res = await api.post("/channels", { name }, { headers: { Authorization: `Bearer ${token}` } });
      onCreated && onCreated(res.data);
      setName("");
      setCreating(false);
      setCurrentChannel(res.data);
    } catch (err) {
      alert(err.response?.data?.message || "Create failed");
    }
  };

  return (
    <Paper sx={{ width: 300, borderRight: "1px solid #ddd", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 2, borderBottom: "1px solid #eee" }}>
        <Typography variant="h6">Channels</Typography>
        {!creating ? (
          <Button size="small" sx={{ mt: 1 }} onClick={() => setCreating(true)}>+ New channel</Button>
        ) : (
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <TextField size="small" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Button variant="contained" onClick={create}>Create</Button>
          </Box>
        )}
      </Box>

      <List sx={{ overflowY: "auto", flex: 1 }}>
        <Divider />
        {channels.map((c) => (
          <ListItemButton key={c._id} selected={currentChannel?._id === c._id} onClick={() => setCurrentChannel(c)}>
            <ListItemText primary={c.name} secondary={`${(c.members && c.members.length) || 0} members`} />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}
