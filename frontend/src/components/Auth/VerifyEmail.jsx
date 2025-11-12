import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('pending'); // 'pending' | 'success' | 'error'
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function verify() {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing.');
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/verify/${token}`,
          { signal: controller.signal }
        );
        const data = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully. Redirecting to login...');
          setTimeout(() => {
            if (!cancelled) {
              navigate('/Login');
            }
          }, 2500);
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification link is invalid or has expired.');
        }
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setMessage(error.message || 'Unable to verify your email. Please try again later.');
      }
    }

    verify();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, navigate]);

  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fb',
        padding: '2rem'
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: '#fff',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.1)',
          textAlign: 'center',
          borderTop: isSuccess ? '4px solid #16a34a' : isError ? '4px solid #dc2626' : '4px solid #3b82f6'
        }}
      >
        <h2 style={{ marginBottom: '1rem', color: '#0f172a' }}>
          {status === 'pending' && 'Checking your email...'}
          {isSuccess && 'Email verified!'}
          {isError && 'Verification problem'}
        </h2>

        <p style={{ marginBottom: '1.5rem', color: '#475569', lineHeight: 1.6 }}>{message}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(isSuccess || isError) && (
            <Link
              to="/Login"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: '#1d4ed8',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Go to login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
