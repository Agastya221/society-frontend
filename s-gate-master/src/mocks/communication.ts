export type PostCategory =
  | 'GENERAL'
  | 'MAINTENANCE'
  | 'EVENTS'
  | 'LOST_FOUND'
  | 'SAFETY'
  | 'FOR_SALE';

export interface CommunityComment {
  id: string;
  author: string;
  initials: string;
  role: 'RESIDENT' | 'ADMIN' | 'COMMITTEE';
  text: string;
  timeAgo: string;
}

export interface CommunityPost {
  id: string;
  category: PostCategory;
  title: string;
  body: string;
  isPinned: boolean;
  isAnonymous: boolean;
  postedBy: { name: string; flat: string; initials: string };
  timeAgo: string;
  likes: number;
  isLiked: boolean;
  comments: CommunityComment[];
}

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'cp_1',
    category: 'GENERAL',
    title: 'Monthly RWA Meeting — Saturday 29th March',
    body: 'Dear Residents, the monthly RWA meeting is scheduled for Saturday 29th March at 6:30 PM in the clubhouse. Agenda includes: lift maintenance update, parking allocation, security concerns, and upcoming Holi event planning. All residents are requested to attend. Please bring your suggestions.',
    isPinned: true,
    isAnonymous: false,
    postedBy: { name: 'Rajesh Sharma', flat: 'A-101', initials: 'RS' },
    timeAgo: '2 hours ago',
    likes: 24,
    isLiked: false,
    comments: [
      { id: 'cc1', author: 'Priya Verma', initials: 'PV', role: 'RESIDENT', text: 'Will attend! Can we also discuss the issue with water supply timings?', timeAgo: '1 hr ago' },
      { id: 'cc2', author: 'RWA Admin', initials: 'RA', role: 'ADMIN', text: 'Yes, water supply timing has been added to the agenda. See you all there!', timeAgo: '45 min ago' },
      { id: 'cc3', author: 'Anil Mehta', initials: 'AM', role: 'COMMITTEE', text: 'Confirmed. Minutes will be shared on the community board after the meeting.', timeAgo: '30 min ago' },
    ],
  },
  {
    id: 'cp_2',
    category: 'MAINTENANCE',
    title: 'Lift B-Wing Not Working Since 2 Days',
    body: 'The lift in B-Wing has been out of service since Thursday evening. Residents on upper floors are facing difficulty, especially the elderly. I have already reported this to the security desk but no update yet. Requesting RWA to take urgent action and share an ETA for repair.',
    isPinned: false,
    isAnonymous: false,
    postedBy: { name: 'Sunita Rao', flat: 'B-802', initials: 'SR' },
    timeAgo: '5 hours ago',
    likes: 38,
    isLiked: true,
    comments: [
      { id: 'cc4', author: 'RWA Admin', initials: 'RA', role: 'ADMIN', text: 'We are aware of the issue. The elevator technician has been called and will visit tomorrow morning. We apologize for the inconvenience.', timeAgo: '4 hr ago' },
      { id: 'cc5', author: 'Vikram Joshi', initials: 'VJ', role: 'RESIDENT', text: 'Same issue in my building last year. Took 5 days to fix. Hope it is faster this time.', timeAgo: '3 hr ago' },
      { id: 'cc6', author: 'Meena Pillai', initials: 'MP', role: 'RESIDENT', text: 'My mother is 70+ and cannot climb stairs. This needs to be fixed URGENTLY!', timeAgo: '2 hr ago' },
      { id: 'cc7', author: 'RWA Admin', initials: 'RA', role: 'ADMIN', text: 'Update: Technician confirmed for 9 AM tomorrow. Will share update once done.', timeAgo: '1 hr ago' },
    ],
  },
  {
    id: 'cp_3',
    category: 'MAINTENANCE',
    title: 'Water Tank Cleaning Scheduled — Sunday 30th',
    body: 'Please note that the overhead water tank cleaning is scheduled for Sunday 30th March from 8 AM to 2 PM. Water supply will be interrupted during this time. Residents are requested to store water in advance. This is a routine maintenance activity.',
    isPinned: false,
    isAnonymous: false,
    postedBy: { name: 'RWA Admin', flat: 'Office', initials: 'RA' },
    timeAgo: '1 day ago',
    likes: 15,
    isLiked: false,
    comments: [
      { id: 'cc8', author: 'Deepak Kumar', initials: 'DK', role: 'RESIDENT', text: 'Thanks for the advance notice. Will store water on Saturday night.', timeAgo: '20 hr ago' },
      { id: 'cc9', author: 'Neha Gupta', initials: 'NG', role: 'RESIDENT', text: 'Can you please also check the pump in the basement? It has been making noise.', timeAgo: '18 hr ago' },
    ],
  },
  {
    id: 'cp_4',
    category: 'EVENTS',
    title: 'Holi Celebration — 14th March in the Garden',
    body: 'Join us for a grand Holi celebration this year! The event will be held in the society garden on 14th March from 10 AM to 2 PM. There will be organic colours, DJ music, snacks, and sweets. Entry is FREE for all residents. Kids are welcome. Please wear old clothes!',
    isPinned: false,
    isAnonymous: false,
    postedBy: { name: 'Events Committee', flat: 'Committee', initials: 'EC' },
    timeAgo: '2 days ago',
    likes: 67,
    isLiked: true,
    comments: [
      { id: 'cc10', author: 'Kavya Nair', initials: 'KN', role: 'RESIDENT', text: 'Super excited! Will definitely come with family!', timeAgo: '1 day ago' },
      { id: 'cc11', author: 'Rahul Singh', initials: 'RS', role: 'RESIDENT', text: 'Will there be a dry area for those who do not want to play with colours?', timeAgo: '22 hr ago' },
      { id: 'cc12', author: 'Events Committee', initials: 'EC', role: 'COMMITTEE', text: 'Yes Rahul! We will have a separate seating area for those who prefer to watch. See you all there!', timeAgo: '20 hr ago' },
    ],
  },
  {
    id: 'cp_5',
    category: 'LOST_FOUND',
    title: 'Lost: Set of Keys Near Parking B2',
    body: 'I lost a set of keys near parking slot B2 on Wednesday evening around 7 PM. The keychain has a small blue Toyota remote and two door keys. If anyone has found it, please contact me or leave it at the security desk. I will collect it from there. Thank you!',
    isPinned: false,
    isAnonymous: false,
    postedBy: { name: 'Arjun Das', flat: 'C-304', initials: 'AD' },
    timeAgo: '1 day ago',
    likes: 4,
    isLiked: false,
    comments: [
      { id: 'cc13', author: 'Security Desk', initials: 'SD', role: 'ADMIN', text: 'Please visit the security cabin. Someone dropped a set of keys this morning. It may be yours.', timeAgo: '18 hr ago' },
      { id: 'cc14', author: 'Arjun Das', initials: 'AD', role: 'RESIDENT', text: 'Thank you! I found them. It was indeed at the security desk.', timeAgo: '10 hr ago' },
    ],
  },
  {
    id: 'cp_6',
    category: 'SAFETY',
    title: 'Unknown Vehicle Parked in Visitor Slot 3 for 4 Days',
    body: 'There is a black Honda City (MH-02-XX-1234) parked in visitor slot 3 since last Sunday. The slot is supposed to be for short-term visitor parking only. The vehicle has no society sticker and nobody seems to know who it belongs to. Requesting security team to look into this.',
    isPinned: false,
    isAnonymous: false,
    postedBy: { name: 'Vinod Pandey', flat: 'A-503', initials: 'VP' },
    timeAgo: '3 days ago',
    likes: 21,
    isLiked: false,
    comments: [
      { id: 'cc15', author: 'Security Desk', initials: 'SD', role: 'ADMIN', text: 'We have noted the vehicle number. A notice has been placed on the windshield. If no one claims it by tomorrow, we will contact traffic police.', timeAgo: '2 day ago' },
      { id: 'cc16', author: 'Pooja Iyer', initials: 'PI', role: 'RESIDENT', text: 'Good catch. Visitor slots are always misused. Thanks for reporting!', timeAgo: '2 day ago' },
    ],
  },
  {
    id: 'cp_7',
    category: 'FOR_SALE',
    title: 'Sofa Set for Sale — Good Condition',
    body: 'Selling a 3+1+1 sofa set in very good condition. Fabric material, beige colour, only 2 years old. We are moving to a new place and cannot take it along. Asking price ₹15,000 (negotiable). Please WhatsApp me if interested. Preference to society residents.',
    isPinned: false,
    isAnonymous: false,
    postedBy: { name: 'Shalini Dubey', flat: 'D-401', initials: 'SD' },
    timeAgo: '4 days ago',
    likes: 8,
    isLiked: false,
    comments: [
      { id: 'cc17', author: 'Bala Murugan', initials: 'BM', role: 'RESIDENT', text: 'Is it still available? Can I come see it this weekend?', timeAgo: '3 day ago' },
      { id: 'cc18', author: 'Shalini Dubey', initials: 'SD', role: 'RESIDENT', text: 'Yes still available! Saturday works. Will share my number on DM.', timeAgo: '3 day ago' },
    ],
  },
  {
    id: 'cp_8',
    category: 'GENERAL',
    title: 'Suggestion: Add Speed Breakers Near Children Play Area',
    body: 'Hi all, I have noticed that vehicles often speed through the lane near the children play area. This is very dangerous especially when kids are playing. I would like to suggest that the RWA consider installing 2 speed bumps on that lane. Let me know what others think!',
    isPinned: false,
    isAnonymous: true,
    postedBy: { name: 'Anonymous', flat: '', initials: 'AN' },
    timeAgo: '5 days ago',
    likes: 43,
    isLiked: false,
    comments: [
      { id: 'cc19', author: 'Chandra Sekhar', initials: 'CS', role: 'RESIDENT', text: 'Totally agree! I have seen multiple near-misses. This is urgent!', timeAgo: '4 day ago' },
      { id: 'cc20', author: 'RWA Admin', initials: 'RA', role: 'ADMIN', text: 'We will review this in the next committee meeting. Thank you for raising this important point.', timeAgo: '3 day ago' },
      { id: 'cc21', author: 'Naren Bose', initials: 'NB', role: 'RESIDENT', text: 'Speed bumps + a "Children Playing" sign would help a lot.', timeAgo: '2 day ago' },
    ],
  },
];
