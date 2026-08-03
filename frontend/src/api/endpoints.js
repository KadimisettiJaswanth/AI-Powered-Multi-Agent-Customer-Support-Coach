import apiClient from "./client";

export const authApi = {
  login: (email, password) => apiClient.post("/login", { email, password }),
  register: (payload) => apiClient.post("/register", payload),
  me: () => apiClient.get("/me"),
  listUsers: () => apiClient.get("/users"),
  updateUser: (id, params) => apiClient.put(`/users/${id}`, null, { params }),
};

export const chatApi = {
  ask: (payload) => apiClient.post("/chat", payload),
  history: (params) => apiClient.get("/history", { params }),
  exportHistory: (params) => apiClient.get("/history/export", { params, responseType: "blob" }),
  // Native EventSource can't send an Authorization header, so the JWT goes
  // as a query param on this one GET endpoint -- see backend routes_chat.py.
  streamUrl: ({ question, threadId, customerId, customerName }) => {
    const token = localStorage.getItem("access_token") || "";
    const params = new URLSearchParams({ question, token });
    if (threadId) params.set("thread_id", threadId);
    if (customerId) params.set("customer_id", customerId);
    if (customerName) params.set("customer_name", customerName);
    return `/api/chat/stream?${params.toString()}`;
  },
};

export const feedbackApi = {
  submit: (payload) => apiClient.post("/feedback", payload),
};

export const ticketsApi = {
  list: (status) => apiClient.get("/tickets", { params: status ? { status } : {} }),
  create: (payload) => apiClient.post("/ticket", payload),
  update: (id, payload) => apiClient.put(`/ticket/${id}`, payload),
};

export const knowledgeApi = {
  list: () => apiClient.get("/documents"),
  upload: (file, onProgress) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post("/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
    });
  },
  remove: (id) => apiClient.delete(`/document/${id}`),
};

export const analyticsApi = {
  summary: () => apiClient.get("/analytics"),
  auditLogs: (limit) => apiClient.get("/audit-logs", { params: { limit } }),
};

export const healthApi = {
  check: () => apiClient.get("/health"),
};

export const coachingApi = {
  scenarios: () => apiClient.get("/coaching/scenarios"),
  listSessions: () => apiClient.get("/coaching/sessions"),
  createSession: (payload) => apiClient.post("/coaching/sessions", payload),
  getSession: (id) => apiClient.get(`/coaching/sessions/${id}`),
  deleteSession: (id) => apiClient.delete(`/coaching/sessions/${id}`),
  simulateTurn: (payload) => apiClient.post("/coaching/simulate-turn", payload),
  analyzeTurn: (payload) => apiClient.post("/coaching/analyze-turn", payload),
  finishSession: (id) => apiClient.post(`/coaching/finish-session/${id}`),
  getReport: (id) => apiClient.get(`/coaching/report/${id}`),
};



