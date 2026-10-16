import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { ClipboardList, Search, Inbox, Check, X, Eye, Save } from 'lucide-react';
import { appointmentService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const STATUS_BADGES = {
  scheduled: 'badge-scheduled',
  arrived: 'badge-arrived',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
};

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  arrived: 'Arrived',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PAGE_SIZES = [10, 20, 50];

export default function AppointmentsPage() {
  const { hasRole } = useAuth();
  const { subscribe } = useSocket();

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    department: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 10,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const [appointments, setAppointments] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [selectedApt, setSelectedApt] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState({ purpose: '', notes: '' });

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      const queryParams = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const res = await appointmentService.getAll(queryParams);
      const data = res.data?.data;
      setAppointments(data?.appointments || []);
      setMeta(data?.meta || { total: 0, page: 1, pages: 1 });
    } catch (err) {
      console.error('Error fetching appointments:', err);
      toast.error('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    const events = ['appointment:created', 'appointment:updated', 'appointment:cancelled', 'appointment:arrived'];
    const unsubs = events.map((ev) => subscribe(ev, () => fetchAppointments()));
    return () => unsubs.forEach((u) => u());
  }, [subscribe, fetchAppointments]);

  const handleCancel = async (id) => {
    try {
      setIsActionLoading(true);
      await appointmentService.cancel(id);
      toast.success('Appointment cancelled');
      setShowModal(false);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleArrive = async (id) => {
    try {
      setIsActionLoading(true);
      await appointmentService.arrive(id);
      toast.success('Patient marked as arrived');
      setShowModal(false);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedApt) return;
    try {
      setIsActionLoading(true);
      await appointmentService.update(selectedApt._id, editData);
      toast.success('Appointment updated');
      setShowModal(false);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  };

  const openApt = (apt) => {
    setSelectedApt(apt);
    setEditData({ purpose: apt.purpose || '', notes: apt.notes || '' });
    setShowModal(true);
  };

  const totalPages = meta.pages || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardList size={22} /> Appointments
          </h2>
          <p className="page-subtitle">{meta.total || 0} total appointments</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="live-badge">
            <div className="live-dot" />
            Live
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-input-wrapper" style={{ flex: 2, minWidth: 200 }}>
          <span className="search-icon"><Search size={16} /></span>
          <input
            type="text"
            className="form-control"
            placeholder="Search patient, doctor, mobile..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <select
          className="form-control"
          style={{ width: 140 }}
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="arrived">Arrived</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <input
          type="date"
          className="form-control"
          style={{ width: 150 }}
          value={filters.startDate}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
        />
        <input
          type="date"
          className="form-control"
          style={{ width: 150 }}
          value={filters.endDate}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
        />

        <select
          className="form-control"
          style={{ width: 110 }}
          value={filters.limit}
          onChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value), page: 1 }))}
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s} / page</option>
          ))}
        </select>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() =>
            setFilters({
              search: '',
              status: '',
              department: '',
              startDate: '',
              endDate: '',
              page: 1,
              limit: 10,
              sortBy: 'date',
              sortOrder: 'desc',
            })
          }
        >
          Clear
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Purpose</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="spinner spinner-dark" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Inbox size={40} /></div>
                      <div className="empty-state-title">No appointments found</div>
                      <div className="empty-state-text">Try adjusting your filters</div>
                    </div>
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => (
                  <tr key={apt._id} style={{ cursor: 'pointer' }} onClick={() => openApt(apt)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{apt.patient?.name || 'N/A'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{apt.patient?.mobile || ''}</div>
                    </td>
                    <td>Dr. {apt.doctor?.name || 'N/A'}</td>
                    <td>{apt.department?.name || 'N/A'}</td>
                    <td>
                      <div>{apt.date ? format(new Date(apt.date), 'MMM d, yyyy') : '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{apt.slotTime}</div>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGES[apt.status] || 'badge-scheduled'}`}>
                        {STATUS_LABELS[apt.status] || apt.status}
                      </span>
                    </td>
                    <td style={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {apt.purpose || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {hasRole('super_admin', 'receptionist') && apt.status === 'scheduled' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleArrive(apt._id)}
                            title="Mark Arrived"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Check size={14} /> Arrive
                          </button>
                        )}
                        {hasRole('super_admin', 'receptionist') && apt.status === 'scheduled' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              if (window.confirm('Cancel this appointment?')) handleCancel(apt._id);
                            }}
                            title="Cancel"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <X size={14} /> Cancel
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openApt(apt)}
                          title="View"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Eye size={14} /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={filters.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
          >
            ‹
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
            <button
              key={i + 1}
              className={`page-btn ${filters.page === i + 1 ? 'active' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, page: i + 1 }))}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="page-btn"
            disabled={filters.page >= totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          >
            ›
          </button>
        </div>
      )}

      {showModal && selectedApt && (
        <AppointmentModal
          apt={selectedApt}
          editData={editData}
          setEditData={setEditData}
          onClose={() => setShowModal(false)}
          onUpdate={handleUpdate}
          onCancel={() => {
            if (window.confirm('Cancel appointment?')) handleCancel(selectedApt._id);
          }}
          onArrive={() => handleArrive(selectedApt._id)}
          isSaving={isActionLoading}
          hasRole={hasRole}
        />
      )}
    </div>
  );
}

function AppointmentModal({ apt, editData, setEditData, onClose, onUpdate, onCancel, onArrive, isSaving, hasRole }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Appointment Details</h3>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 20 }}>
            <span className={`badge badge-${apt.status}`} style={{ fontSize: 13, padding: '6px 14px' }}>
              {STATUS_LABELS[apt.status]}
            </span>
          </div>
          <div className="grid-2" style={{ gap: 16, marginBottom: 20 }}>
            <InfoRow label="Patient" value={apt.patient?.name} />
            <InfoRow label="Mobile" value={apt.patient?.mobile || '—'} />
            <InfoRow label="Doctor" value={`Dr. ${apt.doctor?.name}`} />
            <InfoRow label="Department" value={apt.department?.name} />
            <InfoRow label="Date" value={apt.date ? format(new Date(apt.date), 'MMMM d, yyyy') : '—'} />
            <InfoRow label="Time" value={apt.slotTime} />
          </div>
          <div className="divider" />
          <div className="form-group">
            <label className="form-label">Purpose of Visit</label>
            <input
              type="text"
              className="form-control"
              value={editData.purpose}
              onChange={(e) => setEditData((d) => ({ ...d, purpose: e.target.value }))}
              placeholder="e.g., Regular checkup..."
              disabled={!hasRole('super_admin', 'receptionist')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Consultation Notes</label>
            <textarea
              className="form-control"
              rows={3}
              value={editData.notes}
              onChange={(e) => setEditData((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Doctor's notes..."
              disabled={!hasRole('super_admin', 'doctor')}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
        <div className="modal-footer">
          {hasRole('super_admin', 'receptionist') && apt.status === 'scheduled' && (
            <button className="btn btn-success" onClick={onArrive} disabled={isSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Check size={16} /> Mark Arrived
            </button>
          )}
          {hasRole('super_admin', 'receptionist') && apt.status === 'scheduled' && (
            <button className="btn btn-danger" onClick={onCancel} disabled={isSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <X size={16} /> Cancel Appointment
            </button>
          )}
          {hasRole('super_admin', 'receptionist', 'doctor') && (
            <button className="btn btn-primary" onClick={onUpdate} disabled={isSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {isSaving ? <><span className="spinner" /> Saving...</> : <><Save size={16} /> Save</>}
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}
