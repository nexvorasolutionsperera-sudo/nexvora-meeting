const API_BASE = '/api';

export function getAuthHeaders() {
  const token = localStorage.getItem('nexvora_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export const api = {
  // Auth
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async register(name, email, password, avatar) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, avatar })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  async googleLogin(name, email, avatar, credential) {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, avatar, credential })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Google login failed');
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch user');
    return data;
  },

  async updateProfile(profileData) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    return data;
  },

  // Meetings
  async createMeeting(meetingData) {
    const res = await fetch(`${API_BASE}/meetings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(meetingData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create meeting');
    return data;
  },

  async getUpcomingMeetings() {
    const res = await fetch(`${API_BASE}/meetings/upcoming`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch meetings');
    return data;
  },

  async getMeetingHistory() {
    const res = await fetch(`${API_BASE}/meetings/history`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch history');
    return data;
  },

  async getMeeting(id) {
    const res = await fetch(`${API_BASE}/meetings/${id}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch meeting');
    return data;
  },

  async verifyPasscode(id, passcode) {
    const res = await fetch(`${API_BASE}/meetings/${id}/verify-passcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Incorrect passcode');
    return data;
  },

  async deleteMeeting(id) {
    const res = await fetch(`${API_BASE}/meetings/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete meeting');
    return data;
  },

  async reportAbuse(reportData) {
    const res = await fetch(`${API_BASE}/meetings/report`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reportData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit report');
    return data;
  },

  // Admin
  async getAdminStats() {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch stats');
    return data;
  },

  async getAdminUsers() {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
    return data;
  },

  async toggleBlockUser(userId) {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/block`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update user');
    return data;
  },

  async updateUserRole(userId, role) {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update role');
    return data;
  },

  async deleteUser(userId) {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete user');
    return data;
  },

  async getAdminReports() {
    const res = await fetch(`${API_BASE}/admin/reports`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch reports');
    return data;
  },

  async updateReportStatus(reportId, status) {
    const res = await fetch(`${API_BASE}/admin/reports/${reportId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update report');
    return data;
  }
};
