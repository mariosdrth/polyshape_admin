import { Routes, Route, Navigate } from "react-router-dom";
import { withAuthenticationRequired } from "@auth0/auth0-react";
import LoginPage from "./pages/Login";
import CallbackPage from "./pages/Callback";
import Home from "./pages/Home";
import AutoLogout from "./components/AutoLogout";

const ProtectedHome = withAuthenticationRequired(Home, {
  onRedirecting: () => <p>Checking authentication…</p>,
});

function App() {
  return (
    <>
      <AutoLogout/>
      <Routes>
        <Route path="/" element={<Navigate to="/publications" replace />} />
        <Route path="/publications" element={<ProtectedHome />} />
        <Route path="/projects" element={<ProtectedHome />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/callback" element={<CallbackPage />} />
      </Routes>
    </>
  );
}

export default App;
