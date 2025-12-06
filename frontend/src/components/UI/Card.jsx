import React from 'react';

const Card = ({ children, title, className = '', actions, ...props }) => {
    return (
        <div className={`card bg-base-100 shadow-xl border border-slate-200 ${className}`} {...props}>
            <div className="card-body">
                {title && <h2 className="card-title text-slate-800 mb-4">{title}</h2>}
                {children}
                {actions && <div className="card-actions justify-end mt-4">{actions}</div>}
            </div>
        </div>
    );
};

export default Card;
