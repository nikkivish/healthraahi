export const doctorProfile = {
  name: 'Dr. Priya Sharma',
  phoneNumber: '+91 98765 12345',
  email: 'priya.sharma@aiims.edu',
  doctorId: 'DOC-2024-AI-78432',
  specialization: 'General Medicine',
  registrationNumber: 'MCI-2015-34567',
  hospital: 'AIIMS, Delhi',
  role: 'DOCTOR',
  dateOfBirth: '20/03/1982',
  gender: 'Female',
  experience: '12 years',
  verificationStatus: 'VERIFIED',
  verificationDate: '15 Jan 2024',
};

export const hospitalInfo = {
  name: 'AIIMS, Delhi',
  address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi, Delhi 110029',
  contactNumber: '+91 11 2658 8500',
  email: 'info@aiims.edu',
  affiliation: 'Ministry of Health & Family Welfare, Govt. of India',
  affiliationStatus: 'Active',
  establishedYear: '1956',
  departments: ['General Medicine', 'Surgery', 'Cardiology', 'Neurology', 'Orthopedics'],
};

export const workers = [
  { id: 1, name: 'Rajesh Kumar', healthId: 'HR-2024-WK-48291', status: 'Active', lastVisit: '15 Dec 2024' },
  { id: 2, name: 'Amit Singh', healthId: 'HR-2024-WK-31847', status: 'Active', lastVisit: '10 Dec 2024' },
  { id: 3, name: 'Suresh Patel', healthId: 'HR-2024-WK-55123', status: 'Inactive', lastVisit: '28 Nov 2024' },
  { id: 4, name: 'Manoj Verma', healthId: 'HR-2024-WK-62390', status: 'Active', lastVisit: '05 Dec 2024' },
  { id: 5, name: 'Ravi Shankar', healthId: 'HR-2024-WK-19876', status: 'Active', lastVisit: '18 Dec 2024' },
];

export const consentRequests = [
  {
    id: 1,
    workerName: 'Rajesh Kumar',
    healthId: 'HR-2024-WK-48291',
    requestedAccess: 'General Checkup Records',
    requestDate: '18 Dec 2024',
    status: 'PENDING',
  },
  {
    id: 2,
    workerName: 'Amit Singh',
    healthId: 'HR-2024-WK-31847',
    requestedAccess: 'Blood Test Results',
    requestDate: '17 Dec 2024',
    status: 'PENDING',
  },
  {
    id: 3,
    workerName: 'Manoj Verma',
    healthId: 'HR-2024-WK-62390',
    requestedAccess: 'Vaccination Records',
    requestDate: '15 Dec 2024',
    status: 'ACTIVE',
  },
  {
    id: 4,
    workerName: 'Ravi Shankar',
    healthId: 'HR-2024-WK-19876',
    requestedAccess: 'Prescription History',
    requestDate: '10 Dec 2024',
    status: 'ACTIVE',
  },
];

export const clinicalRecords = [
  { id: 1, workerName: 'Rajesh Kumar', healthId: 'HR-2024-WK-48291', date: '15 Dec 2024', recordType: 'General Checkup', hospital: 'AIIMS, Delhi' },
  { id: 2, workerName: 'Amit Singh', healthId: 'HR-2024-WK-31847', date: '10 Dec 2024', recordType: 'Blood Test', hospital: 'AIIMS, Delhi' },
  { id: 3, workerName: 'Manoj Verma', healthId: 'HR-2024-WK-62390', date: '05 Dec 2024', recordType: 'Vaccination', hospital: 'AIIMS, Delhi' },
  { id: 4, workerName: 'Ravi Shankar', healthId: 'HR-2024-WK-19876', date: '28 Nov 2024', recordType: 'Prescription', hospital: 'AIIMS, Delhi' },
  { id: 5, workerName: 'Suresh Patel', healthId: 'HR-2024-WK-55123', date: '20 Nov 2024', recordType: 'Dental', hospital: 'AIIMS, Delhi' },
];
