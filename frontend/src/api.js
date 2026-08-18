const API_BASE = '/api';

async function request(endpoint, { body, token, method = 'POST' } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const err = new Error('Invalid server response');
    err.status = res.status;
    throw err;
  }

  if (!res.ok || data.success === false) {
    const err = new Error(data.message || 'Something went wrong');
    err.status = res.status;
    throw err;
  }

  return data;
}

export function registerUser(fields) {
  const body = {
    name: fields.name,
    phone: fields.phone,
    password: fields.password,
    role: fields.role,
  };
  if (fields.email && fields.email.trim()) {
    body.email = fields.email.trim();
  }
  return request('/auth/register', { body });
}

export function loginUser(phone, password) {
  return request('/auth/login', { body: { phone, password } });
}

export function getMe(token) {
  return request('/auth/me', { token, method: 'GET' });
}

export function getWorkerProfile(token) {
  return request('/workers/profile/me', { token, method: 'GET' });
}

export function updateWorkerProfile(token, data) {
  return request('/workers/profile/me', { token, method: 'PATCH', body: data });
}

export function getWorkerRecords(token) {
  return request('/clinical-records/me', { token, method: 'GET' });
}

export function requestConsent(token, data) {
  return request('/consents/', {
    token,
    method: 'POST',
    body: data,
  });
}

export function getWorkerConsents(token) {
  return request('/consents/me', { token, method: 'GET' });
}

export function approveConsent(token, consentId) {
  return request(`/consents/${consentId}/approve`, { token, method: 'PATCH' });
}

export function rejectConsent(token, consentId) {
  return request(`/consents/${consentId}/reject`, { token, method: 'PATCH' });
}

export function revokeConsent(token, consentId) {
  return request(`/consents/${consentId}/revoke`, { token, method: 'PATCH' });
}

export function getDoctorProfile(token) {
  return request('/doctors/profile/me', { token, method: 'GET' });
}

export function updateDoctorProfile(token, data) {
  return request('/doctors/profile/me', {
    token,
    method: 'PATCH',
    body: data,
  });
}

export function getDoctorConsents(token) {
  return request('/consents/me', { token, method: 'GET' });
}

export function getDoctorRecords(token) {
  return request('/clinical-records/doctor-access', { token, method: 'GET' });
}

export function createClinicalRecord(token, data) {
  return request('/clinical-records/', {
    token,
    method: 'POST',
    body: data,
  });
}

export function getClinicalRecord(token, recordId) {
  return request(`/clinical-records/${recordId}`, { token, method: 'GET' });
}

export function lookupWorkerByHealthId(token, healthId) {
  return request(`/workers/lookup/${encodeURIComponent(healthId)}`, { token, method: 'GET' });
}

export function getWorkerProfileForDoctor(token, healthId) {
  return request(`/workers/lookup/${encodeURIComponent(healthId)}/profile`, { token, method: 'GET' });
}

export function getHospital(token, hospitalId) {
  return request(`/hospitals/${hospitalId}`, { token, method: 'GET' });
}

export function getAdminOverview(token) {
  return request('/admin/overview', { token, method: 'GET' });
}

export function getAdminAuditLogs(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', params.limit);
  if (params.skip) qs.set('skip', params.skip);
  if (params.actorRole) qs.set('actorRole', params.actorRole);
  if (params.action) qs.set('action', params.action);
  if (params.resourceType) qs.set('resourceType', params.resourceType);
  if (params.result) qs.set('result', params.result);
  const query = qs.toString();
  return request(`/admin/audit-logs${query ? `?${query}` : ''}`, { token, method: 'GET' });
}

export function getPendingDoctors(token) {
  return request('/doctors/pending', { token, method: 'GET' });
}

export function verifyDoctor(token, doctorId, status, reason) {
  const body = { status };
  if (reason) body.reason = reason;
  return request(`/doctors/${doctorId}/verify`, { token, method: 'PATCH', body });
}

export function getAllHospitals(token) {
  return request('/hospitals/', { token, method: 'GET' });
}

export function linkDoctorToHospital(token, hospitalId) {
  return request('/doctors/profile/me/hospital', {
    token,
    method: 'PATCH',
    body: { hospitalId },
  });
}

export function unlinkDoctorFromHospital(token) {
  return request('/doctors/profile/me/hospital', { token, method: 'DELETE' });
}

// ─── Medical Camps ──────────────────────────────────────────────────────────

export function getActiveCamps() {
  return request('/camps/', { method: 'GET' });
}

export function getCampById(campId) {
  return request(`/camps/${encodeURIComponent(campId)}`, { method: 'GET' });
}

export function registerForCamp(token, campId, timeSlotIndex, healthConcerns) {
  const body = { timeSlotIndex };
  if (healthConcerns) body.healthConcerns = healthConcerns;
  return request(`/camps/${encodeURIComponent(campId)}/register`, { token, body });
}

export function getMyCampRegistrations(token) {
  return request('/camps/my-registrations', { token, method: 'GET' });
}

export function cancelCampRegistration(token, regId) {
  return request(`/camps/my-registrations/${encodeURIComponent(regId)}/cancel`, { token, method: 'PATCH' });
}

export function getCampRegistrations(token, campId) {
  return request(`/camps/${encodeURIComponent(campId)}/registrations`, { token, method: 'GET' });
}

export function getAdminAllCamps(token) {
  return request('/camps/admin/all', { token, method: 'GET' });
}

export function createCamp(token, data) {
  return request('/camps/admin/create', { token, body: data });
}

export function updateCamp(token, campId, data) {
  return request(`/camps/admin/${encodeURIComponent(campId)}`, { token, body: data, method: 'PATCH' });
}

export function cancelCamp(token, campId) {
  return request(`/camps/admin/${encodeURIComponent(campId)}/cancel`, { token, method: 'PATCH' });
}

export function assignDoctorToCamp(token, campId, doctorId) {
  return request(`/camps/admin/${encodeURIComponent(campId)}/assign-doctor`, { token, body: { doctorId } });
}

export function getAdminCampRegistrations(token, campId) {
  return request(`/camps/admin/${encodeURIComponent(campId)}/registrations`, { token, method: 'GET' });
}

// ─── Doctor Verification Documents ───────────────────────────────────────────

export function getDoctorVerificationDocuments(token) {
  return request('/doctor-verification-documents/me', { token, method: 'GET' });
}

export async function uploadDoctorVerificationDocument(token, file, documentType) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);

  const res = await fetch(`${API_BASE}/doctor-verification-documents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const err = new Error('Invalid server response');
    err.status = res.status;
    throw err;
  }

  if (!res.ok || data.success === false) {
    const err = new Error(data.message || 'Upload failed');
    err.status = res.status;
    throw err;
  }

  return data;
}

export async function replaceDoctorVerificationDocument(token, documentId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/doctor-verification-documents/${encodeURIComponent(documentId)}/replace`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const err = new Error('Invalid server response');
    err.status = res.status;
    throw err;
  }

  if (!res.ok || data.success === false) {
    const err = new Error(data.message || 'Replace failed');
    err.status = res.status;
    throw err;
  }

  return data;
}

export function deleteDoctorVerificationDocument(token, documentId) {
  return request(`/doctor-verification-documents/${encodeURIComponent(documentId)}`, { token, method: 'DELETE' });
}

export async function downloadDoctorVerificationDocumentFile(token, documentId) {
  const res = await fetch(`${API_BASE}/doctor-verification-documents/${encodeURIComponent(documentId)}/download`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    let msg = 'Download failed';
    try { const d = await res.json(); msg = d.message || msg; } catch {}
    throw new Error(msg);
  }

  return res;
}

// ─── Admin: Doctor Verification Documents ────────────────────────────────────

export function getAdminDoctorVerificationDocuments(token, doctorUserId) {
  return request(`/doctor-verification-documents/admin/${encodeURIComponent(doctorUserId)}`, { token, method: 'GET' });
}

export async function adminDownloadDoctorDocument(token, documentId) {
  const res = await fetch(`${API_BASE}/doctor-verification-documents/admin/doc/${encodeURIComponent(documentId)}/download`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    let msg = 'Download failed';
    try { const d = await res.json(); msg = d.message || msg; } catch {}
    throw new Error(msg);
  }

  return res;
}

export function adminUpdateDocumentStatus(token, documentId, status, rejectionReason) {
  const body = { status };
  if (rejectionReason) body.rejectionReason = rejectionReason;
  return request(`/doctor-verification-documents/admin/doc/${encodeURIComponent(documentId)}/status`, { token, method: 'PATCH', body });
}

// ─── Worker Health Documents ─────────────────────────────────────────────────

export function getWorkerDocuments(token) {
  return request('/worker-documents/me', { token, method: 'GET' });
}

export function getWorkerDocumentById(token, documentId) {
  return request(`/worker-documents/${encodeURIComponent(documentId)}`, { token, method: 'GET' });
}

export async function uploadWorkerDocument(token, file, documentType, description) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);
  if (description) formData.append('description', description);

  const res = await fetch(`${API_BASE}/worker-documents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const err = new Error('Invalid server response');
    err.status = res.status;
    throw err;
  }

  if (!res.ok || data.success === false) {
    const err = new Error(data.message || 'Upload failed');
    err.status = res.status;
    throw err;
  }

  return data;
}

export function deleteWorkerDocument(token, documentId) {
  return request(`/worker-documents/${encodeURIComponent(documentId)}`, { token, method: 'DELETE' });
}

export async function downloadWorkerDocumentFile(token, documentId) {
  const res = await fetch(`${API_BASE}/worker-documents/${encodeURIComponent(documentId)}/download`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    let msg = 'Download failed';
    try { const d = await res.json(); msg = d.message || msg; } catch {}
    throw new Error(msg);
  }

  return res;
}
