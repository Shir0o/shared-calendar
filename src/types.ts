import type { CalendarEvent } from './lib/calendar';

export interface HoverPayload {
  ev: CalendarEvent;
  x: number;
  y: number;
}

export interface MorePayload {
  day: Date;
  events: CalendarEvent[];
}

export type ViewId = 'month' | 'week' | 'agenda' | 'timeline' | 'year';

export type Density = 'compact' | 'default' | 'spacious';

export type Theme = 'light' | 'dark';

export interface Tweaks {
  density: Density;
  theme: Theme;
  accent: string;
  defaultView: ViewId;
  showWeekends: boolean;
}
