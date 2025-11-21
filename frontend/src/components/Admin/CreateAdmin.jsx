import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userService from '../../services/userService';
import { showToast } from '../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from '../../utils/designSystem';

export default function CreateAdmin() {
  const navigate = useNavigate();
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
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: spacing['8xl'], padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', background: colors.bgCard, borderRadius: borderRadius['2xl'], boxShadow: shadows.lg, padding: spacing['3xl'] }}>
          <div style={{ 
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: spacing.xl
          }}>
            <button
              onClick={() => navigate('/Admin')}
              style={{
                ...buttonStyles.back,
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                background: colors.bgCard,
                color: colors.primary,
                borderColor: colors.primary
              }}
              onMouseEnter={(e) => {
                e.target.style.background = colors.accent;
                e.target.style.color = colors.primary;
                e.target.style.borderColor = colors.accent;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = colors.bgCard;
                e.target.style.color = colors.primary;
                e.target.style.borderColor = colors.primary;
              }}
            >
              ← Back
            </button>
            <h2 style={{ 
              color: colors.primary, 
              margin: 0,
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              textAlign: 'center',
              textDecoration: 'underline',
              textDecorationColor: colors.primary,
              textUnderlineOffset: '4px'
            }}>Create Account</h2>
          </div>
          <p style={{
            color: colors.gray500,
            fontSize: typography.fontSize.base,
            marginBottom: spacing['2xl']
          }}>Create a new admin or event office account</p>
          <form onSubmit={submit}>
            <div style={{ marginBottom: spacing.lg }}>
              <label style={{
                display: 'block',
                marginBottom: spacing.sm,
                color: colors.primary,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base
              }}>First name</label>
              <input 
                value={firstName} 
                onChange={e=>setFirstName(e.target.value)} 
                required 
                style={{ ...inputStyles.base }}
              />
            </div>
            <div style={{ marginBottom: spacing.lg }}>
              <label style={{
                display: 'block',
                marginBottom: spacing.sm,
                color: colors.primary,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base
              }}>Last name</label>
              <input 
                value={lastName} 
                onChange={e=>setLastName(e.target.value)} 
                required 
                style={{ ...inputStyles.base }}
              />
            </div>
            <div style={{ marginBottom: spacing.lg }}>
              <label style={{
                display: 'block',
                marginBottom: spacing.sm,
                color: colors.primary,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base
              }}>Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                required 
                style={{ ...inputStyles.base }}
              />
            </div>
            <div style={{ marginBottom: spacing.lg }}>
              <label style={{
                display: 'block',
                marginBottom: spacing.sm,
                color: colors.primary,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base
              }}>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                required 
                style={{ ...inputStyles.base }}
              />
            </div>
            <div style={{ marginBottom: spacing['2xl'] }}>
              <label style={{
                display: 'block',
                marginBottom: spacing.sm,
                color: colors.primary,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base
              }}>Role</label>
              <select 
                value={role} 
                onChange={e=>setRole(e.target.value)} 
                style={{ ...inputStyles.base }}
              >
                <option value="Admin">Admin</option>
                <option value="EventOffice">EventOffice</option>
              </select>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                ...buttonStyles.primary,
                width: '100%',
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
