import React, { useState, useEffect } from "react";
import "./Form.css"; // Import Uiverse-style CSS
import { useNavigate } from "react-router-dom";

function SignupStudent() {
  const navigate = useNavigate();
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

    // ✅ Role-based email validation
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

  // Redirect to chooserolepage after successful signup
  useEffect(() => {
    if (message === "Signup successful! ✅") {
      setTimeout(() => {
        window.location.href = "/chooserolepage";
      }, 1000); // wait 1s to show success message
    }
  }, [message]);

  return (
    <form className="form" onSubmit={handleSubmit}>
      <p className="title">Student Signup</p>
      <p className="message">Register now to get started:</p>

      <div className="flex">
        <label>
          <input
            className="input"
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            placeholder=""
          />
          <span>First Name</span>
        </label>

        <label>
          <input
            className="input"
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            placeholder=""
          />
          <span>Last Name</span>
        </label>
      </div>

      <label>
        <input
          className="input"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder=""
        />
        <span>Email</span>
      </label>

      <label>
        <input
          className="input"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          placeholder=""
        />
        <span>Password</span>
      </label>

      <label>
        <select
          className="input"
          name="role"
          value={formData.role}
          onChange={handleChange}
          required
        >
          <option value="">Select Role</option>
          <option value="student">Student</option>
          <option value="ta">TA</option>
          <option value="professor">Professor</option>
          <option value="staff">Staff</option>
        </select>
        <span>Role</span>
      </label>

      <label>
        <input
          className="input"
          type="text"
          name="studentStaffId"
          value={formData.studentStaffId}
          onChange={handleChange}
          required
          placeholder=""
        />
        <span>Student / Staff ID</span>
      </label>

      <button className="submit" type="submit">
        Submit
      </button>

      {message && (
        <p
          style={{
            marginTop: "10px",
            color: message.includes("failed") ? "red" : "#00bfff",
            textAlign: "center",
          }}
        >
          {message}
        </p>
      )}

      {/* ✅ Sign in link (same style as Vendor & Staff pages) */}
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

export default SignupStudent;
