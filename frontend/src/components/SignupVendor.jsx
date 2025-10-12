import React, { useState } from "react";
import "./Form.css"; // optional, for styles
import { useNavigate } from "react-router-dom";

function SignupVendor() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    companyName: "",
  });

  const [message, setMessage] = useState("");

  // Update form data as the user types
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5001/api/auth/signup/vendor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Signup failed");
      }

      const data = await response.json();
      console.log("Signup response:", data);
      setMessage("Vendor signup successful! ✅");
    } catch (error) {
      console.error("Signup error:", error);
      setMessage("Signup failed: " + error.message);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <p className="title">Vendor Signup</p>
      <p className="message">Signup now to register your company.</p>

      <label>
        <input
          required
          type="text"
          name="companyName"
          className="input"
          value={formData.companyName}
          onChange={handleChange}
        />
        <span>Company Name</span>
      </label>

      <label>
        <input
          required
          type="email"
          name="email"
          className="input"
          value={formData.email}
          onChange={handleChange}
        />
        <span>Business Email</span>
      </label>

      <label>
        <input
          required
          type="password"
          name="password"
          className="input"
          value={formData.password}
          onChange={handleChange}
        />
        <span>Password</span>
      </label>

      <button className="submit" type="submit">
        Sign Up
      </button>

      {message && (
        <p
          style={{
            marginTop: "15px",
            color: message.includes("failed") ? "red" : "green",
            textAlign: "center",
          }}
        >
          {message}
        </p>
      )}

      <p className="signin">
        Already have an account? <button
          type="button"
          onClick={() => navigate("/Login", { state: { role: "vendor" } })}
          style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer" }}
        >
          Login
        </button>
      </p>
    </form>
  );
}

export default SignupVendor;
