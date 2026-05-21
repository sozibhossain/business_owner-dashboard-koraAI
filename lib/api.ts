import api from "./axios";

export const authApi = {
  login: (data: { email: string; password: string }) => api.post("/auth/login", data),
  forgotPassword: (data: { email: string }) => api.post("/auth/forget-password", data),
  verifyResetOtp: (data: { email: string; otp: string }) => api.post("/auth/verify-reset-otp", data),
  resetPassword: (data: object) => api.post("/auth/reset-password", data),
  logout: () => api.post("/auth/logout"),
  addEmployee: (data: object) => api.post("/auth/add-employee", data),
};

export const userApi = {
  getProfile: () => api.get("/user/profile"),
  updateProfile: (data: FormData) => api.put("/user/profile", data, { headers: { "Content-Type": "multipart/form-data" } }),
  changePassword: (data: object) => api.put("/user/change-password", data),
};

export const employeesApi = {
  getAll: (params?: object) => api.get("/employees", { params }),
  getById: (id: string) => api.get(`/employees/${id}`),
  create: (data: object) => api.post("/employees", data),
  update: (id: string, data: object) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
  getSchedule: (id: string) => api.get(`/employees/${id}/schedule`),
  updateSchedule: (id: string, data: object) => api.patch(`/employees/${id}/schedule`, data),
  getPerformance: (id: string, params?: object) => api.get(`/employees/${id}/performance`, { params }),
  toggleStatus: (id: string, data: { status: string }) => api.patch(`/employees/${id}/status`, data),
};

export const customersApi = {
  getAll: (params?: object) => api.get("/customers", { params }),
  search: (q: string) => api.get("/customers/search", { params: { q } }),
  create: (data: object) => api.post("/customers", data),
  getHistory: (id: string) => api.get(`/customers/${id}/history`),
};

export const appointmentsApi = {
  getAll: (params?: object) => api.get("/appointments", { params }),
  getById: (id: string) => api.get(`/appointments/${id}`),
  create: (data: object) => api.post("/appointments", data),
  update: (id: string, data: object) => api.put(`/appointments/${id}`, data),
  getAvailableSlots: (params?: object) => api.get("/appointments/available-slots", { params }),
  getDailyBriefing: () => api.get("/appointments/daily-briefing"),
};

export const accountingApi = {
  getDashboard: () => api.get("/accounting/dashboard"),
  getRevenue: (params?: object) => api.get("/accounting/revenue", { params }),
  getAll: (params?: object) => api.get("/accounting", { params }),
  getById: (id: string) => api.get(`/accounting/${id}`),
  create: (data: object) => api.post("/accounting", data),
  update: (id: string, data: object) => api.put(`/accounting/${id}`, data),
  delete: (id: string) => api.delete(`/accounting/${id}`),
  recordPayment: (id: string) => api.patch(`/accounting/${id}/pay`),
  export: () => api.get("/accounting/export"),
};

export const requestsApi = {
  getAll: (params?: object) => api.get("/requests", { params }),
  getById: (id: string) => api.get(`/requests/${id}`),
  create: (data: object) => api.post("/requests", data),
  approve: (id: string) => api.patch(`/requests/${id}/approve`),
  reject: (id: string) => api.patch(`/requests/${id}/reject`),
  getHistory: () => api.get("/requests/history"),
};

export const servicesApi = {
  getAll: (params?: object) => api.get("/services", { params }),
  getById: (id: string) => api.get(`/services/${id}`),
  create: (data: object) => api.post("/services", data),
  update: (id: string, data: object) => api.put(`/services/${id}`, data),
  delete: (id: string) => api.delete(`/services/${id}`),
};

export const calendarApi = {
  getEvents: (params?: object) => api.get("/calendar", { params }),
  getInsights: () => api.get("/calendar/insights"),
  sync: () => api.post("/calendar/sync"),
  createEvent: (data: object) => api.post("/calendar", data),
  updateEvent: (id: string, data: object) => api.put(`/calendar/${id}`, data),
  deleteEvent: (id: string) => api.delete(`/calendar/${id}`),
};

export const inboxApi = {
  getChats: (params?: object) => api.get("/inbox", { params }),
  getChatById: (chatId: string) => api.get(`/inbox/${chatId}`),
  search: (q: string) => api.get("/inbox/search", { params: { q } }),
  createGroup: (data: object) => api.post("/inbox/group", data),
  markRead: (chatId: string) => api.patch(`/inbox/${chatId}/read`),
  sendMessage: (data: { recipientId: string; content: string }) => api.post("/inbox", data),
  deleteMessage: (conversationId: string, messageId: string) => api.delete(`/inbox/${conversationId}/messages/${messageId}`),
};

export const koraAssistantApi = {
  sendMessage: (data: { message: string }) => api.post("/kora-assistant", data),
  getHistory: (params?: object) => api.get("/kora-assistant", { params }),
};

export const koraGoApi = {
  getDashboard: () => api.get("/kora-go/overview"),
  getLiveActivity: () => api.get("/kora-go/live-activity"),
  getAppRequests: (params?: object) => api.get("/kora-go/app-requests", { params }),
  getSettings: () => api.get("/kora-go/settings"),
  inviteEmployee: (data: object) => api.post("/kora-go/invite", data),
  updateAccess: (id: string, data: { status: string }) => api.patch(`/kora-go/${id}/access`, data),
};

export const notificationsApi = {
  getAll: (params?: object) => api.get("/notification", { params }),
  getUnreadCount: () => api.get("/notification/unread-count"),
  markRead: (id: string) => api.put(`/notification/${id}/read`),
  markAllRead: () => api.put("/notification/read-all"),
};

export const liveViewApi = {
  getActivity: () => api.get("/activity"),
  getAppointmentsToday: () => api.get("/appointments", { params: { date: new Date().toISOString().split("T")[0] } }),
  getConversations: (params?: object) => api.get("/inbox", { params }),
};
