import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  Users, 
  UserCheck, 
  Calendar, 
  FileText, 
  Activity, 
  LogOut, 
  ShieldAlert 
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  // Define menu items and which roles can access them
  const menuItems = [
    {
      path: '/dashboard',
      name: 'Dashboard',
      icon: <Home size={20} />,
      roles: ['Admin', 'Doctor', 'Receptionist', 'Patient']
    },
    {
      path: '/patients',
      name: 'Patients',
      icon: <Users size={20} />,
      roles: ['Admin', 'Doctor', 'Receptionist']
    },
    {
      path: '/doctors',
      name: 'Doctors',
      icon: <UserCheck size={20} />,
      roles: ['Admin', 'Doctor', 'Receptionist', 'Patient']
    },
    {
      path: '/appointments',
      name: 'Appointments',
      icon: <Calendar size={20} />,
      roles: ['Admin', 'Doctor', 'Receptionist', 'Patient']
    },
    {
      path: '/medical-records',
      name: 'Medical Records',
      icon: <FileText size={20} />,
      roles: ['Admin', 'Doctor', 'Patient']
    },
    {
      path: '/audit-logs',
      name: 'Audit Logs',
      icon: <ShieldAlert size={20} />,
      roles: ['Admin']
    }
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getProfileName = () => {
    if (user.profile && user.profile.name) {
      return user.profile.name;
    }
    return user.username;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Activity size={24} />
          <span>Hopewell Clinic</span>
        </div>
      </div>
      
      <ul className="sidebar-menu">
        {filteredMenu.map((item, idx) => (
          <li key={idx} className="sidebar-item">
            <NavLink 
              to={item.path} 
              className={({ isActive }) => isActive ? "active" : ""}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      
      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">
            {getInitials(getProfileName())}
          </div>
          <div className="user-info">
            <span className="user-name" title={getProfileName()}>{getProfileName()}</span>
            <span className="user-role">{user.role}</span>
          </div>
        </div>
        
        <button className="btn btn-secondary btn-block" onClick={logout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
