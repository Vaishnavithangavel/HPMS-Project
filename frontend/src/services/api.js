const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Request Helper
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle No Content
  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

export const api = {
  // Auth API
  auth: {
    login: (usernameOrEmail, password) => 
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ usernameOrEmail, password })
      }),
    register: (userData) => 
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      }),
    me: () => request('/auth/me'),
  },

  // Patients API
  patients: {
    getAll: (search = '', gender = '') => 
      request(`/patients?search=${encodeURIComponent(search)}&gender=${gender}`),
    getById: (id) => request(`/patients/${id}`),
    create: (patientData) => 
      request('/patients', {
        method: 'POST',
        body: JSON.stringify(patientData)
      }),
    update: (id, patientData) => 
      request(`/patients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patientData)
      }),
    delete: (id) => 
      request(`/patients/${id}`, {
        method: 'DELETE'
      }),
    getRecords: (id) => request(`/patients/${id}/records`),
    getAppointments: (id) => request(`/patients/${id}/appointments`),
  },

  // Doctors API
  doctors: {
    getAll: (search = '', specialty = '') => 
      request(`/doctors?search=${encodeURIComponent(search)}&specialty=${encodeURIComponent(specialty)}`),
    getSpecialties: () => request('/doctors/specialties'),
    getById: (id) => request(`/doctors/${id}`),
    create: (doctorData) => 
      request('/doctors', {
        method: 'POST',
        body: JSON.stringify(doctorData)
      }),
    update: (id, doctorData) => 
      request(`/doctors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(doctorData)
      }),
    delete: (id) => 
      request(`/doctors/${id}`, {
        method: 'DELETE'
      }),
  },

  // Appointments API
  appointments: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.date) params.append('date', filters.date);
      if (filters.doctorId) params.append('doctorId', filters.doctorId);
      return request(`/appointments?${params.toString()}`);
    },
    create: (apptData) => 
      request('/appointments', {
        method: 'POST',
        body: JSON.stringify(apptData)
      }),
    update: (id, apptData) => 
      request(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(apptData)
      }),
    delete: (id) => 
      request(`/appointments/${id}`, {
        method: 'DELETE'
      }),
  },

  // Medical Records API
  records: {
    getAll: (patientId = '') => 
      request(`/records?patientId=${patientId}`),
    getById: (id) => request(`/records/${id}`),
    create: (recordData) => 
      request('/records', {
        method: 'POST',
        body: JSON.stringify(recordData)
      }),
    update: (id, recordData) => 
      request(`/records/${id}`, {
        method: 'PUT',
        body: JSON.stringify(recordData)
      }),
    delete: (id) => 
      request(`/records/${id}`, {
        method: 'DELETE'
      }),
    downloadPDF: async (id) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/records/${id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to download report PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medical_report_mr_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
  },

  // Dashboard Stats
  dashboard: {
    getStats: () => request('/dashboard/stats'),
  },

  // Audit Logs API
  audit: {
    getLogs: (action = '', limit = 100) => 
      request(`/audit?action=${action}&limit=${limit}`),
  }
};
