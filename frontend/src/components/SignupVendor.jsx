import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function SignupVendor() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    companyName: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_BASE}/auth/signup/vendor`, {
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
      setMessage("Signup successful! ✅ Redirecting to login...");
    } catch (error) {
      console.error("Signup error:", error);
      setMessage("Signup failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (message.includes("successful")) {
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    }
  }, [message, navigate]);

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          Vendor Signup
        </h2>
        <p className="text-slate-400">
          Signup now to register your company
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            placeholder="Acme Inc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Business Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            placeholder="contact@company.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>

        {message && (
          <div className={`p-4 rounded-xl text-center text-sm font-medium ${message.includes("failed") ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
            {message}
          </div>
        )}

        <p className="text-center text-slate-400 text-sm mt-4">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors hover:underline"
          >
            Login
          </button>
        </p>
      </form>
    </div>
  );
}

export default SignupVendor;