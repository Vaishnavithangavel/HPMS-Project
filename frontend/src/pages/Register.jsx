import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    age: '',
    gender: 'Male',
    contact_number: '',
    address: '',
    emergency_contact: '',
    medical_history: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validations
    if (!formData.username || !formData.email || !formData.password || !formData.name || !formData.age || !formData.contact_number) {
      showToast('Please fill all required fields.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        age: parseInt(formData.age),
        role: 'Patient'
      };

      await api.auth.register(payload);
      showToast('Registration successful! You can now sign in.', 'success');
      navigate('/login');
    } catch (error) {
      showToast(error.message || 'Registration failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page" style={{ padding: '40px 20px' }}>
      <div className="auth-card glass-panel" style={{ maxWidth: '600px' }}>
        <div className="auth-header">
          <div className="auth-logo">
            <Activity size={32} />
            <span>Hopewell Clinic</span>
          </div>
          <p className="auth-subtitle">Patient Self-Registration Portal</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Account Info */}
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input 
                type="text" 
                name="username"
                className="form-control" 
                value={formData.username}
                onChange={handleChange}
                required 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input 
                type="email" 
                name="email"
                className="form-control" 
                value={formData.email}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Password *</label>
              <input 
                type="password" 
                name="password"
                className="form-control" 
                value={formData.password}
                onChange={handleChange}
                required 
              />
            </div>

            {/* Patient Demographics */}
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input 
                type="text" 
                name="name"
                className="form-control" 
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Age *</label>
              <input 
                type="number" 
                name="age"
                className="form-control" 
                value={formData.age}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select 
                name="gender" 
                className="form-control" 
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Contact Number *</label>
              <input 
                type="tel" 
                name="contact_number"
                className="form-control" 
                placeholder="555-0199"
                value={formData.contact_number}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Residential Address *</label>
              <textarea 
                name="address"
                className="form-control" 
                rows="2"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Emergency Contact Info *</label>
              <input 
                type="text" 
                name="emergency_contact"
                className="form-control" 
                placeholder="Jane Doe (Wife) - 555-0122"
                value={formData.emergency_contact}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Medical History / Allergies</label>
              <textarea 
                name="medical_history"
                className="form-control" 
                rows="2"
                placeholder="Describe pre-existing conditions, allergies, or type 'None'"
                value={formData.medical_history}
                onChange={handleChange}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block" 
            style={{ width: '100%', marginTop: '20px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registering...' : 'Register Profile'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
