import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const OTPVerification = () => {
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "otp") {
      // Only allow numbers and limit to 6 digits
      const numericValue = value.replace(/\D/g, "").slice(0, 6);
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post("/api/auth/verify-otp", formData);

      setMessage(response.data.message);

      if (response.data.status === "success") {
        login(response.data.user, response.data.token);
        setTimeout(() => {
          if (response.data.user.role === "admin") {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        }, 2000);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Verify Your Account</h2>

        {message && (
          <div
            className={`message ${
              message.includes("success") ? "success" : "error"
            }`}
          >
            {message}
          </div>
        )}

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Enter the email you registered with"
          />
        </div>

        <div className="form-group">
          <label>OTP Code:</label>
          <input
            type="text"
            name="otp"
            value={formData.otp}
            onChange={handleChange}
            required
            placeholder="Enter 6-digit OTP"
            maxLength="6"
            pattern="\d{6}"
          />
          <small style={{ color: "#666", fontSize: "12px" }}>
            Check your email for the 6-digit verification code
          </small>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify Account"}
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: "1rem",
            fontSize: "14px",
            color: "#666",
          }}
        >
          Didn't receive the code? Check your spam folder or try registering
          again.
        </p>
      </form>
    </div>
  );
};

export default OTPVerification;
