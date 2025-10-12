import React, { useState } from "react";
import "./Form.css"; // Optional for the Uiverse styling
import { useNavigate } from "react-router-dom";

function SignupStaff() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "",
    staffId: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Staff Signup Data:", formData);
    alert("Form submitted! Check console.");

    try {
      const response = await fetch("http://localhost:5001/api/auth/signup/user", {
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
      setMessage("Signup successful! ✅");
    } catch (error) {
      console.error("Signup error:", error);
      setMessage("Signup failed: " + error.message);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <p className="title">Staff / TA / Professor Signup</p>
      <p className="message">Register now to access your staff portal.</p>

      <div className="flex">
        <label>
          <input
            required
            type="text"
            className="input"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
          />
          <span>First Name</span>
        </label>

        <label>
          <input
            required
            type="text"
            className="input"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
          />
          <span>Last Name</span>
        </label>
      </div>

      <label>
        <input
          required
          type="email"
          className="input"
          name="email"
          value={formData.email}
          onChange={handleChange}
        />
        <span>GUC Email</span>
      </label>

      <label>
        <input
          required
          type="password"
          className="input"
          name="password"
          value={formData.password}
          onChange={handleChange}
        />
        <span>Password</span>
      </label>

      <label>
        <input
          required
          type="text"
          className="input"
          name="role"
          value={formData.role}
          onChange={handleChange}
        />
        <span>Role</span>
      </label>

      <label>
        <input
          required
          type="text"
          className="input"
          name="staffId"
          value={formData.staffId}
          onChange={handleChange}
        />
        <span>Staff ID</span>
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

export default SignupStaff;
