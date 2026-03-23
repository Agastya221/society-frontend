export type ElectionType = 'ELECTION' | 'SURVEY';
export type ElectionStatus = 'ACTIVE' | 'COMPLETED';

export interface Candidate {
  id: string;
  name: string;
  subtitle: string;
  votes: number;
}

export interface SurveyOption {
  id: string;
  text: string;
  votes: number;
}

export interface ElectionItem {
  id: string;
  type: ElectionType;
  status: ElectionStatus;
  title: string;
  society: string;
  totalVotes: number;
  deadline: string;
  hasVoted: boolean;
  candidates?: Candidate[];
  question?: string;
  options?: SurveyOption[];
}

export const ELECTIONS: ElectionItem[] = [
  {
    id: 'el_1',
    type: 'ELECTION',
    status: 'ACTIVE',
    title: 'Best RWA President 2025',
    society: 'Greenwood Heights Society',
    totalVotes: 142,
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    hasVoted: false,
    candidates: [
      { id: 'c1', name: 'Rajesh Sharma', subtitle: 'Block A Resident · 8 yrs', votes: 58 },
      { id: 'c2', name: 'Priya Verma', subtitle: 'Block C Resident · 5 yrs', votes: 47 },
      { id: 'c3', name: 'Anil Mehta', subtitle: 'Block B Resident · 12 yrs', votes: 37 },
    ],
  },
  {
    id: 'el_2',
    type: 'SURVEY',
    status: 'ACTIVE',
    title: 'Best Time for Society Maintenance?',
    society: 'Greenwood Heights Society',
    totalVotes: 89,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    hasVoted: false,
    question: 'When is the best time slot for monthly society maintenance work to minimize inconvenience?',
    options: [
      { id: 'o1', text: 'Weekday Morning (9AM – 12PM)', votes: 32 },
      { id: 'o2', text: 'Weekday Afternoon (2PM – 5PM)', votes: 18 },
      { id: 'o3', text: 'Saturday Morning (9AM – 1PM)', votes: 27 },
      { id: 'o4', text: 'Sunday Morning (9AM – 1PM)', votes: 12 },
    ],
  },
  {
    id: 'el_3',
    type: 'ELECTION',
    status: 'COMPLETED',
    title: 'RWA Secretary Election 2024',
    society: 'Greenwood Heights Society',
    totalVotes: 210,
    deadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    hasVoted: true,
    candidates: [
      { id: 'c4', name: 'Sunita Rao', subtitle: 'Block D Resident · 6 yrs', votes: 112 },
      { id: 'c5', name: 'Vikram Joshi', subtitle: 'Block A Resident · 3 yrs', votes: 98 },
    ],
  },
  {
    id: 'el_4',
    type: 'SURVEY',
    status: 'COMPLETED',
    title: 'New Amenity Preference Survey',
    society: 'Greenwood Heights Society',
    totalVotes: 175,
    deadline: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    hasVoted: true,
    question: 'Which new amenity would you most like to see added to our society?',
    options: [
      { id: 'o5', text: 'Outdoor Gym Equipment', votes: 72 },
      { id: 'o6', text: 'Kids Play Area Upgrade', votes: 55 },
      { id: 'o7', text: 'Indoor Games Room', votes: 30 },
      { id: 'o8', text: 'Yoga / Meditation Corner', votes: 18 },
    ],
  },
];
