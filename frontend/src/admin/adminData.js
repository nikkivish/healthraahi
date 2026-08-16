export const adminProfile = {
  name: 'Neha Joshi',
  role: 'SYSTEM_ADMIN',
  adminId: 'ADM-2024-001',
  email: 'neha.joshi@healthraahi.gov.in',
  phone: '+91 98765 00001',
};

export const dashboardStats = {
  totalWorkers: 12847,
  totalDoctors: 3216,
  totalHospitals: 487,
  pendingVerifications: 14,
  totalRecords: 58392,
  totalConsents: 9124,
};

export const recentRegistrations = [
  { id: 1, name: 'Vikram Singh', role: 'Worker', date: '18 Dec 2024', healthId: 'HR-2024-WK-78234' },
  { id: 2, name: 'Dr. Ananya Roy', role: 'Doctor', date: '18 Dec 2024', doctorId: 'DOC-2024-MA-91023' },
  { id: 3, name: 'Nisha Devi', role: 'Worker', date: '17 Dec 2024', healthId: 'HR-2024-WK-65412' },
  { id: 4, name: 'Dr. Karthik Menon', role: 'Doctor', date: '17 Dec 2024', doctorId: 'DOC-2024-KA-44521' },
];

export const recentActivity = [
  { id: 1, action: 'Doctor verification approved', user: 'Dr. Ananya Roy', time: '2 hours ago', type: 'approval' },
  { id: 2, action: 'New hospital registered', user: 'Apollo Hospital, Chennai', time: '5 hours ago', type: 'registration' },
  { id: 3, action: 'Consent request submitted', user: 'Vikram Singh', time: '8 hours ago', type: 'consent' },
  { id: 4, action: 'Medical record uploaded', user: 'Dr. Karthik Menon', time: '1 day ago', type: 'record' },
  { id: 5, action: 'Worker account activated', user: 'Nisha Devi', time: '1 day ago', type: 'activation' },
];

export const workers = [
  { id: 1, name: 'Rajesh Kumar', healthId: 'HR-2024-WK-48291', phone: '+91 98765 11111', regDate: '15 Jan 2024', status: 'Active' },
  { id: 2, name: 'Amit Singh', healthId: 'HR-2024-WK-31847', phone: '+91 98765 22222', regDate: '20 Feb 2024', status: 'Active' },
  { id: 3, name: 'Suresh Patel', healthId: 'HR-2024-WK-55123', phone: '+91 98765 33333', regDate: '05 Mar 2024', status: 'Inactive' },
  { id: 4, name: 'Manoj Verma', healthId: 'HR-2024-WK-62390', phone: '+91 98765 44444', regDate: '12 Apr 2024', status: 'Active' },
  { id: 5, name: 'Ravi Shankar', healthId: 'HR-2024-WK-19876', phone: '+91 98765 55555', regDate: '28 May 2024', status: 'Active' },
  { id: 6, name: 'Vikram Singh', healthId: 'HR-2024-WK-78234', phone: '+91 98765 66666', regDate: '10 Jun 2024', status: 'Active' },
  { id: 7, name: 'Nisha Devi', healthId: 'HR-2024-WK-65412', phone: '+91 98765 77777', regDate: '22 Jul 2024', status: 'Active' },
];

export const doctors = [
  { id: 1, name: 'Dr. Priya Sharma', doctorId: 'DOC-2024-AI-78432', specialization: 'General Medicine', hospital: 'AIIMS, Delhi', verificationStatus: 'VERIFIED' },
  { id: 2, name: 'Dr. Ananya Roy', doctorId: 'DOC-2024-MA-91023', specialization: 'Cardiology', hospital: 'Apollo Hospital, Chennai', verificationStatus: 'PENDING' },
  { id: 3, name: 'Dr. Karthik Menon', doctorId: 'DOC-2024-KA-44521', specialization: 'Neurology', hospital: 'Narayana Health, Bangalore', verificationStatus: 'VERIFIED' },
  { id: 4, name: 'Dr. Sunita Reddy', doctorId: 'DOC-2024-SR-33210', specialization: 'Orthopedics', hospital: 'Fortis Hospital, Mumbai', verificationStatus: 'PENDING' },
  { id: 5, name: 'Dr. Rajiv Gupta', doctorId: 'DOC-2024-RG-55678', specialization: 'Pediatrics', hospital: 'AIIMS, Delhi', verificationStatus: 'VERIFIED' },
];

export const hospitals = [
  { id: 1, name: 'AIIMS, Delhi', location: 'New Delhi, Delhi', contact: '+91 11 2658 8500', doctorsCount: 12, status: 'Active' },
  { id: 2, name: 'Apollo Hospital, Chennai', location: 'Chennai, Tamil Nadu', contact: '+91 44 2829 3333', doctorsCount: 8, status: 'Active' },
  { id: 3, name: 'Narayana Health, Bangalore', location: 'Bangalore, Karnataka', contact: '+91 80 7122 2222', doctorsCount: 6, status: 'Active' },
  { id: 4, name: 'Fortis Hospital, Mumbai', location: 'Mumbai, Maharashtra', contact: '+91 22 6733 6666', doctorsCount: 9, status: 'Active' },
  { id: 5, name: 'SGPGI, Lucknow', location: 'Lucknow, Uttar Pradesh', contact: '+91 522 249 4000', doctorsCount: 5, status: 'Inactive' },
];

export const clinicalRecords = [
  { id: 'REC-001', worker: 'Rajesh Kumar', doctor: 'Dr. Priya Sharma', hospital: 'AIIMS, Delhi', type: 'General Checkup', date: '15 Dec 2024' },
  { id: 'REC-002', worker: 'Amit Singh', doctor: 'Dr. Karthik Menon', hospital: 'Narayana Health, Bangalore', type: 'Blood Test', date: '10 Dec 2024' },
  { id: 'REC-003', worker: 'Manoj Verma', doctor: 'Dr. Priya Sharma', hospital: 'AIIMS, Delhi', type: 'Vaccination', date: '05 Dec 2024' },
  { id: 'REC-004', worker: 'Ravi Shankar', doctor: 'Dr. Rajiv Gupta', hospital: 'AIIMS, Delhi', type: 'Prescription', date: '28 Nov 2024' },
  { id: 'REC-005', worker: 'Suresh Patel', doctor: 'Dr. Sunita Reddy', hospital: 'Fortis Hospital, Mumbai', type: 'Dental', date: '20 Nov 2024' },
  { id: 'REC-006', worker: 'Vikram Singh', doctor: 'Dr. Ananya Roy', hospital: 'Apollo Hospital, Chennai', type: 'Cardiology', date: '18 Nov 2024' },
];

export const consents = [
  { id: 1, worker: 'Rajesh Kumar', doctor: 'Dr. Priya Sharma', access: 'General Checkup Records', status: 'ACTIVE', date: '15 Dec 2024' },
  { id: 2, worker: 'Amit Singh', doctor: 'Dr. Karthik Menon', access: 'Blood Test Results', status: 'PENDING', date: '17 Dec 2024' },
  { id: 3, worker: 'Manoj Verma', doctor: 'Dr. Priya Sharma', access: 'Vaccination Records', status: 'ACTIVE', date: '05 Dec 2024' },
  { id: 4, worker: 'Ravi Shankar', doctor: 'Dr. Rajiv Gupta', access: 'Prescription History', status: 'REVOKED', date: '28 Nov 2024' },
  { id: 5, worker: 'Vikram Singh', doctor: 'Dr. Ananya Roy', access: 'Cardiology Reports', status: 'PENDING', date: '18 Nov 2024' },
];

export const auditLogs = [
  { id: 1, activity: 'Doctor verification approved', user: 'Admin Panel', role: 'ADMIN', timestamp: '18 Dec 2024, 14:32', action: 'APPROVE', status: 'SUCCESS' },
  { id: 2, activity: 'New hospital registered', user: 'Apollo Hospital', role: 'HOSPITAL', timestamp: '18 Dec 2024, 11:15', action: 'REGISTER', status: 'SUCCESS' },
  { id: 3, activity: 'Consent request submitted', user: 'Vikram Singh', role: 'WORKER', timestamp: '17 Dec 2024, 18:44', action: 'SUBMIT', status: 'SUCCESS' },
  { id: 4, activity: 'Medical record uploaded', user: 'Dr. Karthik Menon', role: 'DOCTOR', timestamp: '17 Dec 2024, 10:22', action: 'UPLOAD', status: 'SUCCESS' },
  { id: 5, activity: 'Login attempt failed', user: 'unknown@email.com', role: 'UNKNOWN', timestamp: '17 Dec 2024, 09:10', action: 'LOGIN', status: 'FAILED' },
  { id: 6, activity: 'Worker account deactivated', user: 'Suresh Patel', role: 'WORKER', timestamp: '16 Dec 2024, 16:55', action: 'DEACTIVATE', status: 'SUCCESS' },
  { id: 7, activity: 'Doctor verification rejected', user: 'Dr. Sunita Reddy', role: 'DOCTOR', timestamp: '16 Dec 2024, 12:30', action: 'REJECT', status: 'SUCCESS' },
  { id: 8, activity: 'Consent revoked by worker', user: 'Ravi Shankar', role: 'WORKER', timestamp: '15 Dec 2024, 08:12', action: 'REVOKE', status: 'SUCCESS' },
];
