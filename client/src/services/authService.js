import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/auth/me'),
};

export const documentService = {
  create: (data) => api.post('/documents', data),
  getAll: () => api.get('/documents'),
  getById: (id) => api.get(`/documents/${id}`),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  share: (id, data) => api.post(`/documents/${id}/share`, data),
  removeCollaborator: (docId, userId) =>
    api.delete(`/documents/${docId}/share/${userId}`),
};

export const versionService = {
  create: (docId, data) => api.post(`/documents/${docId}/versions`, data),
  getAll: (docId) => api.get(`/documents/${docId}/versions`),
  getById: (docId, versionId) =>
    api.get(`/documents/${docId}/versions/${versionId}`),
  rollback: (docId, versionId) =>
    api.post(`/documents/${docId}/versions/${versionId}/rollback`),
};
