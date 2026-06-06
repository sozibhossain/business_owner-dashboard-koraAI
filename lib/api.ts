import api from "./axios";

export const authApi = {
  login: (data: { email: string; password: string }) => api.post("/auth/login", data),
  forgotPassword: (data: { email: string }) => api.post("/auth/forget-password", data),
  verifyResetOtp: (data: { email: string; otp: string }) => api.post("/auth/verify-reset-otp", data),
  resetPassword: (data: object) => api.post("/auth/reset-password", data),
  logout: () => api.post("/auth/logout"),
};

export const userApi = {
  getProfile: () => api.get("/user/profile"),
  updateProfile: (data: FormData) => api.put("/user/profile", data, { headers: { "Content-Type": "multipart/form-data" } }),
  changePassword: (data: object) => api.put("/user/change-password", data),
};

export const employeesApi = {
  getAll: (params?: object) => api.get("/employees", { params }),
  getTeamAttendance: (params?: object) => api.get("/employees/attendance", { params }),
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
  approve: (id: string, data?: { adminNote?: string }) => api.patch(`/requests/${id}/approve`, data || {}),
  reject: (id: string, data?: { adminNote?: string }) => api.patch(`/requests/${id}/reject`, data || {}),
  getHistory: () => api.get("/requests/history"),
  // Employee leave requests (separate Leave model, surfaced in the same Requests dashboard)
  getLeaves: () => api.get("/work/leave/all"),
  leaveAction: (id: string, data: { status: "Approved" | "Rejected"; reviewNote?: string }) =>
    api.put(`/work/leave/${id}/action`, data),
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
  sendMessage: (data: FormData | { recipientId: string; content?: string }) =>
    data instanceof FormData
      ? api.post("/inbox", data, { headers: { "Content-Type": "multipart/form-data" } })
      : api.post("/inbox", data),
  deleteMessage: (conversationId: string, messageId: string) => api.delete(`/inbox/${conversationId}/messages/${messageId}`),
  editMessage: (conversationId: string, messageId: string, data: { content: string }) =>
    api.patch(`/inbox/${conversationId}/messages/${messageId}`, data),
  deleteChat: (id: string) => api.delete(`/inbox/${id}`),
  getRecipients: (params?: { q?: string }) => api.get("/inbox/recipients", { params }),
};

export const mailApi = {
  getAll: (params?: object) => api.get("/mail", { params }),
  getById: (id: string) => api.get(`/mail/${id}`),
  create: (data: FormData) =>
    api.post("/mail", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id: string, data: FormData) =>
    api.put(`/mail/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  toggleStar: (id: string) => api.put(`/mail/${id}/star`),
  remove: (id: string) => api.delete(`/mail/${id}`),
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
  getActivity: (params?: object) => api.get("/activity", { params }),
  getAppointmentsToday: () => api.get("/appointments", { params: { date: new Date().toISOString().split("T")[0] } }),
  getConversations: (params?: object) => api.get("/inbox", { params }),
  getCalls: (params?: object) => api.get("/call", { params }),
  getKoraGoLiveActivity: () => api.get("/kora-go/live-activity"),
};
