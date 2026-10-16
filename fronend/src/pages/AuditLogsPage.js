import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { auditService } from '../services/apiService';

const ACTION_COLORS = {
  LOGIN: { bg: 'var(--primary-glow)', color: 'var(--primary-light)', label: 'User Login' },
  LOGOUT: { bg: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)', label: 'User Logout' },
  APPOINTMENT_CREATED: { bg: 'var(--success-bg)', color: 'var(--success-light)', label: 'Appointment Created' },
  APPOINTMENT_UPDATED: { bg: 'var(--info-bg)', color: 'var(--info)', label: 'Appointment Updated' },
  APPOINTMENT_CANCELLED: { bg: 'var(--danger-bg)', color: 'var(--danger-light)', label: 'Appointment Cancelled' },
  APPOINTMENT_ARRIVED: { bg: 'var(--warning-bg)', color: 'var(--warning-light)', label: 'Patient Arrived' },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [filterAction, setFilterAction] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await auditService.getAll({
        action: filterAction || undefined,
        role: filterRole || undefined,
        search: searchTerm || undefined,
        page: meta.page,
        limit: 20,
      });
      setLogs(res.data?.data?.logs || []);
      setMeta(res.data?.data?.meta || { total: 0, page: 1, pages: 1 });
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterAction, filterRole, searchTerm, meta.page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Audit Trail & Security Logs</h2>
          <p className="page-subtitle">
            System activity logging for compliance, auth events, and appointment mutations.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchLogs}>
          Refresh Logs
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Search User / Entity</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Action Filter</label>
            <select
              className="form-control"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="LOGIN">User Login</option>
              <option value="APPOINTMENT_CREATED">Appointment Created</option>
              <option value="APPOINTMENT_UPDATED">Appointment Updated</option>
              <option value="APPOINTMENT_CANCELLED">Appointment Cancelled</option>
              <option value="APPOINTMENT_ARRIVED">Patient Arrived</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Role Filter</label>
            <select
              className="form-control"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="receptionist">Receptionist</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: 46, borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No audit log records found</div>
            <div className="empty-state-text">
              Audit events will appear here when actions occur across the EMR system.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User & Role</th>
                  <th>Entity</th>
                  <th>Details / Payload</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionCfg = ACTION_COLORS[log.action] || {
                    bg: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    label: log.action,
                  };
                  return (
                    <tr key={log._id || log.id}>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {log.createdAt ? format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss') : 'Just now'}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: actionCfg.bg,
                            color: actionCfg.color,
                            border: `1px solid ${actionCfg.color}`,
                          }}
                        >
                          {actionCfg.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {log.userName || log.user?.name || 'System User'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {log.userRole || log.user?.role || 'Staff'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {log.entity || 'Appointment'}
                        </div>
                        {log.entityId && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            ID: {String(log.entityId).slice(-6)}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 300 }}>
                        {log.details || log.description || (
                          <span style={{ color: 'var(--text-muted)' }}>Action performed successfully</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
