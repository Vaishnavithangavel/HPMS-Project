import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShieldAlert, RefreshCw } from 'lucide-react';

const AuditLogs = () => {
  const { user, showToast } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [limit, setLimit] = useState('100');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.audit.getLogs(actionFilter, limit);
      setLogs(data);
    } catch (error) {
      showToast(error.message || 'Failed to load security logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, limit]);

  if (user.role !== 'Admin') {
    return (
      <div className="card" style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--accent-danger)' }}>
        <ShieldAlert /> Access Denied: Audit Logs are only viewable by System Administrators.
      </div>
    );
  }

  // Predefined security actions for fast filtering
  const actionsList = [
    'DATABASE_INIT',
    'USER_LOGIN',
    'LOGIN_FAILED',
    'USER_REGISTERED',
    'DOCTOR_CREATED',
    'PATIENT_REGISTERED',
    'PATIENT_UPDATED',
    'PATIENT_DELETED',
    'APPOINTMENT_SCHEDULED',
    'APPOINTMENT_UPDATED',
    'APPOINTMENT_DELETED',
    'MEDICAL_RECORD_CREATED',
    'MEDICAL_RECORD_UPDATED',
    'MEDICAL_RECORD_DELETED',
  ];

  return (
    <div>
      <div className="table-container">
        <div className="table-header-bar">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
            <select 
              className="form-control" 
              style={{ width: '240px' }}
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="">All Audit Actions</option>
              {actionsList.map((act, i) => (
                <option key={i} value={act}>{act}</option>
              ))}
            </select>

            <select 
              className="form-control" 
              style={{ width: '120px' }}
              value={limit}
              onChange={e => setLimit(e.target.value)}
            >
              <option value="50">Last 50</option>
              <option value="100">Last 100</option>
              <option value="250">Last 250</option>
              <option value="500">Last 500</option>
            </select>
          </div>

          <button className="btn btn-secondary" onClick={fetchLogs} title="Refresh Logs">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {loading && logs.length === 0 ? (
          <div className="loader-container"><div className="spinner"></div></div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-secondary)' }}>
            No audit records matching filters found.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Log Timestamp</th>
                <th>User Account</th>
                <th>Role</th>
                <th>Security Action</th>
                <th>Description Details</th>
                <th>Source IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <strong>{new Date(log.created_at).toLocaleString()}</strong>
                  </td>
                  <td>
                    <span style={{ fontWeight: '600' }}>{log.username || 'SYSTEM'}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>ID: {log.user_id || 'N/A'}</div>
                  </td>
                  <td>
                    <span className="badge badge-role">{log.role || 'System'}</span>
                  </td>
                  <td>
                    <span className={`badge ${log.action.includes('FAIL') || log.action.includes('DELETE') ? 'badge-cancelled' : 'badge-scheduled'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <div style={{ maxWidth: '350px', fontSize: '0.9rem' }}>{log.details}</div>
                  </td>
                  <td>
                    <code>{log.ip_address || '127.0.0.1'}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
