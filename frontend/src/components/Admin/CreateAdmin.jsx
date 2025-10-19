import React, { useState } from 'react';
import userService from '../../services/userService';

export default function CreateAdmin() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [message, setMessage] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const payload = { firstName, lastName, email, password, role };
      const res = await userService.createAdmin(payload);
      setMessage({ type: 'success', text: res.message || 'Created' });
      setFirstName(''); setLastName(''); setEmail(''); setPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || JSON.stringify(err) });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: '120px', padding: '120px 40px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 24, background: 'rgba(255,255,255,0.95)', borderRadius: 20, boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}>
      <h2 style={{ color: '#003366', marginTop: 0 }}>Create Admin / EventOffice</h2>
      {message && <div style={{ marginBottom: 12, color: message.type === 'error' ? '#dc2626' : '#065f46' }}>{message.text}</div>}
      <form onSubmit={submit}>
        <div style={{ marginBottom: 10 }}>
          <label>First name</label>
          <input value={firstName} onChange={e=>setFirstName(e.target.value)} required style={{ width: '100%', padding:8 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Last name</label>
          <input value={lastName} onChange={e=>setLastName(e.target.value)} required style={{ width: '100%', padding:8 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={{ width: '100%', padding:8 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required style={{ width: '100%', padding:8 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Role</label>
          <select value={role} onChange={e=>setRole(e.target.value)} style={{ width: '100%', padding:8 }}>
            <option value="Admin">Admin</option>
            <option value="EventOffice">EventOffice</option>
          </select>
        </div>
        <button type="submit" style={{ padding: '10px 16px', background: '#d4af37', color: '#003366', border: 'none', borderRadius: 10, fontWeight: 700 }}>Create</button>
      </form>
        </div>
      </div>
    </div>
  );
}
