export interface LocalContact {
  id: string;
  name: string;
  category: string;
  phone: string;
  addedBy: { name: string; initials: string };
  likes: number;
  timeAgo: string;
}

export interface LocalCategory {
  name: string;
  count: number;
}

export const LOCAL_CATEGORIES: LocalCategory[] = [
  { name: 'Carpenter', count: 5 },
  { name: 'Painter', count: 3 },
  { name: 'Pharmacy', count: 3 },
  { name: 'Real Estate Consultant', count: 3 },
  { name: 'Interior Work', count: 2 },
  { name: 'Electrician', count: 2 },
  { name: 'Plumber', count: 4 },
  { name: 'AC Repair', count: 2 },
  { name: 'Courier Pickup', count: 1 },
  { name: 'Makeup Artist', count: 2 },
];

export const LOCAL_CONTACTS: LocalContact[] = [
  // Carpenter (5)
  { id: 'lc_1', name: 'Ramesh Kumar', category: 'Carpenter', phone: '+91 98765 43210', addedBy: { name: 'Priya Sharma', initials: 'PS' }, likes: 12, timeAgo: '1 Year ago' },
  { id: 'lc_2', name: 'Suresh Patel', category: 'Carpenter', phone: '+91 87654 32109', addedBy: { name: 'Amit Verma', initials: 'AV' }, likes: 8, timeAgo: '8 Months ago' },
  { id: 'lc_3', name: 'Mahesh Yadav', category: 'Carpenter', phone: '+91 76543 21098', addedBy: { name: 'Neha Gupta', initials: 'NG' }, likes: 5, timeAgo: '2 Years ago' },
  { id: 'lc_4', name: 'Dinesh Chauhan', category: 'Carpenter', phone: '+91 65432 10987', addedBy: { name: 'Rahul Singh', initials: 'RS' }, likes: 3, timeAgo: '3 Years ago' },
  { id: 'lc_5', name: 'Rajesh Tiwari', category: 'Carpenter', phone: '+91 54321 09876', addedBy: { name: 'Kavya Nair', initials: 'KN' }, likes: 9, timeAgo: '6 Months ago' },
  // Painter (3)
  { id: 'lc_6', name: 'Vikas Rao', category: 'Painter', phone: '+91 93210 98765', addedBy: { name: 'Sunita Reddy', initials: 'SR' }, likes: 7, timeAgo: '1 Year ago' },
  { id: 'lc_7', name: 'Anil Sinha', category: 'Painter', phone: '+91 82109 87654', addedBy: { name: 'Deepak Kumar', initials: 'DK' }, likes: 4, timeAgo: '2 Years ago' },
  { id: 'lc_8', name: 'Sunil Mishra', category: 'Painter', phone: '+91 71098 76543', addedBy: { name: 'Anjali Mehta', initials: 'AM' }, likes: 11, timeAgo: '4 Months ago' },
  // Pharmacy (3)
  { id: 'lc_9', name: 'MedPlus Pharmacy', category: 'Pharmacy', phone: '+91 22 2765 4321', addedBy: { name: 'Dr. Ravi Joshi', initials: 'RJ' }, likes: 25, timeAgo: '2 Years ago' },
  { id: 'lc_10', name: 'Apollo Chemist', category: 'Pharmacy', phone: '+91 22 2654 3210', addedBy: { name: 'Pooja Iyer', initials: 'PI' }, likes: 18, timeAgo: '1 Year ago' },
  { id: 'lc_11', name: 'Guardian Pharmacy', category: 'Pharmacy', phone: '+91 22 2543 2109', addedBy: { name: 'Vikram Jain', initials: 'VJ' }, likes: 14, timeAgo: '8 Months ago' },
  // Real Estate Consultant (3)
  { id: 'lc_12', name: 'Narendra Kapoor', category: 'Real Estate Consultant', phone: '+91 99876 54321', addedBy: { name: 'Ritu Agarwal', initials: 'RA' }, likes: 6, timeAgo: '3 Years ago' },
  { id: 'lc_13', name: 'Sanjay Malhotra', category: 'Real Estate Consultant', phone: '+91 88765 43210', addedBy: { name: 'Nidhi Bansal', initials: 'NB' }, likes: 9, timeAgo: '1 Year ago' },
  { id: 'lc_14', name: 'Rohan Khanna', category: 'Real Estate Consultant', phone: '+91 77654 32109', addedBy: { name: 'Arjun Das', initials: 'AD' }, likes: 4, timeAgo: '6 Months ago' },
  // Interior Work (2)
  { id: 'lc_15', name: 'Creative Interiors', category: 'Interior Work', phone: '+91 95432 10987', addedBy: { name: 'Meena Pillai', initials: 'MP' }, likes: 15, timeAgo: '1 Year ago' },
  { id: 'lc_16', name: 'Design Studio', category: 'Interior Work', phone: '+91 84321 09876', addedBy: { name: 'Saurabh Tiwari', initials: 'ST' }, likes: 11, timeAgo: '2 Years ago' },
  // Electrician (2)
  { id: 'lc_17', name: 'Mohan Electricals', category: 'Electrician', phone: '+91 91234 56789', addedBy: { name: 'Kiran Shah', initials: 'KS' }, likes: 20, timeAgo: '1 Year ago' },
  { id: 'lc_18', name: 'Prasad Wireman', category: 'Electrician', phone: '+91 80123 45678', addedBy: { name: 'Leela Varma', initials: 'LV' }, likes: 8, timeAgo: '3 Months ago' },
  // Plumber (4)
  { id: 'lc_19', name: 'Quick Fix Plumbing', category: 'Plumber', phone: '+91 97890 12345', addedBy: { name: 'Ganesh Rao', initials: 'GR' }, likes: 22, timeAgo: '1 Year ago' },
  { id: 'lc_20', name: 'Shyam Plumbers', category: 'Plumber', phone: '+91 86789 01234', addedBy: { name: 'Lalitha Krishnan', initials: 'LK' }, likes: 16, timeAgo: '2 Years ago' },
  { id: 'lc_21', name: 'Ram Pipeline Services', category: 'Plumber', phone: '+91 75678 90123', addedBy: { name: 'Bala Murugan', initials: 'BM' }, likes: 7, timeAgo: '8 Months ago' },
  { id: 'lc_22', name: 'Expert Plumbing Co.', category: 'Plumber', phone: '+91 64567 89012', addedBy: { name: 'Chandra Sekhar', initials: 'CS' }, likes: 13, timeAgo: '5 Months ago' },
  // AC Repair (2)
  { id: 'lc_23', name: 'Cool Tech Services', category: 'AC Repair', phone: '+91 93456 78901', addedBy: { name: 'Naren Bose', initials: 'NB' }, likes: 19, timeAgo: '1 Year ago' },
  { id: 'lc_24', name: 'Frost AC Services', category: 'AC Repair', phone: '+91 82345 67890', addedBy: { name: 'Shalini Dubey', initials: 'SD' }, likes: 10, timeAgo: '6 Months ago' },
  // Courier Pickup (1)
  { id: 'lc_25', name: 'BlueDart Agent', category: 'Courier Pickup', phone: '+91 98901 23456', addedBy: { name: 'Vinod Pandey', initials: 'VP' }, likes: 30, timeAgo: '2 Years ago' },
  // Makeup Artist (2)
  { id: 'lc_26', name: 'Beautique Studio', category: 'Makeup Artist', phone: '+91 90012 34567', addedBy: { name: 'Preethi Menon', initials: 'PM' }, likes: 17, timeAgo: '1 Year ago' },
  { id: 'lc_27', name: 'Glamour by Pooja', category: 'Makeup Artist', phone: '+91 89901 23456', addedBy: { name: 'Asha Pillai', initials: 'AP' }, likes: 24, timeAgo: '8 Months ago' },
];
