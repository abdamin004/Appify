import React, { useState, useEffect } from "react";

function SignupStudent() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "",
    studentStaffId: "",
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

    if (formData.role === "student" && !formData.email.endsWith("@student.guc.edu.eg")) {
      setMessage("Student email must end with @student.guc.edu.eg");
      return;
    }
    if (formData.role !== "student" && !formData.email.endsWith("@guc.edu.eg")) {
      setMessage("Staff/TA/Professor email must end with @guc.edu.eg");
      return;
    }

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
      console.log("Signup response:", data);
      setMessage("Signup successful! ✅");
    } catch (error) {
      console.error("Signup error:", error);
      setMessage("Signup failed: " + error.message);
    }
  };

  useEffect(() => {
    if (message === "Signup successful! ✅") {
      setTimeout(() => {
        window.location.href = "/chooserolepage";
      }, 1000);
    }
  }, [message]);

  return (
    <div style={{
      maxWidth: '500px',
      margin: '0 auto',
      padding: '30px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          color: '#003366', 
          marginBottom: '10px' 
        }}>
          Student Signup
        </h2>
        <p style={{ fontSize: '1rem', color: '#6b7280' }}>
          Register now to get started
        </p>
      </div>

      <div>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>
              <span style={spanStyle}>First Name</span>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={labelStyle}>
              <span style={spanStyle}>Last Name</span>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div style={labelStyle}>
          <span style={spanStyle}>Email</span>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div style={labelStyle}>
          <span style={spanStyle}>Password</span>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <div style={labelStyle}>
          <span style={spanStyle}>Role</span>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="">Select Role</option>
            <option value="student">Student</option>
            <option value="ta">TA</option>
            <option value="professor">Professor</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        <div style={labelStyle}>
          <span style={spanStyle}>Student / Staff ID</span>
          <input
            type="text"
            name="studentStaffId"
            value={formData.studentStaffId}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        <button 
          onClick={handleSubmit}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(212, 175, 55, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.3)';
          }}
        >
          Submit
        </button>

        {message && (
          <p
            style={{
              marginTop: "15px",
              color: message.includes("failed") ? "#dc2626" : "#d4af37",
              textAlign: "center",
              fontWeight: '500'
            }}
          >
            {message}
          </p>
        )}

        <p style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '0.95rem',
          color: '#6b7280'
        }}>
          Already have an account?{" "}
          <a href="/signin" style={{
            color: '#d4af37',
            fontWeight: '600',
            textDecoration: 'none'
          }}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  marginBottom: '20px'
};

const spanStyle = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '0.9rem',
  fontWeight: '600',
  color: '#003366'
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  border: '2px solid #e5e7eb',
  borderRadius: '10px',
  fontSize: '1rem',
  outline: 'none',
  transition: 'all 0.2s',
  backgroundColor: 'white',
  boxSizing: 'border-box'
};

const buttonStyle = {
  width: '100%',
  padding: '14px',
  background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
  color: '#003366',
  border: 'none',
  borderRadius: '10px',
  fontSize: '1.05rem',
  fontWeight: '700',
  cursor: 'pointer',
  transition: 'all 0.3s',
  boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
  marginTop: '10px'
};

export default SignupStudent;