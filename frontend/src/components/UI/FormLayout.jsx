import React from 'react';
import { useNavigate } from 'react-router-dom';

const FormLayout = ({ title, subtitle, children, backLink, maxWidth = 'max-w-4xl' }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-base-200 py-12 px-4 sm:px-6 lg:px-8">
            <div className={`${maxWidth} mx-auto`}>
                {backLink && (
                    <button
                        onClick={() => navigate(backLink)}
                        className="mb-8 flex items-center text-base-content/70 hover:text-base-content transition-colors font-medium group"
                    >
                        <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
                        Back
                    </button>
                )}

                <div className="bg-base-100 rounded-2xl shadow-xl border border-base-300 overflow-hidden">
                    <div className="bg-emerald-900 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                        <div className="relative z-10">
                            <h1 className="text-3xl font-bold mb-2">{title}</h1>
                            {subtitle && <p className="text-slate-300 text-lg">{subtitle}</p>}
                        </div>
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
