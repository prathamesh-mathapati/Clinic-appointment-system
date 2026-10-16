import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { X, Plus, Users, UserCheck } from 'lucide-react';
import { staffService, departmentService, doctorService } from '../services/apiService';

export default function StaffManagerPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showReceptionistModal, setShowReceptionistModal] = useState(false);

  const [newDoctor, setNewDoctor] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    specialization: '',
    phone: '',
  });

  const [newReceptionist, setNewReceptionist] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  useEffect(() => {
    loadStaff();
    loadDepartments();
  }, []);

  const loadStaff = async () => {
    try {
      setIsLoading(true);
      let staffList = [];
      try {
        const res = await staffService.getAll();
        staffList = res.data?.data?.staff || [];
      } catch (e) {
        const docRes = await doctorService.getAll();
        staffList = (docRes.data?.data?.doctors || []).map((d) => ({
          ...d,
          role: 'doctor',
        }));
      }
      setStaff(staffList);
    } catch (err) {
      console.error('Error loading staff:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data?.data?.departments || []);
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await staffService.createDoctor(newDoctor);
      toast.success('Doctor created successfully!');
      setShowDoctorModal(false);
      setNewDoctor({ name: '', email: '', password: '', department: '', specialization: '', phone: '' });
      loadStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create doctor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateReceptionist = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await staffService.createReceptionist(newReceptionist);
      toast.success('Receptionist created successfully!');
      setShowReceptionistModal(false);
      setNewReceptionist({ name: '', email: '', password: '', phone: '' });
      loadStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create receptionist');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStaff = staff.filter((member) => {
    if (activeTab === 'all') return true;
    return member.role === activeTab;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Staff & User Management</h2>
          <p className="page-subtitle">
            Super Admin portal to manage Doctors, Receptionists, and clinic team members.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowReceptionistModal(true)}>
            + Add Receptionist
          </button>
          <button className="btn btn-primary" onClick={() => setShowDoctorModal(true)}>
            + Add Doctor
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'all', label: 'All Staff' },
              { id: 'doctor', label: 'Doctors' },
              { id: 'receptionist', label: 'Receptionists' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Total: <strong>{filteredStaff.length}</strong> staff member(s)
          </span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 50, borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No staff members found</div>
            <div className="empty-state-text">Click the buttons above to add a Doctor or Receptionist.</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Department / Specialization</th>
                  <th>Contact</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => (
                  <tr key={member._id || member.email}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-full)',
                            background:
                              member.role === 'doctor'
                                ? 'linear-gradient(135deg, var(--success), #047857)'
                                : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {member.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {member.role === 'doctor' ? `Dr. ${member.name}` : member.name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge`}
                        style={{
                          background: member.role === 'doctor' ? 'var(--success-bg)' : 'var(--primary-glow)',
                          color: member.role === 'doctor' ? 'var(--success-light)' : 'var(--primary-light)',
                          border: `1px solid ${member.role === 'doctor' ? 'var(--success)' : 'var(--primary)'}`,
                        }}
                      >
                        {member.role === 'doctor' ? 'Doctor' : 'Receptionist'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                        {member.department?.name || '—'}
                      </div>
                      {member.specialization && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{member.specialization}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {member.phone || member.mobile || '—'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {member.role === 'doctor' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate('/admin/schedules')}
                        >
                          Schedule
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDoctorModal && (
        <div className="modal-overlay" onClick={() => setShowDoctorModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Doctor</h3>
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
                  <label className="form-label">Email *</label>
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
                    placeholder="Login password"
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
                      <option value="">Select Department...</option>
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
                      placeholder="e.g. Cardiology"
                      value={newDoctor.specialization}
                      onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
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

      {showReceptionistModal && (
        <div className="modal-overlay" onClick={() => setShowReceptionistModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Receptionist</h3>
              <button className="modal-close" onClick={() => setShowReceptionistModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateReceptionist}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Priya Sharma"
                    value={newReceptionist.name}
                    onChange={(e) => setNewReceptionist({ ...newReceptionist, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    required
                    className="form-control"
                    placeholder="reception@clinic.com"
                    value={newReceptionist.email}
                    onChange={(e) => setNewReceptionist({ ...newReceptionist, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    required
                    className="form-control"
                    placeholder="Login password"
                    value={newReceptionist.password}
                    onChange={(e) => setNewReceptionist({ ...newReceptionist, password: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="+91 9876543212"
                    value={newReceptionist.phone}
                    onChange={(e) => setNewReceptionist({ ...newReceptionist, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReceptionistModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? <span className="spinner" /> : 'Create Receptionist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
