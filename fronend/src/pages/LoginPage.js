import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, AlertCircle } from 'lucide-react';

const DEMO_CREDENTIALS = [
  { role: 'Super Admin', email: 'admin@clinic.com', password: 'admin123' },
  { role: 'Receptionist', email: 'receptionist@clinic.com', password: 'reception123' },
  { role: 'Doctor', email: 'doctor@clinic.com', password: 'doctor123' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (cred) => {
    setForm({ email: cred.email, password: cred.password });
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid" />
      <div className="login-bg-glow" />
      <div className="login-bg-glow2" />

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={26} color="var(--primary-light)" />
          </div>
          <div className="login-logo-text">
            <div className="app-name">MediSchedule</div>
            <div className="app-sub">Enterprise EMR System</div>
          </div>
        </div>

        <h2 className="login-title">Welcome back</h2>
        <p className="login-subtitle">Sign in to your account to continue</p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} /> <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-control"
              placeholder="name@clinic.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <><span className="spinner" /> Signing in...</>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="demo-creds">
          <div className="demo-creds-title">Demo Accounts (click to fill)</div>
          {DEMO_CREDENTIALS.map((cred) => (
            <div
              key={cred.role}
              className="demo-cred-item"
              onClick={() => fillDemo(cred)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fillDemo(cred)}
            >
              <div>
                <div className="demo-cred-role">{cred.role}</div>
                <div className="demo-cred-email">{cred.email}</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--primary-light)', fontWeight: 600 }}>Select</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
