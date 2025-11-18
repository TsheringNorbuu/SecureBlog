import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [usersRes, postsRes, statsRes] = await Promise.all([
        axios.get("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("/api/admin/posts", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("/api/admin/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setUsers(usersRes.data.data.users);
      setPosts(postsRes.data.data.posts);
      setStats(statsRes.data.data.stats);
    } catch (error) {
      setMessage(error.response?.data?.message || "Error fetching admin data");
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `/api/admin/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(
        users.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
      setMessage("User role updated successfully");
    } catch (error) {
      setMessage(error.response?.data?.message || "Error updating user role");
    }
  };

  const deleteUser = async (userId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    )
      return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter((u) => u._id !== userId));
      setMessage("User deleted successfully");
    } catch (error) {
      setMessage(error.response?.data?.message || "Error deleting user");
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(posts.filter((p) => p._id !== postId));
      setMessage("Post deleted successfully");
    } catch (error) {
      setMessage(error.response?.data?.message || "Error deleting post");
    }
  };

  const togglePostStatus = async (postId, currentStatus) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/posts/${postId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts(
        posts.map((p) => (p._id === postId ? { ...p, status: newStatus } : p))
      );
      setMessage(
        `Post ${
          newStatus === "published" ? "published" : "unpublished"
        } successfully`
      );
    } catch (error) {
      setMessage(error.response?.data?.message || "Error updating post status");
    }
  };

  if (loading) return <div className="loading">Loading admin panel...</div>;

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome, {user.username}! Manage your blog platform.</p>
      </div>

      {message && (
        <div
          className={`message ${
            message.includes("success") ? "success" : "error"
          }`}
        >
          {message}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`tab-button ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Users
        </button>
        <button
          className={`tab-button ${activeTab === "posts" ? "active" : ""}`}
          onClick={() => setActiveTab("posts")}
        >
          Posts
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="tab-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-info">
                <h3>Total Users</h3>
                <p className="stat-number">{stats.totalUsers || 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Total Posts</h3>
                <p className="stat-number">{stats.totalPosts || 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Published</h3>
                <p className="stat-number">{stats.publishedPosts || 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Drafts</h3>
                <p className="stat-number">{stats.draftPosts || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="tab-content">
          <div className="section-header">
            <h2>User Management</h2>
            <p>Manage user roles and permissions</p>
          </div>

          {users.length > 0 ? (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem) => (
                    <tr key={userItem._id || userItem.id}>
                      <td>{userItem.username}</td>
                      <td>{userItem.email}</td>
                      <td>{userItem.role}</td>
                      <td>{userItem.isVerified ? "Verified" : "Pending"}</td>
                      <td>
                        {new Date(userItem.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <select
                          value={userItem.role}
                          onChange={(e) =>
                            updateUserRole(
                              userItem._id || userItem.id,
                              e.target.value
                            )
                          }
                        >
                          <option value="reader">Reader</option>
                          <option value="author">Author</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() =>
                            deleteUser(userItem._id || userItem.id)
                          }
                          disabled={userItem._id === user.id}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No users found.</p>
          )}
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === "posts" && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Post Management</h2>
            <p>Manage all blog posts</p>
          </div>

          {posts.length > 0 ? (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post._id || post.id}>
                      <td>{post.title}</td>
                      <td>{post.author?.username || "Unknown"}</td>
                      <td>{post.status}</td>
                      <td>{new Date(post.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() =>
                            togglePostStatus(post._id || post.id, post.status)
                          }
                        >
                          {post.status === "published"
                            ? "Unpublish"
                            : "Publish"}
                        </button>
                        <button onClick={() => deletePost(post._id || post.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No posts found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
