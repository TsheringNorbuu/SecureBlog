import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  FaLock,
  FaEdit,
  FaUsers,
  FaShieldAlt,
  FaCheck,
  FaArrowRight,
} from "react-icons/fa";

const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPosts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPosts = async () => {
    try {
      const response = await axios.get("/api/posts");
      setPosts(response.data.data.posts);
    } catch (error) {
      setError("Failed to load posts");
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (user && loading)
    return <div className="loading">Loading blog posts...</div>;
  if (user && error) return <div className="message error">{error}</div>;

  return (
    <div className="blog-container">
      {user ? (
        // Logged-in user view
        <>
          <div className="blog-header">
            <h1>Secure Blog</h1>
            <p>Welcome to our secure blogging platform</p>
          </div>

          <div className="posts-grid">
            {posts.length > 0 ? (
              posts.map((post) => (
                <article key={post._id} className="post-card">
                  <h3>{post.title}</h3>
                  <div className="post-meta">
                    By {post.author.username} •{" "}
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                  <div className="post-content">
                    {post.content.length > 150
                      ? `${post.content.substring(0, 150)}...`
                      : post.content}
                  </div>
                </article>
              ))
            ) : (
              <div className="no-posts">
                <p>No blog posts available yet.</p>
                <p>Be the first to create one!</p>
              </div>
            )}
          </div>
        </>
      ) : (
        // Public visitor view
        <div className="welcome-container">
          <div className="welcome-hero">
            <div className="hero-content">
              <h1>Welcome to Secure Blog</h1>
              <p className="hero-subtitle">
                A modern, secure blogging platform built with cutting-edge
                security features
              </p>

              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">
                    <FaLock />
                  </div>
                  <h3>Secure Authentication</h3>
                  <p>
                    Advanced OTP verification and password hashing to protect
                    your account
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <FaEdit />
                  </div>
                  <h3>Rich Content</h3>
                  <p>
                    Create and share your thoughts with our intuitive blogging
                    interface
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <FaUsers />
                  </div>
                  <h3>Role-Based Access</h3>
                  <p>
                    Different user roles with appropriate permissions and
                    capabilities
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <FaShieldAlt />
                  </div>
                  <h3>Data Protection</h3>
                  <p>
                    Your data is encrypted and protected with industry-standard
                    security
                  </p>
                </div>
              </div>

              <div className="cta-section">
                <h2>Ready to get started?</h2>
                <p>
                  Join our secure community of bloggers and share your stories
                </p>
                <div className="cta-buttons">
                  <a href="/register" className="btn btn-primary">
                    Create Account{" "}
                    <FaArrowRight style={{ marginLeft: "8px" }} />
                  </a>
                  <a href="/login" className="btn btn-secondary">
                    Sign In
                  </a>
                </div>
              </div>

              <div className="security-features">
                <h3>
                  <FaShieldAlt style={{ marginRight: "10px" }} />
                  Built with Security in Mind
                </h3>
                <ul>
                  <li>
                    <FaCheck className="check-icon" />
                    OTP-based account verification
                  </li>
                  <li>
                    <FaCheck className="check-icon" />
                    bcrypt password hashing
                  </li>
                  <li>
                    <FaCheck className="check-icon" />
                    JWT token authentication
                  </li>
                  <li>
                    <FaCheck className="check-icon" />
                    Input validation & sanitization
                  </li>
                  <li>
                    <FaCheck className="check-icon" />
                    Role-based access control
                  </li>
                  <li>
                    <FaCheck className="check-icon" />
                    Secure session management
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blog;
