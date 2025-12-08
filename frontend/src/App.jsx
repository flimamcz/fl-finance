import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./app/Pages/Login";
import Home from "./app/Pages/Home";
import Profile from "./app/Pages/Profile";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<Home />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;