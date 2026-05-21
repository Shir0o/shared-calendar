export type UserRole = 'OWNER' | 'ADMIN' | 'USER' | 'PENDING' | 'NONE';

export interface User {
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
}

export type EventType = 'work' | 'offsite' | 'personal' | 'meeting';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO date string (YYYY-MM-DDTHH:MM)
  end: string;   // ISO date string (YYYY-MM-DDTHH:MM)
  attendees: string[]; // email addresses
  room?: string; // Room ID or name
  type: EventType;
  color?: string; // Hex color override
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  visibility: 'PUBLIC' | 'PRIVATE';
  createdBy: string; // email address
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  // Timeline slices of availability for a given day: e.g. "09:00-10:00": "busy"
  availability: {
    [hourRange: string]: 'free' | 'busy' | 'tentative';
  };
}

export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  features: string[];
}

export interface ChangeLogEntry {
  id: string;
  eventId?: string;
  eventTitle: string;
  user: string; // email of changer
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ROLE_CHANGE' | 'WHITELIST_ADD' | 'WHITELIST_REMOVE';
  timestamp: string; // ISO string
  details: string;
}

export type ActiveTab = 
  | 'month_view'
  | 'list_view'
  | 'team_availability'
  | 'smart_meeting_finder'
  | 'analytics'
  | 'history'
  | 'settings'
  | 'security'
  | 'design_system';
