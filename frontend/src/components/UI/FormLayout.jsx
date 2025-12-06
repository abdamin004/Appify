import React from 'react';
import { useNavigate } from 'react-router-dom';

const FormLayout = ({ title, subtitle, children, backLink, maxWidth = 'max-w-4xl' }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className={`${maxWidth} mx-auto`}>
                {backLink && (
                    <button
                        onClick={() => navigate(backLink)}
                        className="mb-8 flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium group"
                    >
                        <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
                        Back
                    </button>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-8 text-center border-b border-slate-100">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
                        {subtitle && <p className="text-slate-500 text-lg">{subtitle}</p>}
                    </div>

                    <div className="p-8 lg:p-10">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormLayout;
