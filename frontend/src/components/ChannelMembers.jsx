import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { List, ListItem, ListItemText, Paper, Typography } from '@mui/material';

export default function ChannelMembers({ channelId, token }) {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    if (!channelId) return;
    api.get(`/channels/${channelId}/members`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setMembers(res.data))
      .catch(() => setMembers([]));
  }, [channelId, token]);
  return (
    <Paper sx={{ p: 1, mb: 1 }}>
      <Typography variant="subtitle2">Members</Typography>
      <List dense>
        {members.map(m => (
          <ListItem key={m._id}>
            <ListItemText primary={m.name} secondary={m.email} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
