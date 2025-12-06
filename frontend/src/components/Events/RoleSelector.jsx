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
    <div className="mb-5">
      <label className="block mb-2 font-bold text-slate-700">
        {label}
        <span className="text-sm text-slate-500 font-normal ml-2">
          (Leave empty to allow all roles)
        </span>
      </label>

      {/* Selected roles display */}
      {selectedRoles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          {selectedRoles.map(role => (
            <div
              key={role}
              className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-emerald-200 text-sm shadow-sm"
            >
              <span className="text-emerald-700 font-medium">{role}</span>
              <button
                type="button"
                onClick={() => removeRole(role)}
                className="bg-transparent border-none text-emerald-500 hover:text-emerald-700 cursor-pointer text-lg p-0 w-5 h-5 flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Role checkboxes */}
      <div className="border border-slate-300 rounded-xl bg-white p-3">
        <div className="flex flex-col gap-2">
          {AVAILABLE_ROLES.map(role => {
            const isSelected = selectedRoles.includes(role.value);
            return (
              <div
                key={role.value}
                onClick={() => toggleRole(role.value)}
                className={`
                  p-3 cursor-pointer rounded-lg flex items-center gap-3 transition-all
                  ${isSelected ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50 border border-transparent'}
                `}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => { }} // Handled by parent div onClick
                  className="checkbox checkbox-sm checkbox-primary border-slate-300"
                />
                <span className={`text-sm ${isSelected ? 'font-bold text-emerald-700' : 'font-medium text-slate-700'}`}>
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

