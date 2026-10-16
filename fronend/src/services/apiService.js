import api from './api';

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

export const doctorService = {
  getAll: (params) => api.get('/doctors', { params }),
  getById: (id) => api.get(`/doctors/${id}`),
  create: (data) => api.post('/doctors', data),
  getSchedule: (id) => api.get(`/doctors/${id}/schedule`),
  updateSchedule: (id, data) => api.put(`/doctors/${id}/schedule`, data),
};

export const slotService = {
  getSlots: (params) => api.get('/slots', { params }),
};

export const appointmentService = {
  getAll: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  cancel: (id) => api.delete(`/appointments/${id}`),
  arrive: (id) => api.post(`/appointments/${id}/arrive`),
};

export const patientService = {
  search: (params) => api.get('/patients/search', { params }),
  create: (data) => api.post('/patients', data),
};

export const departmentService = {
  getAll: () => api.get('/departments'),
};

export const staffService = {
  getAll: (params) => api.get('/users/staff', { params }),
  createDoctor: (data) => api.post('/doctors', data),
  createReceptionist: (data) => api.post('/users/receptionists', data),
};

export const auditService = {
  getAll: (params) => api.get('/audit-logs', { params }),
};
