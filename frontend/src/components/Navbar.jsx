import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { theme, toggleTheme, user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  // Deriving titles from current pathname
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard Analytics';
    if (path.startsWith('/patients')) return 'Patients Register';
    if (path.startsWith('/doctors')) return 'Doctors Directory';
    if (path.startsWith('/appointments')) return 'Appointments Calendar';
    if (path.startsWith('/medical-records')) return 'Clinical Records';
    if (path.startsWith('/audit-logs')) return 'Security Audit Trail';
    return 'Hospital Management System';
  };

  return (
    <nav className="navbar">
      <div className="navbar-title">{getPageTitle()}</div>
      
      <div className="navbar-actions">
        <button 
          className="theme-toggle" 
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
