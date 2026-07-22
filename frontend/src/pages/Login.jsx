import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

const Login = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) return;

    setIsSubmitting(true);
    const success = await login(usernameOrEmail, password);
    setIsSubmitting(false);
    
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleQuickFill = (user, pass) => {
    setUsernameOrEmail(user);
    setPassword(pass);
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="auth-logo">
            <Activity size={32} />
            <span>Hopewell Clinic</span>
          </div>
          <p className="auth-subtitle">Hospital Patient Management System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Enter your username or email"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block" 
            style={{ width: '100%', marginTop: '10px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Register as Patient</Link>
        </div>

        <div className="quick-fill-section">
          <span className="quick-fill-label">Quick Access Demo Accounts</span>
          <div className="quick-fill-grid">
            <button 
              className="quick-fill-btn"
              onClick={() => handleQuickFill('admin', 'adminpassword')}
            >
              💼 Admin
            </button>
            <button 
              className="quick-fill-btn"
              onClick={() => handleQuickFill('dr_smith', 'doctorpassword')}
            >
              🩺 Doctor
            </button>
            <button 
              className="quick-fill-btn"
              onClick={() => handleQuickFill('receptionist', 'receptionpassword')}
            >
              🔑 Receptionist
            </button>
            <button 
              className="quick-fill-btn"
              onClick={() => handleQuickFill('john_doe', 'patientpassword')}
            >
              👤 Patient (John)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
