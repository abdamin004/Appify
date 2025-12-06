import React from 'react';

const Input = ({ label, error, className = '', ...props }) => {
    return (
        <div className="form-control w-full">
            {label && (
                <label className="label">
                    <span className="label-text font-bold text-slate-300">{label}</span>
                </label>
            )}
            <input
                className={`input w-full bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all ${error ? 'input-error' : ''} ${className}`}
                {...props}
            />
            {error && (
                <label className="label">
                    <span className="label-text-alt text-red-500">{error}</span>
                </label>
            )}
        </div>
    );
};

export default Input;
