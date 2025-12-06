import React from 'react';

const Select = ({ label, options = [], error, className = '', placeholder = 'Select an option', helperText, ...props }) => {
    return (
        <div className="form-control w-full">
            {label && (
                <label className="label">
                    <span className="label-text font-bold text-slate-700">{label}</span>
                </label>
            )}
            <select
                className={`select w-full bg-white border border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all ${error ? 'select-error' : ''} ${className}`}
                {...props}
            >
                <option value="" disabled>{placeholder}</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {helperText && (
                <label className="label">
                    <span className="label-text-alt text-slate-500">{helperText}</span>
                </label>
            )}
            {error && (
                <label className="label">
                    <span className="label-text-alt text-red-500">{error}</span>
                </label>
            )}
        </div>
    );
};

export default Select;
