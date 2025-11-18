import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    status: "draft",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { user } = useAuth();

  // Redirect readers to home page
  if (user?.role === "reader") {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchUserPosts();
  }, []);

  const fetchUserPosts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/posts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter posts by current user (for authors) or get all (for admin)
      const userPosts =
        user.role === "admin"
          ? response.data.data.posts
          : response.data.data.posts.filter(
              (post) => post.author._id === user.id
            );
      setPosts(userPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post("/api/posts", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage(response.data.message);

      if (response.data.status === "success") {
        setFormData({ title: "", content: "", status: "draft" });
        setShowForm(false);
        fetchUserPosts();
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPosts(posts.filter((post) => post._id !== postId));
      setMessage("Post deleted successfully");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete post");
    }
  };

  const updatePostStatus = async (postId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/posts/${postId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPosts(
        posts.map((post) =>
          post._id === postId ? { ...post, status: newStatus } : post
        )
      );
      setMessage("Post status updated successfully");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update post");
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome to Your Dashboard, {user.username}!</h1>
        <p>
          Role:{" "}
          <span className="user-role" style={{ display: "inline-block" }}>
            {user.role}
          </span>
        </p>
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

      {(user.role === "admin" || user.role === "author") && (
        <>
          <div className="dashboard-actions">
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn btn-primary"
            >
              {showForm ? "Cancel" : "Create New Post"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="post-form">
              <h3>Create New Blog Post</h3>

              <div className="form-group">
                <label>Title:</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Enter post title"
                />
              </div>

              <div className="form-group">
                <label>Content:</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  required
                  rows="6"
                  placeholder="Write your blog post content..."
                />
              </div>

              <div className="form-group">
                <label>Status:</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Publish</option>
                </select>
              </div>

              <button type="submit" disabled={loading}>
                {loading ? "Creating Post..." : "Create Post"}
              </button>
            </form>
          )}
        </>
      )}

      <div className="user-posts">
        <h3>{user.role === "admin" ? "All Posts" : "Your Posts"}</h3>

        {posts.length > 0 ? (
          <div className="posts-list">
            {posts.map((post) => (
              <div key={post._id} className="post-item">
                <div className="post-info">
                  <h4>{post.title}</h4>
                  <div className="post-meta">
                    Status: <strong>{post.status}</strong> • Created:{" "}
                    {new Date(post.createdAt).toLocaleDateString()} •
                    {user.role === "admin" &&
                      ` Author: ${post.author.username}`}
                  </div>
                </div>

                <div className="post-actions">
                  <select
                    value={post.status}
                    onChange={(e) => updatePostStatus(post._id, e.target.value)}
                    className="btn btn-secondary"
                    style={{ padding: "0.5rem", marginRight: "0.5rem" }}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>

                  <button
                    onClick={() => deletePost(post._id)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No posts yet. Create your first post!</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
