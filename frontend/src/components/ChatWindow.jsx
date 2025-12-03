import React, { useEffect, useRef, useState } from "react";
import { api } from "../api";
import MessageInput from "./MessageInput";
import ChannelMembers from "./ChannelMembers";
import OnlineUsers from "./OnlineUsers";
import { Box, Paper, Typography, Divider, Button, TextField } from "@mui/material";
import { IconButton, Menu, MenuItem } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";


export default function ChatWindow({ channel, socket, token, user }) {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [earliest, setEarliest] = useState(null);
  const [showMembers, setShowMembers] = useState(false); // toggle sidebar
  const [loadingOlder, setLoadingOlder] = useState(false);
  const listRef = useRef();

  useEffect(() => {
    if (!channel) return;
    api.get(`/messages/${channel._id}?limit=30`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const arr = Array.isArray(res.data) ? res.data.reverse() : [];
        setMessages(arr);
        if (arr.length > 0) setEarliest(arr[0].createdAt);
        setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
      })
      .catch(console.error);
  }, [channel._id, token]);

  useEffect(() => {
    if (!socket) return;
    const onNew = msg => {
      if (msg.channel === channel._id) {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
      }
    };
    socket.on("message:new", onNew);
    return () => socket.off("message:new", onNew);
  }, [socket, channel._id]);

  useEffect(() => {
    if (!socket) return;

    const onEdited = (msg) => {
      if (msg.channel !== channel._id) return;
      setMessages(prev => prev.map(p => p._id === msg._id ? msg : p));
    };

    const onDeleted = ({ messageId, channelId }) => {
      if (channelId !== channel._id) return;
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    socket.on("message:edited", onEdited);
    socket.on("message:deleted", onDeleted);

    return () => {
      socket.off("message:edited", onEdited);
      socket.off("message:deleted", onDeleted);
    };
  }, [socket, channel._id]);

  useEffect(() => {
    if (!socket) return;

    const onStart = ({ userId, name, channelId }) => {
      if (channelId !== channel._id) return;
      setTypingUsers(prev => prev.some(u => u.userId === userId) ? prev : [...prev, { userId, name }]);
    };
    const onStop = ({ userId, channelId }) => {
      if (channelId !== channel._id) return;
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    };

    socket.on("typing:start", onStart);
    socket.on("typing:stop", onStop);
    return () => {
      socket.off("typing:start", onStart);
      socket.off("typing:stop", onStop);
    };
  }, [socket, channel._id]);

  const doSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      const res = await api.get(`/messages/search?channelId=${channel._id}&q=${encodeURIComponent(searchTerm)}&limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      const msgs = Array.isArray(res.data) ? res.data.reverse() : [];
      setMessages(msgs);
      if (msgs.length > 0) setEarliest(msgs[0].createdAt);
      setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
    } catch (err) {
      console.error(err);
    }
  };

  const loadOlder = async () => {
    if (!earliest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await api.get(`/messages/${channel._id}?limit=20&before=${encodeURIComponent(earliest)}`, { headers: { Authorization: `Bearer ${token}` } });
      const newMsgs = res.data || [];
      if (newMsgs.length > 0) {
        setMessages(prev => [...newMsgs.reverse(), ...prev]);
        setEarliest(newMsgs[newMsgs.length - 1].createdAt);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const startEdit = (messageId, currentContent) => {
    setMessages(prev => prev.map(m => m._id === messageId ? { ...m, _editing: true, _editValue: currentContent } : m));
  };

  const cancelEdit = (messageId) => {
    setMessages(prev => prev.map(m => m._id === messageId ? { ...m, _editing: false, _editValue: undefined } : m));
  };

  const submitEdit = (messageId, newText) => {
    if (!socket) return;
    socket.emit("editMessage", { messageId, newContent: newText });
    setMessages(prev => prev.map(m => m._id === messageId ? { ...m, _editing: false } : m));
  };

  const confirmAndDelete = (messageId) => {
    if (!socket) return;
    if (!window.confirm("Delete this message?")) return;
    socket.emit("deleteMessage", { messageId });
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Paper sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6">{channel.name}</Typography>
        <Button variant="outlined" size="small" onClick={() => setShowMembers(prev => !prev)}>
          {showMembers ? "Hide Members" : "Show Members"}
        </Button>
      </Paper>

      {showMembers && (
        <Box sx={{ p: 1, mb: 1, display: "flex", gap: 1 }}>
          <Box sx={{ width: 260 }}>
            <ChannelMembers channelId={channel._id} token={token} />
          </Box>
          <Box sx={{ width: 240 }}>
            <OnlineUsers socket={socket} />
          </Box>
        </Box>
      )}

      <Box sx={{ p: 2, display: "flex", gap: 1 }}>
        <TextField
          size="small"
          placeholder="Search messages..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          fullWidth
        />
        <Button variant="contained" onClick={doSearch}>Search</Button>
      </Box>

      <Divider />

      <Box ref={listRef} sx={{ overflowY: "auto", flex: 1, p: 2 }}>
        <Box sx={{ mb: 1 }}>
          <Button onClick={loadOlder} size="small" variant="outlined" disabled={!earliest || loadingOlder}>
            {loadingOlder ? "Loading..." : "Load older messages"}
          </Button>
        </Box>

        {messages.map(m => {
          const mine = (user._id || user.id) === (m.sender?._id || m.sender?.id || m.sender);
          return (
            <Box key={m._id} sx={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", mb: 1 }}>
              <Box sx={{
                maxWidth: "70%",
                p: 1.2,
                borderRadius: 2,
                bgcolor: mine ? "primary.main" : "grey.100",
                color: mine ? "white" : "text.primary",
                boxShadow: 1,
                position: "relative"
              }}>
                <Typography variant="body2" sx={{ fontWeight: "600" }}>{mine ? "You" : m.sender?.name}</Typography>

                {m._editing ? (
                  <Box>
                    <TextField
                      size="small"
                      fullWidth
                      value={m._editValue || ""}
                      onChange={e => setMessages(prev => prev.map(p => p._id === m._id ? { ...p, _editValue: e.target.value } : p))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          submitEdit(m._id, m._editValue);
                        } else if (e.key === "Escape") {
                          cancelEdit(m._id);
                        }
                      }}
                    />
                    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                      <Button size="small" variant="contained" onClick={() => submitEdit(m._id, m._editValue)}>Save</Button>
                      <Button size="small" variant="contained" onClick={() => cancelEdit(m._id)}>Cancel</Button>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body1">{m.content}</Typography>
                )}

                <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                  {new Date(m.createdAt).toLocaleTimeString()} {m.edited ? "• edited" : ""}
                </Typography>



                {mine && !m._editing && (
                  <Box sx={{ position: "absolute", top: 4, right: 6 }}>
                    <IconButton
                      size="small"
                      onClick={(e) =>
                        setMessages(prev =>
                          prev.map(p => p._id === m._id ? { ...p, _menuAnchor: e.currentTarget } : p)
                        )
                      }
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>

                    <Menu
                      anchorEl={m._menuAnchor}
                      open={Boolean(m._menuAnchor)}
                      onClose={() =>
                        setMessages(prev =>
                          prev.map(p =>
                            p._id === m._id ? { ...p, _menuAnchor: null } : p
                          )
                        )
                      }
                    >
                      <MenuItem
                        onClick={() => {
                          startEdit(m._id, m.content);
                          setMessages(prev =>
                            prev.map(p =>
                              p._id === m._id ? { ...p, _menuAnchor: null } : p
                            )
                          );
                        }}
                      >
                        Edit
                      </MenuItem>

                      <MenuItem
                        onClick={() => {
                          confirmAndDelete(m._id);
                          setMessages(prev =>
                            prev.map(p =>
                              p._id === m._id ? { ...p, _menuAnchor: null } : p
                            )
                          );
                        }}
                      >
                        Delete
                      </MenuItem>
                    </Menu>
                  </Box>
                )}

              </Box>
            </Box>
          );
        })}
      </Box>

      <Divider />

      {typingUsers.length > 0 && <Box sx={{ px: 2, py: 1, color: "gray" }}>{typingUsers.map(u => u.name).join(", ")} is typing...</Box>}

      <Box sx={{ p: 2 }}>
        <MessageInput socket={socket} channel={channel} user={user} />
      </Box>
    </Box>
  );
}
