import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { appointmentService, patientService, doctorService, slotService } from '../services/apiService';
import {
  User,
  Stethoscope,
  Building2,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Check,
} from 'lucide-react';

const STEPS = ['Patient', 'Doctor & Slot', 'Confirm'];

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state || {};

  const [step, setStep] = useState(0);
  const [patientType, setPatientType] = useState('existing');
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({ name: '', mobile: '', dob: '', gender: 'male', email: '' });

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(prefill.doctorId || '');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDate, setSelectedDate] = useState(prefill.date || format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState(prefill.slotTime ? { time: prefill.slotTime, _id: prefill.slotId } : null);
  const [slots, setSlots] = useState([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchDoctors = async () => {
      try {
        const res = await doctorService.getAll();
        if (mounted) {
          setDoctors(res.data?.data?.doctors || []);
        }
      } catch (err) {
        console.error('Error fetching doctors:', err);
      }
    };
    fetchDoctors();
    return () => {
      mounted = false;
    };
  }, []);

  const departments = [...new Set(doctors.map((d) => d.department?.name).filter(Boolean))];
  const filteredDoctors = doctors.filter((d) => !selectedDepartment || d.department?.name === selectedDepartment);

  useEffect(() => {
    if (patientSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await patientService.search({ q: patientSearch.trim() });
        setSearchResults(res.data?.data?.patients || []);
      } catch (err) {
        console.error('Error searching patients:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  const fetchSlots = useCallback(async () => {
    if (!selectedDoctor || !selectedDate) {
      setSlots([]);
      return;
    }
    try {
      setIsSlotsLoading(true);
      const res = await slotService.getSlots({
        doctorId: selectedDoctor,
        date: selectedDate,
      });
      setSlots(res.data?.data?.slots || []);
    } catch (err) {
      console.error('Error fetching slots:', err);
      setSlots([]);
    } finally {
      setIsSlotsLoading(false);
    }
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleBook = async () => {
    try {
      setIsBooking(true);
      setBookingError('');
      const patientData =
        patientType === 'existing'
          ? { patientId: selectedPatient._id }
          : { newPatient };

      const doctorObj = doctors.find((d) => d._id === selectedDoctor);
      const departmentId = doctorObj?.department?._id || doctorObj?.department;

      await appointmentService.create({
        ...patientData,
        doctorId: selectedDoctor,
        departmentId,
        date: selectedDate,
        slotTime: selectedSlot.time,
        slotId: selectedSlot._id,
        purpose,
      });

      toast.success('Appointment booked successfully!');
      navigate('/appointments');
    } catch (err) {
      const msg = err.response?.data?.message || 'Booking failed. Please try again.';
      setBookingError(msg);
      toast.error(msg);
    } finally {
      setIsBooking(false);
    }
  };

  const canGoNext = () => {
    if (step === 0) {
      if (patientType === 'existing') return !!selectedPatient;
      return newPatient.name && newPatient.mobile && newPatient.gender;
    }
    if (step === 1) return !!selectedDoctor && !!selectedDate && !!selectedSlot;
    return true;
  };

  const selectedDoctorInfo = doctors.find((d) => d._id === selectedDoctor);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Book Appointment</h2>
          <p className="page-subtitle">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
      </div>

      <div style={{ display: 'flex', marginBottom: 32, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              padding: '14px 20px',
              textAlign: 'center',
              background: i === step ? 'var(--primary-glow)' : 'transparent',
              borderRight: i < STEPS.length - 1 ? '1px solid var(--border)' : 'none',
              borderBottom: i === step ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'var(--transition)',
            }}
          >
            <div style={{ fontSize: 12, color: i <= step ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {i < step ? <Check size={13} style={{ marginRight: 4 }} /> : `${i + 1}. `}{s}
            </div>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 20 }}>Patient Information</h3>

          <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-elevated)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <button
              className={`btn btn-sm ${patientType === 'existing' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1 }}
              onClick={() => { setPatientType('existing'); setSelectedPatient(null); }}
            >
              Existing Patient
            </button>
            <button
              className={`btn btn-sm ${patientType === 'new' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1 }}
              onClick={() => { setPatientType('new'); setSelectedPatient(null); }}
            >
              New Patient
            </button>
          </div>

          {patientType === 'existing' && (
            <div>
              <div className="form-group">
                <label className="form-label">Search by Name, Mobile, or Patient ID</label>
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search patient name, mobile, or ID..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setSelectedPatient(null);
                    }}
                  />
                </div>
              </div>

              {isSearching && (
                <div className="loading-screen" style={{ height: 60 }}>
                  <div className="spinner spinner-dark" /> Searching...
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  {searchResults.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => setSelectedPatient(p)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        background: selectedPatient?._id === p._id ? 'var(--primary-glow)' : 'var(--bg-elevated)',
                        borderLeft: selectedPatient?._id === p._id ? '3px solid var(--primary)' : '3px solid transparent',
                        transition: 'var(--transition)',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Mobile: {p.mobile} · ID: {p.patientId || p._id?.slice(-6)} · {p.gender}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isSearching && searchResults.length === 0 && patientSearch.trim().length >= 2 && (
                <div className="alert alert-warning">No patients found. Try another search or create a new patient.</div>
              )}

              {selectedPatient && (
                <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(5,150,105,0.3)' }}>
                  <div style={{ color: 'var(--success-light)', fontWeight: 600 }}>Selected: {selectedPatient.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mobile: {selectedPatient.mobile}</div>
                </div>
              )}
            </div>
          )}

          {patientType === 'new' && (
            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rahul Verma"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Mobile Number *</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="10-digit mobile (e.g. 9876543210)"
                  maxLength={10}
                  value={newPatient.mobile}
                  onChange={(e) => setNewPatient((p) => ({ ...p, mobile: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  className="form-control"
                  value={newPatient.dob}
                  onChange={(e) => setNewPatient((p) => ({ ...p, dob: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Gender *</label>
                <select
                  className="form-control"
                  value={newPatient.gender}
                  onChange={(e) => setNewPatient((p) => ({ ...p, gender: e.target.value }))}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Optional"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Select Doctor & Date</h3>
            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Department</label>
                <select
                  className="form-control"
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    setSelectedDoctor('');
                    setSelectedSlot(null);
                  }}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Doctor *</label>
                <select
                  className="form-control"
                  value={selectedDoctor}
                  onChange={(e) => {
                    setSelectedDoctor(e.target.value);
                    setSelectedSlot(null);
                  }}
                >
                  <option value="">Select Doctor</option>
                  {filteredDoctors.map((d) => (
                    <option key={d._id} value={d._id}>Dr. {d.name} — {d.specialization}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                <label className="form-label">Appointment Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={selectedDate}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                />
              </div>
            </div>
          </div>

          {selectedDoctor && selectedDate && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Select Time Slot</h3>
                {isSlotsLoading && <div className="spinner spinner-dark" />}
              </div>
              {isSlotsLoading ? (
                <div className="loading-screen"><div className="spinner spinner-dark" /></div>
              ) : slots.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  <div className="empty-state-title">No slots available for this date</div>
                </div>
              ) : (
                <div className="slot-grid">
                  {slots.map((slot) => (
                    <button
                      key={slot._id || slot.time}
                      className={[
                        'slot-btn',
                        slot.isBooked ? 'booked' : '',
                        slot.isPast ? 'past' : '',
                        selectedSlot?.time === slot.time ? 'selected' : '',
                      ].join(' ')}
                      onClick={() => !slot.isBooked && !slot.isPast && setSelectedSlot(slot)}
                      disabled={slot.isBooked || slot.isPast}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
              {selectedSlot && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--primary-glow)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-active)', fontSize: 13 }}>
                  Selected: <strong style={{ color: 'var(--primary-light)' }}>{selectedSlot.time}</strong> on <strong style={{ color: 'var(--primary-light)' }}>{format(new Date(selectedDate + 'T12:00:00'), 'MMM d, yyyy')}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 20 }}>Confirm Appointment</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <ConfirmRow icon={<User size={18} color="var(--primary-light)" />} label="Patient" value={selectedPatient ? selectedPatient.name : newPatient.name + ' (New Patient)'} />
            <ConfirmRow icon={<Stethoscope size={18} color="var(--secondary-light)" />} label="Doctor" value={`Dr. ${selectedDoctorInfo?.name}`} />
            <ConfirmRow icon={<Building2 size={18} color="var(--info)" />} label="Department" value={selectedDoctorInfo?.department?.name} />
            <ConfirmRow icon={<Calendar size={18} color="var(--warning-light)" />} label="Date" value={format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')} />
            <ConfirmRow icon={<Clock size={18} color="var(--success-light)" />} label="Time Slot" value={selectedSlot?.time} />
          </div>
          <div className="form-group">
            <label className="form-label">Purpose of Visit</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g., Regular checkup, Fever, Follow-up..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
          {bookingError && (
            <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} /> <span>{bookingError}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}>
          {step === 0 ? 'Cancel' : 'Previous'}
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!canGoNext()}>
            Next
          </button>
        ) : (
          <button className="btn btn-success" onClick={handleBook} disabled={isBooking}>
            {isBooking ? <><span className="spinner" /> Booking...</> : 'Confirm Booking'}
          </button>
        )}
      </div>
    </div>
  );
}

function ConfirmRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{value || '—'}</div>
      </div>
    </div>
  );
}
