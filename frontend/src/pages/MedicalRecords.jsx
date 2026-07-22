import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useLocation } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  Download, 
  Search,
  Eye
} from 'lucide-react';

const MedicalRecords = () => {
  const { user, showToast } = useAuth();
  const location = useLocation();
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  // Filters
  const [patientFilter, setPatientFilter] = useState('');

  // Add Form
  const [addForm, setAddForm] = useState({
    patient_id: '', appointment_id: '', diagnosis: '', treatment: '', prescription: '', 
    visit_date: new Date().toISOString().slice(0, 10)
  });

  // Edit Form
  const [editForm, setEditForm] = useState({
    diagnosis: '', treatment: '', prescription: ''
  });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await api.records.getAll(patientFilter);
      setRecords(data);
      
      if (user.role === 'Doctor' || user.role === 'Admin') {
        const pats = await api.patients.getAll();
        setPatients(pats);
      }
    } catch (error) {
      showToast(error.message || 'Error fetching medical records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [patientFilter]);

  // Handle prefill from Appointments page (Handoff)
  useEffect(() => {
    if (location.state && location.state.prefill && user.role === 'Doctor') {
      const { patient_id, appointment_id } = location.state.prefill;
      setAddForm({
        patient_id: patient_id.toString(),
        appointment_id: appointment_id ? appointment_id.toString() : '',
        diagnosis: '',
        treatment: '',
        prescription: '',
        visit_date: new Date().toISOString().slice(0, 10)
      });
      setIsAddModalOpen(true);
      // Clear location state history so it doesn't trigger again on page refreshes
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // When patient is selected in Add Form, fetch their scheduled appointments to link
  useEffect(() => {
    const loadPatientScheduledAppointments = async () => {
      if (!addForm.patient_id) {
        setAppointments([]);
        return;
      }
      try {
        const appts = await api.patients.getAppointments(addForm.patient_id);
        // Only link to Scheduled appointments
        const scheduled = appts.filter(a => a.status === 'Scheduled');
        setAppointments(scheduled);
      } catch (err) {
        console.error('Failed to load appointments for patient:', err);
      }
    };
    loadPatientScheduledAppointments();
  }, [addForm.patient_id]);

  // Handle add record submit
  const handleAddRecord = async (e) => {
    e.preventDefault();
    try {
      await api.records.create({
        ...addForm,
        patient_id: parseInt(addForm.patient_id),
        appointment_id: addForm.appointment_id ? parseInt(addForm.appointment_id) : null
      });
      showToast('Medical record documented successfully!', 'success');
      setIsAddModalOpen(false);
      setAddForm({
        patient_id: '', appointment_id: '', diagnosis: '', treatment: '', prescription: '',
        visit_date: new Date().toISOString().slice(0, 10)
      });
      fetchRecords();
    } catch (error) {
      showToast(error.message || 'Failed to create medical record', 'error');
    }
  };

  // Open edit modal
  const openEditModal = (rec) => {
    setSelectedRecordId(rec.id);
    setEditForm({
      diagnosis: rec.diagnosis,
      treatment: rec.treatment,
      prescription: rec.prescription
    });
    setIsEditModalOpen(true);
  };

  // Handle edit submit
  const handleEditRecord = async (e) => {
    e.preventDefault();
    try {
      await api.records.update(selectedRecordId, editForm);
      showToast('Medical record updated.', 'success');
      setIsEditModalOpen(false);
      fetchRecords();
    } catch (error) {
      showToast(error.message || 'Failed to update record', 'error');
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this clinical record?')) {
      try {
        await api.records.delete(id);
        showToast('Medical record deleted.', 'success');
        fetchRecords();
      } catch (error) {
        showToast(error.message || 'Error deleting medical record', 'error');
      }
    }
  };

  // Handle download PDF
  const downloadPDF = async (recordId) => {
    try {
      showToast('Compiling report PDF...', 'info');
      await api.records.downloadPDF(recordId);
      showToast('PDF downloaded successfully.', 'success');
    } catch (error) {
      showToast(error.message || 'Error compiling PDF report', 'error');
    }
  };

  return (
    <div>
      {/* Filtering Options */}
      <div className="table-container" style={{ margin: 0, borderRadius: 'var(--border-radius-md) var(--border-radius-md) 0 0' }}>
        <div className="table-header-bar">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1' }}>
            {(user.role === 'Admin' || user.role === 'Doctor') && (
              <select 
                className="form-control"
                style={{ width: '220px' }}
                value={patientFilter}
                onChange={e => setPatientFilter(e.target.value)}
              >
                <option value="">All Patients</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="table-actions">
            {user.role === 'Doctor' && (
              <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                <Plus size={16} /> Add Clinical Record
              </button>
            )}
          </div>
        </div>

        {loading && records.length === 0 ? (
          <div className="loader-container"><div className="spinner"></div></div>
        ) : records.length === 0 ? (
          <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-secondary)' }}>
            No medical records found in the clinic directory.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date of Visit</th>
                {user.role !== 'Patient' && <th>Patient Name</th>}
                <th>Attending Doctor</th>
                <th>Diagnosis Summary</th>
                <th>Treatment Prescribed</th>
                <th>Prescription Rx</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id}>
                  <td>
                    <strong>{new Date(rec.visit_date).toLocaleDateString()}</strong>
                  </td>
                  {user.role !== 'Patient' && (
                    <td>
                      <strong>{rec.patient_name}</strong>
                    </td>
                  )}
                  <td>
                    <div><strong>Dr. {rec.doctor_name}</strong></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{rec.specialty}</div>
                  </td>
                  <td>
                    <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.diagnosis}>
                      {rec.diagnosis}
                    </div>
                  </td>
                  <td>
                    <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.treatment}>
                      {rec.treatment}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontStyle: 'italic', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.prescription}>
                      {rec.prescription}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button 
                        className="btn-icon" 
                        title="Download Consultation Report (PDF)"
                        onClick={() => downloadPDF(rec.id)}
                      >
                        <Download size={18} />
                      </button>
                      
                      {/* Edit option for authoring Doctor */}
                      {user.role === 'Doctor' && rec.doctor_id === user.profile?.id && (
                        <button 
                          className="btn-icon" 
                          title="Edit Diagnosis details"
                          onClick={() => openEditModal(rec)}
                        >
                          <Edit2 size={18} />
                        </button>
                      )}

                      {/* Delete option for Admin only */}
                      {user.role === 'Admin' && (
                        <button 
                          className="btn-icon" 
                          style={{ color: 'var(--accent-danger)' }}
                          title="Delete Record"
                          onClick={() => handleDelete(rec.id)}
                        >
                          <Trash2 size={18} />
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

      {/* 1. Add Medical Record Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <span className="modal-title">Document Consultation Record</span>
              <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddRecord}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Select Patient *</label>
                    <select 
                      className="form-control" 
                      required 
                      value={addForm.patient_id}
                      onChange={e => setAddForm({...addForm, patient_id: e.target.value})}
                    >
                      <option value="">-- Choose Patient --</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Link Appointment (Optional)</label>
                    <select 
                      className="form-control" 
                      value={addForm.appointment_id}
                      onChange={e => setAddForm({...addForm, appointment_id: e.target.value})}
                      disabled={!addForm.patient_id || appointments.length === 0}
                    >
                      <option value="">-- Select Appointment --</option>
                      {appointments.map(a => (
                        <option key={a.id} value={a.id}>
                          {new Date(a.appointment_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </option>
                      ))}
                    </select>
                    {addForm.patient_id && appointments.length === 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>No scheduled visits today.</span>
                    )}
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Date of Consultation *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      required 
                      value={addForm.visit_date}
                      onChange={e => setAddForm({...addForm, visit_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Diagnosis & Findings *</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    required 
                    placeholder="Enter diagnosis findings, symptoms, and medical notes..."
                    value={addForm.diagnosis}
                    onChange={e => setAddForm({...addForm, diagnosis: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Treatment Plan *</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    required 
                    placeholder="Outline patient recovery plans, follow-ups, therapy, or dietary changes..."
                    value={addForm.treatment}
                    onChange={e => setAddForm({...addForm, treatment: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Prescription (Rx) *</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    required 
                    placeholder="Generic Name - Dosage - Frequency - Duration - Quantity (e.g. Paracetamol 500mg - 1 tab - 3x daily - 5 days)"
                    value={addForm.prescription}
                    onChange={e => setAddForm({...addForm, prescription: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Consultation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Medical Record Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Edit Clinical Record</span>
              <button className="btn-icon" onClick={() => setIsEditModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditRecord}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Diagnosis & Findings *</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    required 
                    value={editForm.diagnosis}
                    onChange={e => setEditForm({...editForm, diagnosis: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Treatment Plan *</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    required 
                    value={editForm.treatment}
                    onChange={e => setEditForm({...editForm, treatment: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Prescription (Rx) *</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    required 
                    value={editForm.prescription}
                    onChange={e => setEditForm({...editForm, prescription: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecords;
