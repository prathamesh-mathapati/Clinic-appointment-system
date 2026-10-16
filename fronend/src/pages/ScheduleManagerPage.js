import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { X, Trash2 } from 'lucide-react';
import { doctorService, departmentService } from '../services/apiService';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
];

const SLOT_DURATIONS = [10, 15, 20, 30, 45, 60];

const DEFAULT_SCHEDULE = {
  workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  slotDuration: 15,
  sessions: [
    { id: 1, name: 'Morning OPD', startTime: '09:00', endTime: '13:00' },
    { id: 2, name: 'Evening OPD', startTime: '17:00', endTime: '20:00' },
  ],
  breaks: [
    { id: 1, name: 'Afternoon Break', startTime: '13:00', endTime: '17:00' },
  ],
};

export default function ScheduleManagerPage() {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    specialization: '',
    phone: '',
  });

  const loadDoctors = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await doctorService.getAll();
      const docs = res.data?.data?.doctors || [];
      setDoctors(docs);
      if (docs.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docs[0]._id);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDoctorId]);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data?.data?.departments || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
    loadDepartments();
  }, [loadDoctors, loadDepartments]);

  useEffect(() => {
    if (!selectedDoctorId) return;
    const fetchSchedule = async () => {
      try {
        const res = await doctorService.getSchedule(selectedDoctorId);
        if (res.data?.data?.schedule) {
          setSchedule(res.data.data.schedule);
        } else {
          setSchedule(DEFAULT_SCHEDULE);
        }
      } catch (err) {
        setSchedule(DEFAULT_SCHEDULE);
      }
    };
    fetchSchedule();
  }, [selectedDoctorId]);

  const toggleDay = (dayId) => {
    setSchedule((prev) => {
      const exists = prev.workingDays.includes(dayId);
      const updated = exists
        ? prev.workingDays.filter((d) => d !== dayId)
        : [...prev.workingDays, dayId];
      return { ...prev, workingDays: updated };
    });
  };

  const addSession = () => {
    const nextId = Date.now();
    setSchedule((prev) => ({
      ...prev,
      sessions: [
        ...prev.sessions,
        { id: nextId, name: `Session ${prev.sessions.length + 1}`, startTime: '17:30', endTime: '20:00' },
      ],
    }));
  };

  const removeSession = (id) => {
    setSchedule((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
    }));
  };

  const updateSession = (id, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  const addBreak = () => {
    const nextId = Date.now();
    setSchedule((prev) => ({
      ...prev,
      breaks: [
        ...prev.breaks,
        { id: nextId, name: 'Tea Break', startTime: '15:00', endTime: '15:30' },
      ],
    }));
  };

  const removeBreak = (id) => {
    setSchedule((prev) => ({
      ...prev,
      breaks: prev.breaks.filter((b) => b.id !== id),
    }));
  };

  const updateBreak = (id, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      breaks: prev.breaks.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    }));
  };

  const previewSlots = useMemo(() => {
    const toMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const toTimeStr = (minutes) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const duration = schedule.slotDuration || 15;
    const generated = [];

    const breakRanges = (schedule.breaks || []).map((b) => ({
      start: toMinutes(b.startTime),
      end: toMinutes(b.endTime),
      name: b.name,
    }));

    const isDuringBreak = (start, end) =>
      breakRanges.some(
        (brk) => (start >= brk.start && start < brk.end) || (end > brk.start && end <= brk.end)
      );

    (schedule.sessions || []).forEach((session) => {
      const sessionStart = toMinutes(session.startTime);
      const sessionEnd = toMinutes(session.endTime);

      let current = sessionStart;
      while (current + duration <= sessionEnd) {
        const slotStart = current;
        const slotEnd = current + duration;

        if (!isDuringBreak(slotStart, slotEnd)) {
          generated.push({
            time: toTimeStr(slotStart),
            endTime: toTimeStr(slotEnd),
            session: session.name,
          });
        }
        current += duration;
      }
    });

    return generated;
  }, [schedule]);

  const handleSaveSchedule = async () => {
    if (!selectedDoctorId) {
      toast.error('Please select a doctor');
      return;
    }
    if (schedule.workingDays.length === 0) {
      toast.error('Please select at least one working day');
      return;
    }
    if (schedule.sessions.length === 0) {
      toast.error('Please configure at least one session');
      return;
    }

    try {
      setIsSaving(true);
      await doctorService.updateSchedule(selectedDoctorId, schedule);
      toast.success('Doctor schedule saved successfully!');
    } catch (err) {
      console.error('Error saving schedule:', err);
      toast.error(err.response?.data?.message || 'Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await doctorService.create(newDoctor);
      toast.success('Doctor created successfully!');
      setShowDoctorModal(false);
      setNewDoctor({ name: '', email: '', password: '', department: '', specialization: '', phone: '' });
      await loadDoctors();
      if (res.data?.data?.doctor?._id) {
        setSelectedDoctorId(res.data.data.doctor._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create doctor');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Doctor Schedule Management</h2>
          <p className="page-subtitle">
            Configure working days, multiple sessions, slot durations, and break timings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowDoctorModal(true)}>
            + Create Doctor
          </button>
          <button className="btn btn-primary" onClick={handleSaveSchedule} disabled={isSaving}>
            {isSaving ? <span className="spinner" /> : 'Save Schedule'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: '1 1 300px' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Select Doctor</label>
            <select
              className="form-control"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              disabled={isLoading || doctors.length === 0}
            >
              {doctors.length === 0 && <option>No doctors available</option>}
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  Dr. {doc.name} {doc.specialization ? `(${doc.specialization})` : ''} — {doc.department?.name || 'General'}
                </option>
              ))}
            </select>
          </div>

          {selectedDoctor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>
                {selectedDoctor.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dr. {selectedDoctor.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {selectedDoctor.specialization || 'Consultant'} · {selectedDoctor.department?.name || 'Department'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Working Days</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Select the days when this doctor is available for appointments.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = schedule.workingDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--primary)' : 'var(--bg-elevated)',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      fontSize: 13,
                    }}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>Slot Duration</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Duration of each patient appointment consultation.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SLOT_DURATIONS.map((dur) => {
                const isSelected = schedule.slotDuration === dur;
                return (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setSchedule((prev) => ({ ...prev, slotDuration: dur }))}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isSelected ? 'var(--success)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--success)' : 'var(--bg-elevated)',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      fontSize: 13,
                    }}
                  >
                    {dur} min
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 className="card-title">Daily Sessions</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Multiple working sessions per day</div>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addSession}>
                + Add Session
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {schedule.sessions.map((session, idx) => (
                <div
                  key={session.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <input
                    type="text"
                    className="form-control"
                    style={{ flex: '1 1 120px' }}
                    value={session.name}
                    placeholder="Session Name"
                    onChange={(e) => updateSession(session.id, 'name', e.target.value)}
                  />
                  <input
                    type="time"
                    className="form-control"
                    style={{ width: 110 }}
                    value={session.startTime}
                    onChange={(e) => updateSession(session.id, 'startTime', e.target.value)}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>–</span>
                  <input
                    type="time"
                    className="form-control"
                    style={{ width: 110 }}
                    value={session.endTime}
                    onChange={(e) => updateSession(session.id, 'endTime', e.target.value)}
                  />
                  {schedule.sessions.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      title="Remove session"
                      onClick={() => removeSession(session.id)}
                      style={{ color: 'var(--danger-light)', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 className="card-title">Break Timings</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Slots will never be generated during breaks</div>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addBreak}>
                + Add Break
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {schedule.breaks.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No breaks configured.
                </div>
              ) : (
                schedule.breaks.map((brk, idx) => (
                  <div
                    key={brk.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 12,
                      background: 'rgba(217, 119, 6, 0.05)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(217, 119, 6, 0.2)',
                    }}
                  >
                    <input
                      type="text"
                      className="form-control"
                      style={{ flex: '1 1 120px' }}
                      value={brk.name}
                      placeholder="Break Name (e.g. Lunch)"
                      onChange={(e) => updateBreak(brk.id, 'name', e.target.value)}
                    />
                    <input
                      type="time"
                      className="form-control"
                      style={{ width: 110 }}
                      value={brk.startTime}
                      onChange={(e) => updateBreak(brk.id, 'startTime', e.target.value)}
                    />
                    <span style={{ color: 'var(--text-muted)' }}>–</span>
                    <input
                      type="time"
                      className="form-control"
                      style={{ width: 110 }}
                      value={brk.endTime}
                      onChange={(e) => updateBreak(brk.id, 'endTime', e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      title="Remove break"
                      onClick={() => removeBreak(brk.id)}
                      style={{ color: 'var(--danger-light)', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Dynamic Slot Preview</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Computed dynamically based on your session and break rules
                </div>
              </div>
              <span className="badge badge-scheduled" style={{ fontSize: 13 }}>
                {previewSlots.length} Total Slots
              </span>
            </div>

            {schedule.breaks.length > 0 && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--warning-bg)',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                  fontSize: 12,
                  color: 'var(--warning-light)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>
                  <strong>Break Protection Active:</strong>{' '}
                  {schedule.breaks.map((b) => `${b.name} (${b.startTime}–${b.endTime})`).join(', ')} are strictly excluded.
                </span>
              </div>
            )}

            {previewSlots.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 10px' }}>
                <div className="empty-state-title">No Slots Generated</div>
                <div className="empty-state-text">Check your session start and end times.</div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
                  gap: 8,
                  maxHeight: 460,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {previewSlots.map((slot, i) => (
                  <div
                    key={i}
                    title={`${slot.session}: ${slot.time} - ${slot.endTime}`}
                    style={{
                      padding: '8px 4px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {slot.time}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleSaveSchedule}
                disabled={isSaving}
              >
                {isSaving ? <span className="spinner" /> : `Save Schedule for Dr. ${selectedDoctor?.name || ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDoctorModal && (
        <div className="modal-overlay" onClick={() => setShowDoctorModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Doctor</h3>
              <button className="modal-close" onClick={() => setShowDoctorModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateDoctor}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    required
                    className="form-control"
                    placeholder="doctor@clinic.com"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    required
                    className="form-control"
                    placeholder="Temporary login password"
                    value={newDoctor.password}
                    onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                  />
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select
                      required
                      className="form-control"
                      value={newDoctor.department}
                      onChange={(e) => setNewDoctor({ ...newDoctor, department: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Specialization</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Cardiologist"
                      value={newDoctor.specialization}
                      onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone / Mobile</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="+91 9876543210"
                    value={newDoctor.phone}
                    onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDoctorModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? <span className="spinner" /> : 'Create Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
