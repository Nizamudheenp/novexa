import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import Login from "./pages/Login.jsx";
import Chat from "./pages/Chat.jsx";
import Register from "./pages/Register.jsx"
export default function App() {
  const { user } = useContext(AuthContext);
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={user ? <Chat /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}