import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, UserPlus, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const RegisterForm = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const getPasswordStrength = () => {
    if (!password) return { level: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: 'Weak', color: 'var(--error)' };
    if (score <= 2) return { level: 2, label: 'Fair', color: 'var(--warning)' };
    if (score <= 3) return { level: 3, label: 'Good', color: 'var(--info)' };
    return { level: 4, label: 'Strong', color: 'var(--success)' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      toast.success('Account created! Welcome to CollabEdit.');
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container animate-scale-in">
        <div className="auth-glow auth-glow-1"></div>
        <div className="auth-glow auth-glow-2"></div>

        <div className="auth-card card">
          <div className="auth-header">
            <div className="auth-logo">
              <svg width="40" height="40" viewBox="0 0 32 32">
                <defs>
                  <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6C5CE7"/>
                    <stop offset="100%" stopColor="#00B4D8"/>
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="8" fill="url(#logoGrad2)"/>
                <path d="M8 10h10M8 16h16M8 22h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="24" cy="10" r="3" fill="#00F5D4" opacity="0.9"/>
              </svg>
            </div>
            <h1>Create your account</h1>
            <p>Start collaborating in real-time</p>
          </div>

          {error && (
            <div className="auth-error animate-slide-down">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label className="input-label" htmlFor="reg-username">Username</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="reg-username"
                  type="text"
                  className="input input-with-icon"
                  placeholder="Your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="reg-email">Email</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="reg-email"
                  type="email"
                  className="input input-with-icon"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="reg-password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input input-with-icon"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              {password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="strength-segment"
                        style={{
                          background: i <= strength.level ? strength.color : 'var(--bg-hover)',
                        }}
                      />
                    ))}
                  </div>
                  <span className="strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="reg-confirm">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  className={`input input-with-icon ${
                    confirmPassword && confirmPassword !== password ? 'input-error' : ''
                  }`}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {confirmPassword && confirmPassword !== password && (
                <span className="error-text">Passwords don't match</span>
              )}
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
                  <UserPlus size={18} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
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

        .password-strength {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-top: var(--space-1);
        }

        .strength-bar {
          display: flex;
          gap: 3px;
          flex: 1;
        }

        .strength-segment {
          height: 4px;
          flex: 1;
          border-radius: 2px;
          transition: background var(--transition-fast);
        }

        .strength-label {
          font-size: var(--text-xs);
          font-weight: var(--font-medium);
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

export default RegisterForm;
