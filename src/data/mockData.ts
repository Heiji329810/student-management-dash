import type { Club, Student, User } from '@/types';

export const CLUB_CATEGORIES = [
  'School Official Events',
  'Science',
  'Computer Science',
  'Academic/Competitions',
  'Art and Design',
  'Social Care/Volunteer',
] as const;

export type ClubCategory = (typeof CLUB_CATEGORIES)[number];

export const mockStudents: Student[] = [
  { id: 's1', name: 'Alice Johnson', email: 'alice@university.edu', studentId: 'STU001' },
  { id: 's2', name: 'Bob Smith', email: 'bob@university.edu', studentId: 'STU002' },
  { id: 's3', name: 'Charlie Brown', email: 'charlie@university.edu', studentId: 'STU003' },
  { id: 's4', name: 'Diana Prince', email: 'diana@university.edu', studentId: 'STU004' },
  { id: 's5', name: 'Emma Wilson', email: 'emma@university.edu', studentId: 'STU005' },
];

export const mockUsers: User[] = [
  { id: 'u1', name: 'Alice Johnson', email: 'alice@university.edu', role: 'student', studentId: 'STU001' },
  { id: 'u2', name: 'Bob Smith', email: 'bob@university.edu', role: 'student', studentId: 'STU002' },
  { id: 'u3', name: 'Emma Wilson', email: 'emma@university.edu', role: 'student', studentId: 'STU005' },
  { id: 'u4', name: 'Charlie Brown', email: 'charlie@university.edu', role: 'student', studentId: 'STU003' },
  { id: 'f1', name: 'John Founder', email: 'john@university.edu', role: 'founder' },
  { id: 'f2', name: 'Sarah Leader', email: 'sarah@university.edu', role: 'founder' },
];

export const mockClubs: Club[] = [
  {
    id: 'c1',
    name: 'Computer Science Club',
    description: 'A club for computer science enthusiasts to collaborate on projects and share knowledge.',
    category: 'Computer Science',
    founderId: 'f1',
    founderName: 'John Founder',
    members: [],
    activities: [
      {
        id: 'a1',
        title: 'Hackathon 2024',
        description: 'Join us for a 24-hour coding competition with prizes!',
        date: '2024-12-15',
        location: 'Tech Building Room 101',
        maxParticipants: 50,
        registeredStudents: ['s1', 's2'],
        clubId: 'c1',
      },
      {
        id: 'a2',
        title: 'Web Development Workshop',
        description: 'Learn React and Next.js from industry experts.',
        date: '2024-12-10',
        location: 'Library Conference Room',
        maxParticipants: 30,
        registeredStudents: ['s1', 's3'],
        clubId: 'c1',
      },
    ],
  },
  {
    id: 'c2',
    name: 'Photography Society',
    description: 'Capture moments and share your passion for photography with fellow students.',
    category: 'Art and Design',
    founderId: 'f2',
    founderName: 'Sarah Leader',
    members: [],
    activities: [
      {
        id: 'a3',
        title: 'Nature Photography Walk',
        description: 'Explore campus and capture beautiful nature shots.',
        date: '2024-12-12',
        location: 'Campus Park',
        maxParticipants: 20,
        registeredStudents: ['s2', 's4'],
        clubId: 'c2',
      },
      {
        id: 'a4',
        title: 'Portrait Photography Workshop',
        description: 'Learn professional portrait photography techniques.',
        date: '2024-12-18',
        location: 'Arts Building Studio',
        maxParticipants: 15,
        registeredStudents: ['s1'],
        clubId: 'c2',
      },
    ],
  },
  {
    id: 'c3',
    name: 'Debate Team',
    description: 'Sharpen your argumentation skills and participate in competitive debates.',
    category: 'Academic/Competitions',
    founderId: 'f1',
    founderName: 'John Founder',
    members: [],
    activities: [
      {
        id: 'a5',
        title: 'Inter-University Debate Competition',
        description: 'Compete against other universities in a formal debate tournament.',
        date: '2024-12-20',
        location: 'Main Auditorium',
        maxParticipants: 8,
        registeredStudents: ['s3', 's4'],
        clubId: 'c3',
      },
    ],
  },
  {
    id: 'c4',
    name: 'Environmental Club',
    description: 'Promote sustainability and environmental awareness on campus.',
    category: 'Social Care/Volunteer',
    founderId: 'f2',
    founderName: 'Sarah Leader',
    members: [],
    activities: [
      {
        id: 'a6',
        title: 'Campus Cleanup Day',
        description: 'Help clean up the campus and promote environmental awareness.',
        date: '2024-12-14',
        location: 'Campus Grounds',
        maxParticipants: 100,
        registeredStudents: ['s1', 's2', 's3', 's4'],
        clubId: 'c4',
      },
    ],
  },
  {
    id: 'c5',
    name: 'Student Affairs Office',
    description: 'Official school events including orientations, ceremonies, and campus-wide programs.',
    category: 'School Official Events',
    founderId: 'f1',
    founderName: 'John Founder',
    members: [],
    activities: [
      {
        id: 'a7',
        title: 'Spring Welcome Ceremony',
        description: 'Official opening ceremony for the spring semester with faculty and student leaders.',
        date: '2024-12-22',
        location: 'Main Auditorium',
        maxParticipants: 500,
        registeredStudents: ['s1', 's2', 's3'],
        clubId: 'c5',
      },
    ],
  },
  {
    id: 'c6',
    name: 'Science Research Society',
    description: 'Explore biology, chemistry, and physics through experiments, talks, and lab visits.',
    category: 'Science',
    founderId: 'f2',
    founderName: 'Sarah Leader',
    members: [],
    activities: [
      {
        id: 'a8',
        title: 'Lab Open Day',
        description: 'Tour research labs and meet scientists working on campus projects.',
        date: '2024-12-16',
        location: 'Science Building',
        maxParticipants: 40,
        registeredStudents: ['s2', 's4'],
        clubId: 'c6',
      },
    ],
  },
  {
    id: 'c7',
    name: 'Student Council',
    description:
      'The student representative body that supports school events and annual council departments.',
    category: 'School Official Events',
    founderId: 'f1',
    founderName: 'John Founder',
    members: ['s1', 's2', 's3'],
    activities: [],
  },
];

// Current user (simulating logged-in user)
export const currentUser: User = mockUsers[0]; // Alice Johnson as student
