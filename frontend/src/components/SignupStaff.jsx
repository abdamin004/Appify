import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function SignupStaff() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "Professor", // default
    staffId: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/auth/signup/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Signup failed");
      }

      const data = await response.json();

      localStorage.setItem(
        "user",
        JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role: formData.role.toLowerCase(),
          token: data.token,
        })
      );

      setMessage("Signup successful! ✅");
    } catch (error) {
      setMessage("Signup failed: " + error.message);
    }
  };

  useEffect(() => {
    if (message === "Signup successful! ✅") {
      setTimeout(() => {
        navigate("/Dashboard");
      }, 1000);
    }
  }, [message, navigate]);

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", padding: "30px" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: "bold", color: "#003366", marginBottom: "10px" }}>
          Staff / TA / Professor Signup
        </h2>
        <p style={{ fontSize: "1rem", color: "#6b7280" }}>Register now to access your staff portal</p>
      </div>

      {/* Form */}
      <div>
        {/* First & Last Name */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>
              <span style={spanStyle}>First Name</span>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required style={inputStyle} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>
              <span style={spanStyle}>Last Name</span>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Email */}
        <div style={labelStyle}>
          <span style={spanStyle}>GUC Email</span>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required style={inputStyle} />
        </div>

        {/* Password */}
        <div style={labelStyle}>
          <span style={spanStyle}>Password</span>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required style={inputStyle} />
        </div>

        {/* Role Dropdown */}
        <div style={labelStyle}>
          <span style={spanStyle}>Role</span>
          <select name="role" value={formData.role} onChange={handleChange} required style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
            <option value="Professor">Professor</option>
            <option value="TA">TA</option>
            <option value="EventOffice">Event Office</option>
            <option value="Vendor">Vendor</option>
          </select>
        </div>

        {/* Staff ID */}
        <div style={labelStyle}>
          <span style={spanStyle}>Staff ID</span>
          <input type="text" name="staffId" value={formData.staffId} onChange={handleChange} required style={inputStyle} />
        </div>

        {/* Submit Button */}
        <button onClick={handleSubmit} style={buttonStyle} onMouseEnter={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 6px 20px rgba(212, 175, 55, 0.5)"; }} onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 12px rgba(212, 175, 55, 0.3)"; }}>
          Sign Up
        </button>

        {message && <p style={{ marginTop: "15px", color: message.includes("failed") ? "#dc2626" : "#d4af37", textAlign: "center", fontWeight: "500" }}>{message}</p>}

        <p style={{ marginTop: "20px", textAlign: "center", fontSize: "0.95rem", color: "#6b7280" }}>
          Already have an account?{" "}
          <a onClick={() => navigate("/login")} style={{ color: "#d4af37", fontWeight: "600", textDecoration: "none" }}>Login</a>
        </p>
      </div>
    </div>
  );
}

const labelStyle = { display: "block", marginBottom: "20px" };
const spanStyle = { display: "block", marginBottom: "8px", fontSize: "0.9rem", fontWeight: "600", color: "#003366" };
const inputStyle = { width: "100%", padding: "12px 16px", border: "2px solid #e5e7eb", borderRadius: "10px", fontSize: "1rem", outline: "none", transition: "all 0.2s", backgroundColor: "white", boxSizing: "border-box" };
const buttonStyle = { width: "100%", padding: "14px", background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)", color: "#003366", border: "none", borderRadius: "10px", fontSize: "1.05rem", fontWeight: "700", cursor: "pointer", transition: "all 0.3s", boxShadow: "0 4px 12px rgba(212, 175, 55, 0.3)", marginTop: "10px" };

export default SignupStaff;
