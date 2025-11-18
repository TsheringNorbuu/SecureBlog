import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import OTPVerification from "./components/OTPVerification";
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";
import Blog from "./components/Blog";
import Navbar from "./components/Navbar";
import { AuthProvider, useAuth } from "./context/AuthContext";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<Blog />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<OTPVerification />} />
            <Route
              path="/dashboard"
              element={
                <AuthorRoute>
                  <Dashboard />
                </AuthorRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Protected route for any authenticated user
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;

  return user ? children : <Navigate to="/login" />;
};

// Route for authors and admins only (no readers)
const AuthorRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;

  if (!user) return <Navigate to="/login" />;

  // Allow only admin and author roles
  return user.role === "admin" || user.role === "author" ? (
    children
  ) : (
    <Navigate to="/" />
  );
};

// Route for admins only
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;

  return user && user.role === "admin" ? children : <Navigate to="/" />;
};

export default App;
