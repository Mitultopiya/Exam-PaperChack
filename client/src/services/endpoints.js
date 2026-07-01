import api from './api';

// Thin wrappers around the REST API grouped by resource.

export const authApi = {
  login: (data) => api.post('/login', data),
  logout: () => api.post('/logout'),
  me: () => api.get('/me'),
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export const studentApi = {
  list: (search = '') => api.get('/students', { params: { search } }),
  get: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  remove: (id) => api.delete(`/students/${id}`),
};

export const examApi = {
  list: (params = {}) => api.get('/exams', { params }),
  get: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  toggleStatus: (id) => api.patch(`/exams/${id}/status`),
  remove: (id) => api.delete(`/exams/${id}`),
};

export const answerKeyApi = {
  list: (examId) => api.get('/answer-keys', { params: { exam_id: examId } }),
  save: (examId, answers) => api.post('/answer-keys', { exam_id: examId, answers }),
  clear: (examId) => api.delete(`/answer-keys/${examId}`),
};

export const evaluationApi = {
  evaluate: (formData) =>
    api.post('/evaluate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  results: (params = {}) => api.get('/results', { params }),
  result: (id) => api.get(`/result/${id}`),
  remove: (id) => api.delete(`/result/${id}`),
  pdfUrl: (id) => `/api/result/${id}/pdf`,
};

export const subjectiveApi = {
  uploadMasterKey: (formData) =>
    api.post('/subjective/master-key', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  masterKeys: () => api.get('/subjective/master-keys'),
  masterKey: (id) => api.get(`/subjective/master-keys/${id}`),
  saveMasterAnswers: (id, answers) =>
    api.post(`/subjective/master-keys/${id}/answers`, { answers }),
  reExtractMasterKey: (id) => api.post(`/subjective/master-keys/${id}/re-extract`),
  removeMasterKey: (id) => api.delete(`/subjective/master-keys/${id}`),
  evaluate: (formData) =>
    api.post('/subjective/evaluate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  results: () => api.get('/subjective/results'),
  result: (id) => api.get(`/subjective/results/${id}`),
  downloadUrl: (id) => `/api/subjective/results/${id}/download`,
  remove: (id) => api.delete(`/subjective/results/${id}`),
};
