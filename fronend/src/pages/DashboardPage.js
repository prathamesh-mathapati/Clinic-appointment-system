import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { appointmentService } from '../services/apiService';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  CalendarPlus,
  ClipboardList,
  Inbox,
  Plus,
  AlertCircle,
  XCircle,
} from 'lucide-react';

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', icon: Clock, color: 'var(--info)' },
  arrived: { label: 'Arrived', icon: UserCheck, color: 'var(--warning-light)' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'var(--success-light)' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'var(--danger-light)' },
};

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const { subscribe } = useSocket();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await appointmentService.getAll({ date: today, limit: 50, page: 1 });
      setAppointments(res.data?.data?.appointments || []);
    } catch (err) {
      console.error('Error fetching dashboard appointments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    const unsub1 = subscribe('appointment:created', () => fetchAppointments());
    const unsub2 = subscribe('appointment:updated', () => fetchAppointments());
    const unsub3 = subscribe('appointment:cancelled', () => fetchAppointments());
    const unsub4 = subscribe('appointment:arrived', () => fetchAppointments());
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [subscribe, fetchAppointments]);

  const stats = {
    total: appointments.length,
    scheduled: appointments.filter((a) => a.status === 'scheduled').length,
    arrived: appointments.filter((a) => a.status === 'arrived').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  };

  const upcomingAppointments = appointments.filter((a) => a.status === 'scheduled').slice(0, 8);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            Good {getGreeting()}, {user?.name?.split(' ')[0]}
          </h2>
          <p className="page-subtitle">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} — Clinical Overview
          </p>
        </div>
        {hasRole('super_admin', 'receptionist') && (
          <button className="btn btn-primary" onClick={() => navigate('/appointments/new')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> New Appointment
          </button>
        )}
      </div>

      <div className="stat-grid">
        <StatCard icon={<Calendar size={22} />} label="Today's Total" value={stats.total} color="blue" />
        <StatCard icon={<Clock size={22} />} label="Scheduled" value={stats.scheduled} color="purple" />
        <StatCard icon={<UserCheck size={22} />} label="Arrived" value={stats.arrived} color="orange" />
        <StatCard icon={<CheckCircle2 size={22} />} label="Completed" value={stats.completed} color="green" />
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        <div className="card" style={{ gridColumn: hasRole('super_admin') ? '1 / span 2' : '1' }}>
          <div className="card-header">
            <h3 className="card-title">Today's Appointments</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/appointments')}>
              View All
            </button>
          </div>

          {isLoading ? (
            <LoadingSkeleton />
          ) : upcomingAppointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                <Inbox size={36} color="var(--text-muted)" />
              </div>
              <div className="empty-state-title">No scheduled appointments today</div>
              <div className="empty-state-text">Click "New Appointment" to book a patient slot</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingAppointments.map((apt) => (
                <AppointmentRow key={apt._id} apt={apt} onClick={() => navigate('/appointments')} />
              ))}
            </div>
          )}
        </div>

        {!hasRole('super_admin') && (
          <div className="card">
            <div className="card-header"><h3 className="card-title">Quick Actions</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {hasRole('super_admin', 'receptionist') && (
                <QuickActionBtn icon={<CalendarPlus size={20} />} label="Book New Appointment" desc="Schedule for existing or new patient" onClick={() => navigate('/appointments/new')} color="var(--primary)" />
              )}
              <QuickActionBtn icon={<Calendar size={20} />} label="View Scheduler" desc="Check available slots by doctor" onClick={() => navigate('/scheduler')} color="var(--secondary)" />
              <QuickActionBtn icon={<ClipboardList size={20} />} label="All Appointments" desc="View and manage appointments" onClick={() => navigate('/appointments')} color="var(--success)" />
            </div>
          </div>
        )}
      </div>

      {stats.total > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header"><h3 className="card-title">Today's Status Overview</h3></div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const IconComp = cfg.icon;
              return (
                <div key={key} style={{ flex: 1, minWidth: 120, padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: cfg.color }}>
                    <IconComp size={24} />
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: cfg.color, fontFamily: 'Outfit, sans-serif' }}>{stats[key]}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{cfg.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value ?? '—'}</div>
      </div>
    </div>
  );
}

function AppointmentRow({ apt, onClick }) {
  const status = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'var(--transition)', gap: 12 }}
      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>
          {apt.patient?.name?.charAt(0) || 'P'}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{apt.patient?.name || 'Unknown Patient'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dr. {apt.doctor?.name} · {apt.department?.name}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{apt.slotTime}</span>
        <span className={`badge badge-${apt.status}`}>{status.label}</span>
      </div>
    </div>
  );
}

function QuickActionBtn({ icon, label, desc, onClick, color }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition)', textAlign: 'left', width: '100%' }}
      onMouseOver={(e) => { e.currentTarget.style.borderColor = color; }}
      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
      </div>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 62, borderRadius: 'var(--radius-md)' }} />)}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
