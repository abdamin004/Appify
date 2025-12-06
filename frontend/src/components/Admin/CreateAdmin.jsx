import React, { useState } from 'react';
import userService from '../../services/userService';
import { showToast } from '../../utils/toast';

export default function CreateAdmin() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { firstName, lastName, email, password, role };
      const res = await userService.createAdmin(payload);
      showToast.success(res.message || `${role} account created successfully`);
      setFirstName(''); setLastName(''); setEmail(''); setPassword('');
    } catch (err) {
      showToast.error(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Create Account</h2>
          <p className="text-slate-500 mt-2">Create a new admin or event office account</p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold text-slate-700">First Name</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                className="input input-bordered w-full bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500/20"
                placeholder="John"
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold text-slate-700">Last Name</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
                className="input input-bordered w-full bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500/20"
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold text-slate-700">Email Address</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="input input-bordered w-full bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500/20"
              placeholder="john.doe@example.com"
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold text-slate-700">Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="input input-bordered w-full bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500/20"
              placeholder="••••••••"
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold text-slate-700">Role</span>
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="select select-bordered w-full bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500/20"
            >
              <option value="Admin">Admin</option>
              <option value="EventOffice">Event Office</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-none w-full shadow-lg shadow-emerald-500/20 ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
