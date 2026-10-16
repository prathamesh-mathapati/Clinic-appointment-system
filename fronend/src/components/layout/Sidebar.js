import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  CalendarPlus,
  Clock,
  Users,
  ShieldCheck,
  LogOut,
  Building2,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'receptionist', 'doctor'] },
      { to: '/scheduler', label: 'Scheduler', icon: Calendar, roles: ['super_admin', 'receptionist', 'doctor'] },
    ],
  },
  {
    label: 'Appointments',
    items: [
      { to: '/appointments', label: 'All Appointments', icon: ClipboardList, roles: ['super_admin', 'receptionist', 'doctor'] },
      { to: '/appointments/new', label: 'Book Appointment', icon: CalendarPlus, roles: ['super_admin', 'receptionist'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin/schedules', label: 'Doctor Schedules', icon: Clock, roles: ['super_admin'] },
      { to: '/admin/staff', label: 'Staff & Doctors', icon: Users, roles: ['super_admin'] },
      { to: '/admin/logs', label: 'Audit Trail', icon: ShieldCheck, roles: ['super_admin'] },
    ],
  },
];

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  receptionist: 'Receptionist',
  doctor: 'Doctor',
};

const ROLE_COLORS = {
  super_admin: '#8b5cf6',
  receptionist: '#2563eb',
  doctor: '#059669',
};

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '--';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Building2 size={22} color="var(--primary-light)" />
        </div>
        <div className="logo-text">
          <span className="logo-name">MediSchedule</span>
          <span className="logo-sub">EMR System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !user || item.roles.includes(user.role)
          );
          if (!visibleItems.length) return null;

          return (
            <div key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {visibleItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                  >
                    <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>
                      <IconComponent size={18} />
                    </span>
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          );
        })}

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <div className="live-badge" style={{ margin: '8px 8px' }}>
            <div className={`live-dot`} style={{ background: isConnected ? undefined : '#ef4444' }} />
            {isConnected ? 'Live Connected' : 'Reconnecting...'}
          </div>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name" title={user?.name}>{user?.name}</div>
            <div className="user-role" style={{ color: ROLE_COLORS[user?.role] }}>
              {ROLE_LABELS[user?.role]}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm btn-icon"
            title="Logout"
            style={{ marginLeft: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
