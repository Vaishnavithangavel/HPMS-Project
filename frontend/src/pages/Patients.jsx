import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  X, 
  Calendar, 
  FileText, 
  UserPlus, 
  Download 
} from 'lucide-react';

const Patients = () => {
  const { user, showToast } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  // Modals & Drawers state
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState({ patient: null, records: [], appointments: [] });

  // Registration Form
  const [regForm, setRegForm] = useState({
    name: '', age: '', gender: 'Male', contact_number: '', address: '', emergency_contact: '', medical_history: '',
    email: '', create_login: false
  });

  // Edit Form
  const [editForm, setEditForm] = useState({
    name: '', age: '', gender: 'Male', contact_number: '', address: '', emergency_contact: '', medical_history: ''
  });

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await api.patients.getAll(search, genderFilter);
      setPatients(data);
    } catch (error) {
      showToast(error.message || 'Error fetching patients list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [search, genderFilter]);

  // Handle patient register submit
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.patients.create({
        ...regForm,
        age: parseInt(regForm.age)
      });
      showToast('Patient registered successfully!', 'success');
      setIsRegModalOpen(false);
      setRegForm({
        name: '', age: '', gender: 'Male', contact_number: '', address: '', emergency_contact: '', medical_history: '',
        email: '', create_login: false
      });
      fetchPatients();
    } catch (error) {
      showToast(error.message || 'Failed to register patient', 'error');
    }
  };

  // Open edit modal & populate form
  const openEditModal = (patient) => {
    setSelectedPatientId(patient.id);
    setEditForm({
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      contact_number: patient.contact_number,
      address: patient.address,
      emergency_contact: patient.emergency_contact,
      medical_history: patient.medical_history || ''
    });
    setIsEditModalOpen(true);
  };

  // Handle edit submit
  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.patients.update(selectedPatientId, {
        ...editForm,
        age: parseInt(editForm.age)
      });
      showToast('Patient record updated successfully!', 'success');
      setIsEditModalOpen(false);
      fetchPatients();
    } catch (error) {
      showToast(error.message || 'Failed to update patient record', 'error');
    }
  };

  // Handle delete patient
  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete patient "${name}"?\nThis will permanently delete all linked appointments and medical records.`)) {
      try {
        await api.patients.delete(id);
        showToast('Patient profile deleted.', 'success');
        fetchPatients();
        if (isDrawerOpen && drawerData.patient?.id === id) {
          setIsDrawerOpen(false);
        }
      } catch (error) {
        showToast(error.message || 'Error deleting patient record', 'error');
      }
    }
  };

  // Open drawer and load patient medical history
  const openDrawer = async (patient) => {
    try {
      setIsDrawerOpen(true);
      // Set patient immediately so drawer doesn't crash on load
      setDrawerData({ patient, records: [], appointments: [] });

      const records = await api.patients.getRecords(patient.id);
      const appointments = await api.patients.getAppointments(patient.id);

      setDrawerData({ patient, records, appointments });
    } catch (error) {
      showToast('Error loading patient history records', 'error');
    }
  };

  const downloadPDFReport = async (recordId) => {
    try {
      showToast('Compiling report PDF...', 'info');
      await api.records.downloadPDF(recordId);
      showToast('PDF downloaded successfully.', 'success');
    } catch (error) {
      showToast(error.message || 'Error downloading PDF', 'error');
    }
  };

  return (
    <div>
      {/* Table & Filtering */}
      <div className="table-container">
        <div className="table-header-bar">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by name or phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-actions">
            <select 
              className="form-control" 
              style={{ width: '150px' }}
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>

            {user.role !== 'Doctor' && (
              <button className="btn btn-primary" onClick={() => setIsRegModalOpen(true)}>
                <Plus size={16} /> Register Patient
              </button>
            )}
          </div>
        </div>

        {loading && patients.length === 0 ? (
          <div className="loader-container"><div className="spinner"></div></div>
        ) : patients.length === 0 ? (
          <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-secondary)' }}>
            No patients found matching your search.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Age / Gender</th>
                <th>Contact Number</th>
                <th>Emergency Contact</th>
                <th>Registration Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td><strong>{patient.name}</strong></td>
                  <td>{patient.age} yrs / {patient.gender}</td>
                  <td>{patient.contact_number}</td>
                  <td>{patient.emergency_contact}</td>
                  <td>{new Date(patient.created_at).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button 
                        className="btn-icon" 
                        title="View Medical History" 
                        onClick={() => openDrawer(patient)}
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        className="btn-icon" 
                        title="Edit Profile"
                        onClick={() => openEditModal(patient)}
                      >
                        <Edit2 size={18} />
                      </button>
                      {user.role === 'Admin' && (
                        <button 
                          className="btn-icon" 
                          style={{ color: 'var(--accent-danger)' }}
                          title="Delete Patient"
                          onClick={() => handleDelete(patient.id, patient.name)}
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

      {/* 1. Register Patient Modal */}
      {isRegModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Register Patient Profile</span>
              <button className="btn-icon" onClick={() => setIsRegModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleRegister}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={regForm.name} 
                    onChange={e => setRegForm({...regForm, name: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Age *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    required 
                    value={regForm.age} 
                    onChange={e => setRegForm({...regForm, age: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select 
                    className="form-control" 
                    value={regForm.gender} 
                    onChange={e => setRegForm({...regForm, gender: e.target.value})}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    required 
                    value={regForm.contact_number} 
                    onChange={e => setRegForm({...regForm, contact_number: e.target.value})} 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Residential Address *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={regForm.address} 
                    onChange={e => setRegForm({...regForm, address: e.target.value})} 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Emergency Contact Info *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="Relation Name - Phone" 
                    value={regForm.emergency_contact} 
                    onChange={e => setRegForm({...regForm, emergency_contact: e.target.value})} 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Medical History / Chronic Conditions</label>
                  <textarea 
                    className="form-control" 
                    rows="2" 
                    value={regForm.medical_history} 
                    onChange={e => setRegForm({...regForm, medical_history: e.target.value})} 
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="create_login"
                    checked={regForm.create_login}
                    onChange={e => setRegForm({...regForm, create_login: e.target.checked})}
                  />
                  <label htmlFor="create_login" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    Create user credentials (Online access)
                  </label>
                </div>

                {regForm.create_login && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Email Address *</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      required 
                      placeholder="patient@email.com" 
                      value={regForm.email} 
                      onChange={e => setRegForm({...regForm, email: e.target.value})} 
                    />
                    <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                      Login credentials: Username will be derived from email, password will match the patient's contact phone number.
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRegModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Patient Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Edit Patient Profile</span>
              <button className="btn-icon" onClick={() => setIsEditModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={editForm.name} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Age *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    required 
                    value={editForm.age} 
                    onChange={e => setEditForm({...editForm, age: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select 
                    className="form-control" 
                    value={editForm.gender} 
                    onChange={e => setEditForm({...editForm, gender: e.target.value})}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    required 
                    value={editForm.contact_number} 
                    onChange={e => setEditForm({...editForm, contact_number: e.target.value})} 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Residential Address *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={editForm.address} 
                    onChange={e => setEditForm({...editForm, address: e.target.value})} 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Emergency Contact Info *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={editForm.emergency_contact} 
                    onChange={e => setEditForm({...editForm, emergency_contact: e.target.value})} 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Medical History / Chronic Conditions</label>
                  <textarea 
                    className="form-control" 
                    rows="2" 
                    value={editForm.medical_history} 
                    onChange={e => setEditForm({...editForm, medical_history: e.target.value})} 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Patient History Side Drawer */}
      {isDrawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="drawer">
            <div className="drawer-header">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>Patient Records Drawer</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: #PA-00{drawerData.patient?.id}</span>
              </div>
              <button className="btn-icon" onClick={() => setIsDrawerOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="drawer-body">
              {drawerData.patient && (
                <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                  <h3 style={{ marginBottom: '12px', color: 'var(--accent-primary)' }}>{drawerData.patient.name}</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Age / Gender</span>
                      <span className="detail-value">{drawerData.patient.age} yrs / {drawerData.patient.gender}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Contact Number</span>
                      <span className="detail-value">{drawerData.patient.contact_number}</span>
                    </div>
                    <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                      <span className="detail-label">Address</span>
                      <span className="detail-value">{drawerData.patient.address}</span>
                    </div>
                    <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                      <span className="detail-label">Emergency Contact Info</span>
                      <span className="detail-value">{drawerData.patient.emergency_contact}</span>
                    </div>
                    <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                      <span className="detail-label">Chronic Medical History</span>
                      <span className="detail-value" style={{ fontStyle: 'italic', backgroundColor: 'var(--bg-tertiary)', padding: '8px', borderRadius: '4px', marginTop: '4px' }}>
                        {drawerData.patient.medical_history || 'No recorded chronic history.'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Consultation History (Medical Records) */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <FileText size={18} /> Consultation History ({drawerData.records.length})
                </h4>
                {drawerData.records.length === 0 ? (
                  <div style={{ padding: '16px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', fontStyle: 'italic' }}>
                    No consultations recorded in this system.
                  </div>
                ) : (
                  <div className="timeline">
                    {drawerData.records.map((rec) => (
                      <div className="timeline-item" key={rec.id}>
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <div className="timeline-date" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{new Date(rec.visit_date).toLocaleDateString()}</span>
                            <button 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: '4px', borderRadius: '4px' }}
                              onClick={() => downloadPDFReport(rec.id)}
                              title="Export Consultation PDF"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                          <div style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>Dr. {rec.doctor_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{rec.specialty}</div>
                          
                          <div style={{ marginTop: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '8px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>DIAGNOSIS</div>
                            <div style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>{rec.diagnosis}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>PRESCRIPTION</div>
                            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', whiteSpace: 'pre-line' }}>{rec.prescription}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Booked Appointments */}
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Calendar size={18} /> Appointment Log ({drawerData.appointments.length})
                </h4>
                {drawerData.appointments.length === 0 ? (
                  <div style={{ padding: '16px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', fontStyle: 'italic' }}>
                    No scheduled appointments in the log.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {drawerData.appointments.map((appt) => (
                      <div key={appt.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>Dr. {appt.doctor_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            {new Date(appt.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>
                        <span className={`badge badge-${appt.status.toLowerCase()}`}>{appt.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Patients;
