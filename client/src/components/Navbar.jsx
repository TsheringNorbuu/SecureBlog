import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Don't render navbar if user is not logged in
  if (!user) {
    return null;
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Secure Blog
      </Link>

      <ul className="navbar-nav">
        <li>
          <Link to="/">Home</Link>
        </li>

        {/* Show Dashboard only for authors and admins, not readers */}
        {(user.role === "admin" || user.role === "author") && (
          <li>
            <Link to="/dashboard">Dashboard</Link>
          </li>
        )}

        {user.role === "admin" && (
          <li>
            <Link to="/admin">Admin Panel</Link>
          </li>
        )}

        <li className="user-info">
          <span>Welcome, {user.username}</span>
          <span className="user-role">{user.role}</span>
          <button onClick={handleLogout}>Logout</button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
