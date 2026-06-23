import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container animate-scale-in">
        {/* Decorative elements */}
        <div className="auth-glow auth-glow-1"></div>
        <div className="auth-glow auth-glow-2"></div>

        <div className="auth-card card">
          <div className="auth-header">
            <div className="auth-logo">
              <svg width="40" height="40" viewBox="0 0 32 32">
                <defs>
                  <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6C5CE7"/>
                    <stop offset="100%" stopColor="#00B4D8"/>
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="8" fill="url(#logoGrad)"/>
                <path d="M8 10h10M8 16h16M8 22h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="24" cy="10" r="3" fill="#00F5D4" opacity="0.9"/>
              </svg>
            </div>
            <h1>Welcome back</h1>
            <p>Sign in to continue collaborating</p>
          </div>

          {error && (
            <div className="auth-error animate-slide-down">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label className="input-label" htmlFor="login-email">Email</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="input input-with-icon"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="login-password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input input-with-icon"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner" style={{ borderTopColor: 'white' }}></div>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          position: relative;
          overflow: hidden;
          padding: var(--space-4);
        }

        .auth-container {
          position: relative;
          width: 100%;
          max-width: 440px;
        }

        .auth-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          pointer-events: none;
          z-index: 0;
        }

        .auth-glow-1 {
          width: 300px;
          height: 300px;
          background: var(--accent-primary);
          top: -100px;
          right: -100px;
        }

        .auth-glow-2 {
          width: 250px;
          height: 250px;
          background: var(--accent-secondary);
          bottom: -80px;
          left: -80px;
        }

        .auth-card {
          position: relative;
          z-index: 1;
          padding: var(--space-10);
        }

        .auth-header {
          text-align: center;
          margin-bottom: var(--space-8);
        }

        .auth-logo {
          display: flex;
          justify-content: center;
          margin-bottom: var(--space-4);
        }

        .auth-header h1 {
          font-size: var(--text-2xl);
          margin-bottom: var(--space-2);
        }

        .auth-header p {
          font-size: var(--text-sm);
          color: var(--text-tertiary);
        }

        .auth-error {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: var(--error-bg);
          border: 1px solid rgba(255, 107, 107, 0.2);
          border-radius: var(--radius-lg);
          color: var(--error);
          font-size: var(--text-sm);
          margin-bottom: var(--space-4);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
          z-index: 1;
        }

        .input-with-icon {
          padding-left: 40px !important;
        }

        .input-toggle {
          position: absolute;
          right: 8px;
          padding: var(--space-1);
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .input-toggle:hover {
          color: var(--text-secondary);
        }

        .auth-footer {
          text-align: center;
          margin-top: var(--space-6);
          font-size: var(--text-sm);
          color: var(--text-tertiary);
        }

        .auth-footer a {
          color: var(--accent-primary);
          font-weight: var(--font-semibold);
        }

        .auth-footer a:hover {
          color: var(--accent-primary-hover);
        }
      `}</style>
    </div>
  );
};

export default LoginForm;
