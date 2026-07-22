import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Search, 
  Plus, 
  X, 
  Edit2, 
  Clipboard, 
  Check, 
  AlertTriangle 
} from 'lucide-react';

const Appointments = () => {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');

  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isReschedModalOpen, setIsReschedModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);

  // Forms
  const [bookForm, setBookForm] = useState({
    patient_id: '', doctor_id: '', appointment_date: '', notes: ''
  });

  const [reschedForm, setReschedForm] = useState({
    appointment_date: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const appts = await api.appointments.getAll({
        status: statusFilter,
        date: dateFilter,
        doctorId: doctorFilter
      });
      setAppointments(appts);

      // Staff (Admin, Receptionist) need lists of doctors and patients to book
      if (user.role === 'Admin' || user.role === 'Receptionist') {
        const docs = await api.doctors.getAll();
        setDoctors(docs);
        const pats = await api.patients.getAll();
        setPatients(pats);
      }
    } catch (error) {
      showToast(error.message || 'Error fetching appointments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, dateFilter, doctorFilter]);

  // Handle book submit
  const handleBook = async (e) => {
    e.preventDefault();
    try {
      await api.appointments.create(bookForm);
      showToast('Appointment scheduled successfully!', 'success');
      setIsBookModalOpen(false);
      setBookForm({ patient_id: '', doctor_id: '', appointment_date: '', notes: '' });
      fetchData();
    } catch (error) {
      showToast(error.message || 'Failed to schedule appointment', 'error');
    }
  };

  // Open reschedule modal
  const openReschedModal = (appt) => {
    setSelectedAppt(appt);
    // Format date string for datetime-local value (YYYY-MM-DDTHH:MM)
    const localDate = new Date(appt.appointment_date);
    const tzOffset = localDate.getTimezoneOffset() * 60000;
    const formatted = new Date(localDate - tzOffset).toISOString().slice(0, 16);
    setReschedForm({ appointment_date: formatted });
    setIsReschedModalOpen(true);
  };

  // Handle reschedule submit
  const handleResched = async (e) => {
    e.preventDefault();
    try {
      await api.appointments.update(selectedAppt.id, {
        appointment_date: reschedForm.appointment_date,
        status: 'Scheduled' // Resets cancel status if they reschedule
      });
      showToast('Appointment rescheduled successfully!', 'success');
      setIsReschedModalOpen(false);
      fetchData();
    } catch (error) {
      showToast(error.message || 'Failed to reschedule appointment', 'error');
    }
  };

  // Cancel appointment
  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await api.appointments.update(id, { status: 'Cancelled' });
        showToast('Appointment marked as Cancelled.', 'info');
        fetchData();
      } catch (error) {
        showToast(error.message || 'Failed to cancel appointment', 'error');
      }
    }
  };

  // Handoff to add diagnosis (redirects doctor to medical records with prefilled details)
  const handleDiagnosisHandoff = (appt) => {
    navigate('/medical-records', { 
      state: { 
        prefill: {
          patient_id: appt.patient_id,
          patient_name: appt.patient_name,
          appointment_id: appt.id,
          notes: appt.notes
        } 
      } 
    });
  };

  return (
    <div>
      {/* Filtering Options */}
      <div className="table-container" style={{ margin: 0, borderRadius: 'var(--border-radius-md) var(--border-radius-md) 0 0' }}>
        <div className="table-header-bar">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1' }}>
            <select 
              className="form-control" 
              style={{ width: '160px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <input 
              type="date" 
              className="form-control"
              style={{ width: '160px' }}
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />

            {(user.role === 'Admin' || user.role === 'Receptionist') && (
              <select 
                className="form-control"
                style={{ width: '200px' }}
                value={doctorFilter}
                onChange={e => setDoctorFilter(e.target.value)}
              >
                <option value="">All Doctors</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="table-actions">
            {(user.role === 'Admin' || user.role === 'Receptionist') && (
              <button className="btn btn-primary" onClick={() => setIsBookModalOpen(true)}>
                <Plus size={16} /> Schedule Visit
              </button>
            )}
          </div>
        </div>

        {loading && appointments.length === 0 ? (
          <div className="loader-container"><div className="spinner"></div></div>
        ) : appointments.length === 0 ? (
          <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-secondary)' }}>
            No appointments found in the system matching filters.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                {user.role !== 'Patient' && <th>Patient Name</th>}
                {user.role !== 'Doctor' && <th>Attending Doctor</th>}
                <th>Notes / Symptoms</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.id}>
                  <td>
                    <strong>
                      {new Date(appt.appointment_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  {user.role !== 'Patient' && (
                    <td>
                      <div><strong>{appt.patient_name}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{appt.patient_contact}</div>
                    </td>
                  )}
                  {user.role !== 'Doctor' && (
                    <td>
                      <div><strong>{appt.doctor_name}</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{appt.specialty}</div>
                    </td>
                  )}
                  <td>{appt.notes || <span style={{ fontStyle: 'italic', color: 'var(--text-tertiary)' }}>None</span>}</td>
                  <td>
                    <span className={`badge badge-${appt.status.toLowerCase()}`}>{appt.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      {/* Doctor Actions */}
                      {user.role === 'Doctor' && appt.status === 'Scheduled' && (
                        <button 
                          className="btn btn-success btn-icon" 
                          title="Record Diagnosis & Complete Visit"
                          onClick={() => handleDiagnosisHandoff(appt)}
                        >
                          <Clipboard size={16} /> <span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>Diagnose</span>
                        </button>
                      )}

                      {/* Staff Reschedule */}
                      {(user.role === 'Admin' || user.role === 'Receptionist') && appt.status === 'Scheduled' && (
                        <button 
                          className="btn-icon" 
                          title="Reschedule Appointment"
                          onClick={() => openReschedModal(appt)}
                        >
                          <Edit2 size={16} />
                        </button>
                      )}

                      {/* Cancel Action (Available to Patient, Doctor, Staff for scheduled appts) */}
                      {appt.status === 'Scheduled' && (
                        <button 
                          className="btn-icon" 
                          style={{ color: 'var(--accent-danger)' }}
                          title="Cancel Appointment"
                          onClick={() => handleCancel(appt.id)}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 1. Schedule Visit Modal (Admin / Receptionist) */}
      {isBookModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Schedule Patient Consultation</span>
              <button className="btn-icon" onClick={() => setIsBookModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleBook}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Patient *</label>
                  <select 
                    className="form-control" 
                    required 
                    value={bookForm.patient_id}
                    onChange={e => setBookForm({...bookForm, patient_id: e.target.value})}
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Age: {p.age}, Tel: {p.contact_number})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Physician *</label>
                  <select 
                    className="form-control" 
                    required 
                    value={bookForm.doctor_id}
                    onChange={e => setBookForm({...bookForm, doctor_id: e.target.value})}
                  >
                    <option value="">-- Choose Doctor --</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Appointment Datetime *</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    required 
                    value={bookForm.appointment_date}
                    onChange={e => setBookForm({...bookForm, appointment_date: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Consultation / Comments</label>
                  <textarea 
                    className="form-control" 
                    rows="3"
                    value={bookForm.notes}
                    onChange={e => setBookForm({...bookForm, notes: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsBookModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule Visit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Reschedule Appointment Modal */}
      {isReschedModalOpen && selectedAppt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <span className="modal-title">Reschedule Visit</span>
              <button className="btn-icon" onClick={() => setIsReschedModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleResched}>
              <div className="modal-body">
                <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Rescheduling appointment for <strong>{selectedAppt.patient_name}</strong> with <strong>{selectedAppt.doctor_name}</strong>.
                </div>
                
                <div className="form-group">
                  <label className="form-label">New Appointment Datetime *</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    required 
                    value={reschedForm.appointment_date}
                    onChange={e => setReschedForm({ appointment_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsReschedModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Datetime</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
