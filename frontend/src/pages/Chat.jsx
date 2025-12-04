import React, { useContext, useEffect, useState, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { api, API_BASE } from "../api";
import ChannelList from "../components/ChannelList";
import { io } from "socket.io-client";

import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  useMediaQuery
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import ChatWindow from "../components/ChatWindow";

let socket;

export default function Chat() {
  const { token, user, logout } = useContext(AuthContext);
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const presenceRef = useRef([]);

  const [mobileOpen, setMobileOpen] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");

  const toggleDrawer = () => setMobileOpen(!mobileOpen);

  const fetchChannels = () => {
    if (!token) return;
    api.get("/channels", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setChannels(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    socket = io(API_BASE, { transports: ["websocket", "polling"], autoConnect: true });
    return () => socket?.disconnect();
  }, []);

  useEffect(() => {
    if (token) fetchChannels();
  }, [token]);

  useEffect(() => {
    if (!socket || !user) return;
    socket.emit("authenticate", { userId: user._id || user.id, name: user.name });

    socket.on("presence:update", (list) => {
      presenceRef.current = list;
    });

    return () => socket.off("presence:update");
  }, [user]);

  const addChannelToList = (ch) => setChannels(prev => [ch, ...prev]);

  const Sidebar = (
    <ChannelList
      channels={channels}
      currentChannel={currentChannel}
      setCurrentChannel={(ch) => {
        setCurrentChannel(ch);
        if (socket && ch) socket.emit("joinChannel", ch._id);

        if (isMobile) setMobileOpen(false);
      }}
      token={token}
      onCreated={addChannelToList}
      refreshChannels={fetchChannels}
      user={user}
    />
  );

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" onClick={toggleDrawer} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}

          <Typography sx={{ flex: 1 }}>Mini Team Chat</Typography>
          <Typography sx={{ mr: 2 }}>{user?.name}</Typography>

          <IconButton color="inherit" onClick={logout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flex: 1 }}>
        {!isMobile && (
          <Box sx={{ width: 300, borderRight: "1px solid #ddd" }}>
            {Sidebar}
          </Box>
        )}

        {isMobile && (
          <Drawer
            open={mobileOpen}
            onClose={toggleDrawer}
            PaperProps={{ sx: { width: 280 } }}
          >
            {Sidebar}
          </Drawer>
        )}

        <Box sx={{ flex: 1 }}>
          {currentChannel ? (
            <ChatWindow
              channel={currentChannel}
              socket={socket}
              token={token}
              user={user}
            />
          ) : (
            <Box sx={{ p: 4 }}>Select a channel to start chatting</Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
