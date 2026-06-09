import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { Sprout, Lock, Mail, UserCheck, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function AuthGate() {
  const { login, API_BASE, addLog } = usePlatform();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        // OAuth2 Password Flow requires form URL encoding
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Incorrect email or password.');
        }

        const data = await response.json();
        login(data.access_token, data.email, data.role);
        addLog('auth', `User ${data.email} logged in with role: ${data.role}`);
      } else {
        // Sign Up
        const response = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Failed to create account.');
        }

        setSuccessMsg('Account created successfully! Please sign in.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '1.5rem'
    }}>
      {styleTag}
      {/* Background orbs */}
      <div className="absolute top-[20%] right-[15%] w-[450px] height-[450px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.06)_0%,rgba(16,185,129,0)_70%)] blur-[40px] animate-pulse"></div>
      <div className="absolute bottom-[10%] left-[10%] w-[500px] height-[500px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.05)_0%,rgba(6,182,212,0)_70%)] blur-[50px] animate-pulse"></div>

      <div className="glass-card auth-card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', zIndex: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div className="auth-logo-bg">
            <Sprout size={32} className="logo-icon" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '1rem', color: 'var(--text-primary)' }}>
            AgriIntel AI Platform
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {isLogin ? 'Sign in to access agriculture analytics' : 'Register a new analyst account'}
          </p>
        </div>

        {errorMsg && (
          <div className="alert-message danger-alert">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="alert-message success-alert">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Email input */}
          <div className="input-container">
            <label>Email Address</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input 
                type="email" 
                required 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password input */}
          <div className="input-container">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                className="eye-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Role selector - only on sign up */}
          {!isLogin && (
            <div className="input-container">
              <label>System Access Role</label>
              <div className="input-wrapper">
                <UserCheck size={16} className="input-icon" />
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', cursor: 'pointer', padding: '0 0.5rem' }}
                >
                  <option value="viewer" style={{ backgroundColor: '#0d1e17' }}>Viewer (Read Only)</option>
                  <option value="analyst" style={{ backgroundColor: '#0d1e17' }}>Analyst (Edit & Train)</option>
                  <option value="admin" style={{ backgroundColor: '#0d1e17' }}>Admin (Full Control)</option>
                </select>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ padding: '0.85rem', justifyContent: 'center', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {isLogin ? (
            <span>Don't have an account? <button className="auth-toggle-link" onClick={() => { setIsLogin(false); setErrorMsg(''); }}>Register here</button></span>
          ) : (
            <span>Already have an account? <button className="auth-toggle-link" onClick={() => { setIsLogin(true); setErrorMsg(''); }}>Sign in here</button></span>
          )}
        </div>
      </div>
    </div>
  );
}

const styleTag = (
  <style>{`
    .auth-card {
      background: rgba(10, 25, 18, 0.45) !important;
      border: 1px solid rgba(16, 185, 129, 0.16) !important;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6) !important;
    }
    .auth-logo-bg {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 1rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
    }
    .input-container {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .input-container label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
    }
    .input-wrapper {
      display: flex;
      align-items: center;
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--panel-border);
      border-radius: 8px;
      padding: 0.75rem;
      transition: all 0.2s;
    }
    .input-wrapper:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.15);
      background: rgba(255,255,255,0.04);
    }
    .input-icon {
      color: var(--text-secondary);
      margin-right: 0.5rem;
    }
    .input-wrapper input {
      background: transparent;
      border: none;
      color: #fff;
      font-size: 0.85rem;
      width: 100%;
      outline: none;
    }
    .eye-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0 0.25rem;
    }
    .eye-btn:hover {
      color: #fff;
    }
    .auth-toggle-link {
      background: transparent;
      border: none;
      color: var(--primary);
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }
    .auth-toggle-link:hover {
      color: var(--emerald-light);
    }
    .alert-message {
      font-size: 0.8rem;
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 1.25rem;
      text-align: center;
    }
    .danger-alert {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }
    .success-alert {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }
  `}</style>
);
