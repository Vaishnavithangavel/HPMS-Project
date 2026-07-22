import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  Clock 
} from 'lucide-react';

const Doctors = () => {
  const { user, showToast } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Add Form
  const [addForm, setAddForm] = useState({
    name: '', specialty: '', contact_number: '', email: '', 
    available_days: 'Mon,Tue,Wed,Thu,Fri', available_hours: '09:00-17:00',
    username: '', password: ''
  });

  // Edit Form
  const [editForm, setEditForm] = useState({
    name: '', specialty: '', contact_number: '', 
    available_days: '', available_hours: ''
  });

  // Booking Form
  const [bookForm, setBookForm] = useState({
    appointment_date: '', notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const docsData = await api.doctors.getAll(search, specialtyFilter);
      setDoctors(docsData);
      
      const specsData = await api.doctors.getSpecialties();
      setSpecialties(specsData);
    } catch (error) {
      showToast(error.message || 'Error fetching doctors data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, specialtyFilter]);

  // Handle add doctor submit
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      await api.doctors.create(addForm);
      showToast('Doctor account and profile created!', 'success');
      setIsAddModalOpen(false);
      setAddForm({
        name: '', specialty: '', contact_number: '', email: '', 
        available_days: 'Mon,Tue,Wed,Thu,Fri', available_hours: '09:00-17:00',
        username: '', password: ''
      });
      fetchData();
    } catch (error) {
      showToast(error.message || 'Failed to add doctor', 'error');
    }
  };

  // Open edit modal
  const openEditModal = (doc) => {
    setSelectedDoc(doc);
    setEditForm({
      name: doc.name,
      specialty: doc.specialty,
      contact_number: doc.contact_number,
      available_days: doc.available_days,
      available_hours: doc.available_hours
    });
    setIsEditModalOpen(true);
  };

  // Handle edit submit
  const handleEditDoctor = async (e) => {
    e.preventDefault();
    try {
      await api.doctors.update(selectedDoc.id, editForm);
      showToast('Doctor profile updated successfully!', 'success');
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      showToast(error.message || 'Failed to update doctor profile', 'error');
    }
  };

  // Handle delete doctor
  const handleDeleteDoctor = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete Doctor "${name}"?\nThis will permanently delete their schedules and doctor records.`)) {
      try {
        await api.doctors.delete(id);
        showToast('Doctor profile and user account deleted.', 'success');
        fetchData();
      } catch (error) {
        showToast(error.message || 'Error deleting doctor record', 'error');
      }
    }
  };

  // Open booking modal
  const openBookModal = (doc) => {
    setSelectedDoc(doc);
    setBookForm({ appointment_date: '', notes: '' });
    setIsBookModalOpen(true);
  };

  // Handle appointment booking
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    try {
      await api.appointments.create({
        doctor_id: selectedDoc.id,
        appointment_date: bookForm.appointment_date,
        notes: bookForm.notes
      });
      showToast(`Appointment booked with ${selectedDoc.name}!`, 'success');
      setIsBookModalOpen(false);
    } catch (error) {
      showToast(error.message || 'Failed to book appointment', 'error');
    }
  };

  return (
    <div>
      {/* Filtering Header */}
      <div className="table-container" style={{ borderBottom: 'none', borderRadius: 'var(--border-radius-md) var(--border-radius-md) 0 0', margin: 0 }}>
        <div className="table-header-bar">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search doctor by name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-actions">
            <select 
              className="form-control" 
              style={{ width: '200px' }}
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
            >
              <option value="">All Specialties</option>
              {specialties.map((spec, i) => (
                <option key={i} value={spec}>{spec}</option>
              ))}
            </select>

            {user.role === 'Admin' && (
              <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                <Plus size={16} /> Add Physician
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Doctor Cards */}
      {loading && doctors.length === 0 ? (
        <div className="loader-container"><div className="spinner"></div></div>
      ) : doctors.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          No physicians found matching the search criteria.
        </div>
      ) : (
        <div className="card-grid" style={{ marginTop: '24px' }}>
          {doctors.map((doc) => (
            <div className="card" key={doc.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>{doc.name}</h3>
                  <span className="badge badge-scheduled" style={{ marginTop: '6px' }}>{doc.specialty}</span>
                </div>
                {user.role === 'Admin' && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn-icon" onClick={() => openEditModal(doc)} title="Edit Doctor Profile"><Edit2 size={16} /></button>
                    <button className="btn-icon" style={{ color: 'var(--accent-danger)' }} onClick={() => handleDeleteDoctor(doc.id, doc.name)} title="Delete Doctor"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)', flex: '1', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} />
                  <span><strong>Hours:</strong> {doc.available_hours} ({doc.available_days})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={16} />
                  <span>{doc.contact_number}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={16} />
                  <span>{doc.email}</span>
                </div>
              </div>

              {user.role === 'Patient' && (
                <button className="btn btn-primary btn-block" style={{ width: '100%', marginTop: 'auto' }} onClick={() => openBookModal(doc)}>
                  <Calendar size={16} /> Book Consultation
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 1. Add Doctor Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Register New Physician Account</span>
              <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddDoctor}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Doctor's Full Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="Dr. Full Name"
                    value={addForm.name} 
                    onChange={e => setAddForm({...addForm, name: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Specialty *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="e.g. Cardiology"
                    value={addForm.specialty} 
                    onChange={e => setAddForm({...addForm, specialty: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    required 
                    value={addForm.contact_number} 
                    onChange={e => setAddForm({...addForm, contact_number: e.target.value})} 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Email Address *</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    required 
                    value={addForm.email} 
                    onChange={e => setAddForm({...addForm, email: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Available Days *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="Mon,Wed,Fri"
                    value={addForm.available_days} 
                    onChange={e => setAddForm({...addForm, available_days: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Available Hours *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="09:00-17:00"
                    value={addForm.available_hours} 
                    onChange={e => setAddForm({...addForm, available_hours: e.target.value})} 
                  />
                </div>

                <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginTop: '8px' }}>
                  <span className="quick-fill-label" style={{ marginBottom: '12px' }}>Staff User Logins</span>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={addForm.username} 
                    onChange={e => setAddForm({...addForm, username: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    required 
                    value={addForm.password} 
                    onChange={e => setAddForm({...addForm, password: e.target.value})} 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Doctor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Doctor Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Edit Physician Details</span>
              <button className="btn-icon" onClick={() => setIsEditModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditDoctor}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Doctor's Full Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={editForm.name} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Specialty *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={editForm.specialty} 
                    onChange={e => setEditForm({...editForm, specialty: e.target.value})} 
                  />
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
                <div className="form-group">
                  <label className="form-label">Available Days *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={editForm.available_days} 
                    onChange={e => setEditForm({...editForm, available_days: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Available Hours *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={editForm.available_hours} 
                    onChange={e => setEditForm({...editForm, available_hours: e.target.value})} 
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

      {/* 3. Book Appointment Modal */}
      {isBookModalOpen && selectedDoc && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <span className="modal-title">Book Appointment</span>
              <button className="btn-icon" onClick={() => setIsBookModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleBookAppointment}>
              <div className="modal-body">
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)' }}>
                  <strong>Physician:</strong> {selectedDoc.name}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Specialty: {selectedDoc.specialty}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hours: {selectedDoc.available_hours} ({selectedDoc.available_days})</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    required 
                    value={bookForm.appointment_date} 
                    onChange={e => setBookForm({...bookForm, appointment_date: e.target.value})} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Consultation / Symptoms</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="Briefly explain the reason for your visit..."
                    value={bookForm.notes} 
                    onChange={e => setBookForm({...bookForm, notes: e.target.value})} 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsBookModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Book Appointment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors;
