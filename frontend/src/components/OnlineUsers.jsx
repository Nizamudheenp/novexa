import React, { useEffect, useState } from "react";
import { List, ListItem, ListItemText, Paper, Box, Typography } from "@mui/material";

export default function OnlineUsers({ socket }) {
  const [list, setList] = useState([]);

  useEffect(() => {
    if (!socket) return;
    socket.on("presence:update", (arr) => setList(arr));
    return () => socket.off("presence:update");
  }, [socket]);

  return (
    <Paper sx={{ width: 240, p: 1 }}>
      <Typography variant="subtitle1">Online</Typography>
      <List>
        {list.map(u => (
          <ListItem key={u.id}>
            <ListItemText primary={u.name} secondary={`${u.connections} device(s)`} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
