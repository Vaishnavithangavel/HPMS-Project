import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  FileText, 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  Download,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

const Dashboard = () => {
  const { user, showToast } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.dashboard.getStats();
      setStats(data);
    } catch (error) {
      showToast(error.message || 'Failed to fetch dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDownloadPDF = async (recordId) => {
    try {
      showToast('Compiling report PDF...', 'info');
      await api.records.downloadPDF(recordId);
      showToast('PDF downloaded successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Error exporting PDF', 'error');
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!stats) return <div className="card"><AlertCircle /> Failed to load stats.</div>;

  // HSL curated colors for Pie Chart
  const COLORS = ['#2563eb', '#0d9488', '#8b5cf6', '#ea580c', '#ec4899', '#f59e0b'];

  // Render Admin / Receptionist Dashboard
  const renderAdminDashboard = () => {
    const { totalPatients, totalDoctors, appointmentsToday, breakdown } = stats.metrics;
    const { specialtyLoads, weeklyTrends } = stats.charts;

    const completed = breakdown.find(b => b.status === 'Completed')?.count || 0;
    const scheduled = breakdown.find(b => b.status === 'Scheduled')?.count || 0;
    const cancelled = breakdown.find(b => b.status === 'Cancelled')?.count || 0;
    const totalAppts = completed + scheduled + cancelled;

    return (
      <>
        {/* Metric Cards */}
        <div className="card-grid">
          <div className="card">
            <div className="card-title">Total Registered Patients</div>
            <div className="card-value">{totalPatients}</div>
            <div className="card-subtext">Active health profiles</div>
            <Users className="card-icon" />
          </div>

          <div className="card">
            <div className="card-title">Staff Physicians</div>
            <div className="card-value">{totalDoctors}</div>
            <div className="card-subtext">Across multiple specialties</div>
            <UserCheck className="card-icon" />
          </div>

          <div className="card">
            <div className="card-title">Appointments Today</div>
            <div className="card-value">{appointmentsToday}</div>
            <div className="card-subtext">Scheduled outpatient visits</div>
            <Calendar className="card-icon" />
          </div>

          <div className="card">
            <div className="card-title">Total Bookings</div>
            <div className="card-value">{totalAppts}</div>
            <div className="card-subtext">{scheduled} Pending | {completed} Completed</div>
            <Clock className="card-icon" />
          </div>
        </div>

        {/* Charts Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Line Chart: Trends */}
          <div className="card" style={{ minHeight: '350px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} /> Booking Trends (Last 7 Days)
            </h3>
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrends}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }} />
                  <Line type="monotone" dataKey="count" stroke="var(--accent-primary)" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart: Specialty Loads */}
          <div className="card" style={{ minHeight: '350px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🩺 Department Workloads (Bookings)
            </h3>
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={specialtyLoads}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="specialty" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }} />
                  <Bar dataKey="count" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]}>
                    {specialtyLoads.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Security logs section (Only for Admin) */}
        {user.role === 'Admin' && (
          <div className="table-container">
            <div className="table-header-bar">
              <span className="table-title">Recent Security Events & Audits</span>
            </div>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>
                      <span className="badge badge-role">{log.username || 'System'}</span>
                    </td>
                    <td>
                      <span className={`badge ${log.action.includes('FAIL') ? 'badge-cancelled' : 'badge-scheduled'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.details}</td>
                    <td><code>{log.ip_address}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  // Render Doctor Dashboard
  const renderDoctorDashboard = () => {
    const { uniquePatients, recordsAuthored, todayScheduled } = stats.metrics;

    return (
      <>
        {/* Doctor Metrics */}
        <div className="card-grid">
          <div className="card">
            <div className="card-title">My Managed Patients</div>
            <div className="card-value">{uniquePatients}</div>
            <div className="card-subtext">Unique clinical consultations</div>
            <Users className="card-icon" />
          </div>

          <div className="card">
            <div className="card-title">Consultations Documented</div>
            <div className="card-value">{recordsAuthored}</div>
            <div className="card-subtext">Medical records authored</div>
            <FileText className="card-icon" />
          </div>

          <div className="card">
            <div className="card-title">Today's Schedule</div>
            <div className="card-value">{todayScheduled}</div>
            <div className="card-subtext">Pending appointments today</div>
            <Calendar className="card-icon" />
          </div>
        </div>

        {/* Today's Schedule list */}
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">Scheduled Consultations for Today</span>
          </div>
          {stats.todayAppointments.length === 0 ? (
            <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-secondary)' }}>
              No appointments scheduled for today. Enjoy your day!
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Time Slot</th>
                  <th>Patient Name</th>
                  <th>Age / Gender</th>
                  <th>Reason for Visit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.todayAppointments.map((appt) => (
                  <tr key={appt.id}>
                    <td>
                      <strong>
                        {new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </strong>
                    </td>
                    <td>{appt.patient_name}</td>
                    <td>{appt.patient_age} yrs / {appt.patient_gender}</td>
                    <td>{appt.notes || 'Routine consultation'}</td>
                    <td>
                      <span className={`badge badge-${appt.status.toLowerCase()}`}>{appt.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  };

  // Render Patient Dashboard
  const renderPatientDashboard = () => {
    const { upcomingAppointments, totalVisits } = stats.metrics;
    const upcomingList = stats.upcomingAppointmentsList;
    const latestRecord = stats.latestRecord;

    return (
      <>
        {/* Patient Metrics */}
        <div className="card-grid">
          <div className="card">
            <div className="card-title">Upcoming Appointments</div>
            <div className="card-value">{upcomingAppointments}</div>
            <div className="card-subtext">Scheduled clinical sessions</div>
            <Calendar className="card-icon" />
          </div>

          <div className="card">
            <div className="card-title">Total Clinic Visits</div>
            <div className="card-value">{totalVisits}</div>
            <div className="card-subtext">Archived medical summaries</div>
            <FileText className="card-icon" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Upcoming Appointments Table */}
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Upcoming Appointments Calendar</h3>
            {upcomingList.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>
                You have no upcoming appointments scheduled.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingList.map((appt) => (
                  <div key={appt.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{appt.doctor_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{appt.specialty}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                        {new Date(appt.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                    <span className="badge badge-scheduled">{appt.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Latest Clinical consultation */}
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Latest Consultation Summary</h3>
            {!latestRecord ? (
              <div style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>
                No clinical consultations recorded yet.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                  <div>
                    <h4 style={{ color: 'var(--accent-primary)' }}>{latestRecord.doctor_name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      Date: {new Date(latestRecord.visit_date).toLocaleDateString()}
                    </span>
                  </div>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleDownloadPDF(latestRecord.id)}
                    title="Download Medical Summary PDF"
                  >
                    <Download size={16} /> PDF
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: '600', textTransform: 'uppercase' }}>Diagnosis</div>
                    <p style={{ fontSize: '0.9rem', fontWeight: '500' }}>{latestRecord.diagnosis}</p>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: '600', textTransform: 'uppercase' }}>Prescribed Rx</div>
                    <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                      {latestRecord.prescription}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div>
      {stats.role === 'Admin' || stats.role === 'Receptionist' ? renderAdminDashboard() : null}
      {stats.role === 'Doctor' ? renderDoctorDashboard() : null}
      {stats.role === 'Patient' ? renderPatientDashboard() : null}
    </div>
  );
};

export default Dashboard;
