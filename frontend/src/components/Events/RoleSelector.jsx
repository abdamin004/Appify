import React from 'react';

const AVAILABLE_ROLES = [
  { value: 'Student', label: 'Student' },
  { value: 'Staff', label: 'Staff' },
  { value: 'TA', label: 'TA' },
  { value: 'Professor', label: 'Professor' }
];

function RoleSelector({ selectedRoles = [], onChange, label = "Restrict Event to Specific Roles" }) {
  const toggleRole = (role) => {
    const newSelection = selectedRoles.includes(role)
      ? selectedRoles.filter(r => r !== role)
      : [...selectedRoles, role];
    onChange(newSelection);
  };

  const removeRole = (role) => {
    const newSelection = selectedRoles.filter(r => r !== role);
    onChange(newSelection);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#003366' }}>
        {label}
        <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 400, marginLeft: '8px' }}>
          (Leave empty to allow all roles)
        </span>
      </label>
      
      {/* Selected roles display */}
      {selectedRoles.length > 0 && (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px', 
          marginBottom: '12px',
          padding: '12px',
          background: 'rgba(212, 175, 55, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(212, 175, 55, 0.3)'
        }}>
          {selectedRoles.map(role => (
            <div
              key={role}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'white',
                borderRadius: '6px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                fontSize: '0.9rem'
              }}
            >
              <span style={{ color: '#003366', fontWeight: 500 }}>{role}</span>
              <button
                type="button"
                onClick={() => removeRole(role)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: 0,
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Role checkboxes */}
      <div style={{
        border: '2px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '8px',
        background: 'white',
        padding: '12px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {AVAILABLE_ROLES.map(role => {
            const isSelected = selectedRoles.includes(role.value);
            return (
              <div
                key={role.value}
                onClick={() => toggleRole(role.value)}
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(212, 175, 55, 0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}} // Handled by parent div onClick
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ 
                  fontWeight: isSelected ? 600 : 500, 
                  color: '#003366', 
                  fontSize: '0.95rem' 
                }}>
                  {role.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RoleSelector;

