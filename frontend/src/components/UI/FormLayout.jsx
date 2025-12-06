import React from 'react';
import { useNavigate } from 'react-router-dom';

const FormLayout = ({ title, subtitle, children, backLink, maxWidth = 'max-w-4xl' }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className={`${maxWidth} mx-auto`}>
                {backLink && (
                    <button
                        onClick={() => navigate(backLink)}
                        className="mb-8 flex items-center text-slate-400 hover:text-white transition-colors font-medium group"
                    >
                        <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
                        Back
                    </button>
                )}

                <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700 overflow-hidden">
                    <div className="bg-slate-900/50 p-8 text-white relative overflow-hidden border-b border-slate-700">
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
