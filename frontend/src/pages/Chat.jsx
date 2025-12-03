import React, { useContext, useEffect, useState, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { api, API_BASE } from "../api";
import ChannelList from "../components/ChannelList";
import ChatWindow from "../components/ChatWindow";
import { io } from "socket.io-client";
import { Box, AppBar, Toolbar, Typography, IconButton } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";

let socket; // single socket for the app

export default function Chat() {
  const { token, user, logout } = useContext(AuthContext);
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const presenceRef = useRef([]);

  useEffect(() => {
    // create socket once
    socket = io(API_BASE, { transports: ["websocket", "polling"], autoConnect: true });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    // fetch channels (include token)
    if (!token) return;
    api.get("/channels", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setChannels(res.data))
      .catch(err => console.error(err));
  }, [token]);

  // authenticate socket after user is loaded
  useEffect(() => {
    if (!socket || !user) return;
    // We send user id and name; channels array will be updated on channel load/join
    socket.emit("authenticate", { userId: user.id || user._id || user.id, name: user.name, channels: [] });
    socket.on("presence:update", (list) => {
      presenceRef.current = list;
    });
    // listen for new messages globally (ChatWindow also listens specific events)
    return () => {
      socket.off("presence:update");
    };
  }, [user]);

  // create channel helper to update list
  const addChannelToList = (ch) => setChannels(prev => [ch, ...prev]);

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static">
        <Toolbar>
          <Typography sx={{ flex: 1 }}>Mini Team Chat</Typography>
          <Typography sx={{ mr: 2 }}>{user?.name}</Typography>
          <IconButton color="inherit" onClick={() => { logout(); }}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flex: 1 }}>
        <ChannelList
          channels={channels}
          currentChannel={currentChannel}
          setCurrentChannel={(ch) => {
            setCurrentChannel(ch);
            // notify server: join the channel room
            if (socket && ch) socket.emit("joinChannel", ch._id);
          }}
          token={token}
          onCreated={addChannelToList}
        />

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
