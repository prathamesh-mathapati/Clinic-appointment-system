import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isPast, isSameDay } from 'date-fns';
import { CalendarDays, Calendar, CalendarPlus, CalendarX, UserCheck } from 'lucide-react';
import { doctorService, slotService } from '../services/apiService';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function SchedulerPage() {
  const { user } = useAuth();
  const { subscribe } = useSocket();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);

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

  const fetchSlots = useCallback(async () => {
    if (!selectedDoctor) {
      setSlots([]);
      return;
    }
    try {
      setIsSlotsLoading(true);
      const res = await slotService.getSlots({
        doctorId: selectedDoctor,
        date: format(selectedDate, 'yyyy-MM-dd'),
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

  useEffect(() => {
    const unsub1 = subscribe('appointment:created', () => fetchSlots());
    const unsub2 = subscribe('appointment:cancelled', () => fetchSlots());
    const interval = setInterval(() => {
      if (selectedDoctor) fetchSlots();
    }, 30000);

    return () => {
      unsub1();
      unsub2();
      clearInterval(interval);
    };
  }, [subscribe, fetchSlots, selectedDoctor]);

  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startingDayOfWeek = getDay(monthStart);
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleBookSlot = () => {
    if (!selectedSlot || !selectedDoctor) return;
    navigate('/appointments/new', {
      state: {
        doctorId: selectedDoctor,
        date: format(selectedDate, 'yyyy-MM-dd'),
        slotTime: selectedSlot.time,
        slotId: selectedSlot._id,
      },
    });
  };

  const selectedDoctorInfo = doctors.find((d) => d._id === selectedDoctor);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarDays size={22} /> Appointment Scheduler
          </h2>
          <p className="page-subtitle">View available slots and schedule appointments</p>
        </div>
      </div>

      <div className="filters-bar" style={{ marginBottom: 24 }}>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
          <select
            className="form-control"
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedDoctor('');
            }}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 200 }}>
          <select
            className="form-control"
            value={selectedDoctor}
            onChange={(e) => {
              setSelectedDoctor(e.target.value);
              setSelectedSlot(null);
            }}
          >
            <option value="">Select Doctor</option>
            {filteredDoctors.map((doc) => (
              <option key={doc._id} value={doc._id}>
                Dr. {doc.name} — {doc.department?.name || 'General'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
        <div className="calendar-wrapper">
          <div className="calendar-header">
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
              ‹
            </button>
            <span className="calendar-month">{format(calendarMonth, 'MMMM yyyy')}</span>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
              ›
            </button>
          </div>

          <div className="calendar-grid">
            {DAY_NAMES.map((d) => (
              <div key={d} className="calendar-day-name">{d}</div>
            ))}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`e${i}`} className="calendar-day empty" />
            ))}
            {daysInMonth.map((day) => {
              const dayPast = isPast(day) && !isToday(day);
              const daySelected = isSameDay(day, selectedDate);
              const dayToday = isToday(day);
              return (
                <div
                  key={day.toString()}
                  className={[
                    'calendar-day',
                    dayPast ? 'past' : '',
                    daySelected ? 'selected' : '',
                    dayToday && !daySelected ? 'today' : '',
                  ].join(' ')}
                  onClick={() => !dayPast && setSelectedDate(day)}
                >
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} /> {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </span>
            {isToday(selectedDate) && <span className="badge badge-available" style={{ fontSize: 10 }}>Today</span>}
          </div>
        </div>

        <div>
          {!selectedDoctor ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon"><UserCheck size={40} /></div>
                <div className="empty-state-title">Select a Doctor</div>
                <div className="empty-state-text">Choose a doctor to view available appointment slots</div>
              </div>
            </div>
          ) : (
            <div className="card">
              {selectedDoctorInfo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'white', fontWeight: 700 }}>
                    {selectedDoctorInfo.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dr. {selectedDoctorInfo.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedDoctorInfo.specialization} · {selectedDoctorInfo.department?.name}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Slot Duration</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedDoctorInfo.slotDuration || 15} min</div>
                  </div>
                </div>
              )}

              <div className="card-header" style={{ marginBottom: 8 }}>
                <h3 className="card-title">Available Slots</h3>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  <LegendItem color="var(--bg-input)" label="Available" />
                  <LegendItem color="var(--danger-bg)" label="Booked" />
                  <LegendItem color="var(--primary)" label="Selected" />
                </div>
              </div>

              {isSlotsLoading ? (
                <div className="loading-screen"><div className="spinner spinner-dark" /> Loading slots...</div>
              ) : slots.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon"><CalendarX size={40} /></div>
                  <div className="empty-state-title">No slots available</div>
                  <div className="empty-state-text">Doctor has no schedule for this date</div>
                </div>
              ) : (
                <>
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
                        title={slot.isBooked ? 'Already booked' : slot.isPast ? 'Past time' : `Book ${slot.time}`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>

                  {selectedSlot && (
                    <div style={{ marginTop: 20, padding: '16px', background: 'var(--primary-glow)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-active)' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                        Selected: <strong style={{ color: 'var(--primary-light)' }}>{selectedSlot.time}</strong> on <strong style={{ color: 'var(--primary-light)' }}>{format(selectedDate, 'MMM d, yyyy')}</strong>
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={handleBookSlot}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        disabled={!['super_admin', 'receptionist'].includes(user?.role)}
                      >
                        <CalendarPlus size={16} /> Book This Slot
                      </button>
                      {user?.role === 'doctor' && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>Only Receptionists and Admins can book</p>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>Total: <strong style={{ color: 'var(--text-primary)' }}>{slots.length}</strong></span>
                    <span>Available: <strong style={{ color: 'var(--success-light)' }}>{slots.filter((s) => !s.isBooked && !s.isPast).length}</strong></span>
                    <span>Booked: <strong style={{ color: 'var(--danger-light)' }}>{slots.filter((s) => s.isBooked).length}</strong></span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}
