import React, { useState, useEffect } from 'react';
import { listUsers } from '../../services/userService';

function UserSelector({ selectedUserIds = [], onChange, label = "Restrict to Specific Users" }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await listUsers();
      const usersList = response.users || response || [];
      setUsers(Array.isArray(usersList) ? usersList : []);
    } catch (err) {
      console.error('Error loading users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const toggleUser = (userId) => {
    const userIdStr = String(userId);
    const newSelection = selectedUserIds.includes(userIdStr)
      ? selectedUserIds.filter(id => id !== userIdStr)
      : [...selectedUserIds, userIdStr];
    onChange(newSelection);
  };

  const removeUser = (userId) => {
    const newSelection = selectedUserIds.filter(id => id !== String(userId));
    onChange(newSelection);
  };

  const selectedUsers = users.filter(u => selectedUserIds.includes(String(u._id || u.id)));

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#003366' }}>
        {label}
        <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 400, marginLeft: '8px' }}>
          (Leave empty to allow all users)
        </span>
      </label>
      
      {/* Selected users display */}
      {selectedUsers.length > 0 && (
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
          {selectedUsers.map(user => {
            const userId = String(user._id || user.id);
            const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown';
            return (
              <div
                key={userId}
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
                <span style={{ color: '#003366', fontWeight: 500 }}>{name}</span>
                <button
                  type="button"
                  onClick={() => removeUser(userId)}
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
            );
          })}
        </div>
      )}

      {/* Dropdown toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px',
          background: isOpen ? 'rgba(212, 175, 55, 0.15)' : 'white',
          border: '2px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '8px',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '0.95rem',
          color: '#003366',
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>{isOpen ? 'Hide User List' : 'Select Users to Restrict Event To'}</span>
        <span style={{ fontSize: '1.2rem' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* User list dropdown */}
      {isOpen && (
        <div style={{
          marginTop: '8px',
          border: '2px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '8px',
          background: 'white',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {/* Search input */}
          <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* User list */}
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              {searchTerm ? 'No users found matching your search.' : 'No users available.'}
            </div>
          ) : (
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {filteredUsers.map(user => {
                const userId = String(user._id || user.id);
                const isSelected = selectedUserIds.includes(userId);
                const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown';
                const email = user.email || '';
                const role = user.role || '';

                return (
                  <div
                    key={userId}
                    onClick={() => toggleUser(userId)}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                      borderBottom: '1px solid #f3f4f6',
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
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#003366', fontSize: '0.95rem' }}>
                        {name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        {email} {role && `• ${role}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserSelector;

