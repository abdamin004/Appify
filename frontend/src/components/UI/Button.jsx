import React from 'react';

const Button = ({ children, variant = 'primary', size = 'md', loading = false, className = '', ...props }) => {
    const variants = {
        primary: 'bg-emerald-600 hover:bg-emerald-700 text-white border-none',
        secondary: 'btn-secondary',
        accent: 'btn-accent',
        ghost: 'btn-ghost',
        link: 'btn-link',
        outline: 'btn-outline',
        error: 'btn-error',
        success: 'btn-success',
        warning: 'btn-warning',
        info: 'btn-info',
    };

    const sizes = {
        lg: 'btn-lg',
        md: 'btn-md',
        sm: 'btn-sm',
        xs: 'btn-xs',
    };

    return (
        <button
            className={`btn ${variants[variant] || 'btn-primary'} ${sizes[size] || 'btn-md'} ${loading ? 'loading' : ''} ${className}`}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading && <span className="loading loading-spinner"></span>}
            {children}
        </button>
    );
};

export default Button;
