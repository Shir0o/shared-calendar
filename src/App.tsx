import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { MonthView } from './views/MonthView';
import { ListView } from './views/ListView';
import { TeamAvailabilityView } from './views/TeamAvailabilityView';
import { SmartMeetingFinderView } from './views/SmartMeetingFinderView';
import { AnalyticsView } from './views/AnalyticsView';
import { HistoryView } from './views/HistoryView';
import { SecurityView } from './views/SecurityView';
import { SettingsView } from './views/SettingsView';
import { DesignSystemView } from './views/DesignSystemView';
import { LoginView } from './views/LoginView';
import { EventModal } from './components/EventModal';
import { EventDetailModal } from './components/EventDetailModal';
import type { CalendarEvent, ActiveTab, MeetingRoom } from './types';

const ROOMS: MeetingRoom[] = [
  { id: '1', name: 'Boardroom A', capacity: 12, features: ['Whiteboard', 'AV Screen', 'Video Conf'] },
  { id: '2', name: 'Meeting Room Alpha', capacity: 6, features: ['AV Screen', 'Whiteboard'] },
  { id: '3', name: 'Huddle Studio B', capacity: 4, features: ['AV Screen'] },
];

const DEFAULT_EVENTS: CalendarEvent[] = [
  {
    id: 'e-1',
    title: 'Q4 Product Offsite',
    description: 'Systemic planning for product strategy and roadmap milestones in Q4.',
    start: '2026-05-20T09:00',
    end: '2026-05-20T12:00',
    attendees: ['yilongwang05@gmail.com', 'sarah.connor@example.com'],
    room: 'Boardroom A',
    type: 'offsite',
    color: '#a855f7', // purple
    recurrence: 'none',
    visibility: 'PUBLIC',
    createdBy: 'yilongwang05@gmail.com'
  },
  {
    id: 'e-2',
    title: 'Sprint Retrospective',
    description: 'Weekly team feedback loop and sprint tasks assessment.',
    start: '2026-05-21T14:00',
    end: '2026-05-21T15:00',
    attendees: ['yilongwang05@gmail.com', 'john.doe@example.com', 'alex.smith@example.com', 'jane.foster@example.com'],
    room: 'Meeting Room Alpha',
    type: 'meeting',
    color: '#005ea1', // primary
    recurrence: 'none',
    visibility: 'PUBLIC',
    createdBy: 'yilongwang05@gmail.com'
  },
  {
    id: 'e-3',
    title: 'Weekly 1:1 Sync',
    description: 'Engineering sync alignment chat.',
    start: '2026-05-21T10:00',
    end: '2026-05-21T11:30',
    attendees: ['sarah.connor@example.com', 'john.doe@example.com'],
    room: 'Huddle Studio B',
    type: 'meeting',
    color: '#005ea1', // primary
    recurrence: 'none',
    visibility: 'PRIVATE',
    createdBy: 'sarah.connor@example.com'
  },
  {
    id: 'e-4',
    title: 'Security Audit Check',
    description: 'Checking whitelist access, domain security configurations and credentials policies.',
    start: '2026-05-22T10:00',
    end: '2026-05-22T12:00',
    attendees: ['yilongwang05@gmail.com', 'alex.smith@example.com'],
    room: 'Boardroom A',
    type: 'work',
    color: '#10b981', // green
    recurrence: 'none',
    visibility: 'PUBLIC',
    createdBy: 'yilongwang05@gmail.com'
  }
];

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('month_view');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [inspectingEvent, setInspectingEvent] = useState<CalendarEvent | null>(null);

  // Sync events with localStorage
  useEffect(() => {
    const stored = localStorage.getItem('ss_events');
    if (stored) {
      setEvents(JSON.parse(stored));
    } else {
      setEvents(DEFAULT_EVENTS);
      localStorage.setItem('ss_events', JSON.stringify(DEFAULT_EVENTS));
    }

    const handleSync = () => {
      const updated = localStorage.getItem('ss_events');
      if (updated) setEvents(JSON.parse(updated));
    };

    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, []);

  const saveEvents = (newEvents: CalendarEvent[]) => {
    setEvents(newEvents);
    localStorage.setItem('ss_events', JSON.stringify(newEvents));
    // Trigger storage event manually to keep other views synced
    window.dispatchEvent(new Event('storage'));
  };

  const handleSaveEvent = (savedEvent: CalendarEvent) => {
    const isEdit = events.some(e => e.id === savedEvent.id);
    let newEvents: CalendarEvent[];
    if (isEdit) {
      newEvents = events.map(e => e.id === savedEvent.id ? savedEvent : e);
      logToHistory('UPDATE', `Updated event "${savedEvent.title}"`);
    } else {
      newEvents = [...events, savedEvent];
      logToHistory('CREATE', `Created event "${savedEvent.title}"`);
    }
    saveEvents(newEvents);
    setIsCreateOpen(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    const toDelete = events.find(e => e.id === eventId);
    const newEvents = events.filter(e => e.id !== eventId);
    saveEvents(newEvents);
    if (toDelete) {
      logToHistory('DELETE', `Deleted event "${toDelete.title}"`);
    }
    setIsDetailOpen(false);
    setInspectingEvent(null);
  };

  const logToHistory = (action: 'CREATE' | 'UPDATE' | 'DELETE', details: string) => {
    const storedLogs = localStorage.getItem('ss_changelogs');
    const logs = storedLogs ? JSON.parse(storedLogs) : [];
    const newEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventTitle: action,
      user: user?.email || 'SYSTEM',
      action: action,
      timestamp: new Date().toISOString(),
      details: details
    };
    localStorage.setItem('ss_changelogs', JSON.stringify([newEntry, ...logs]));
    window.dispatchEvent(new Event('storage'));
  };

  // When a slot is selected from SmartMeetingFinderView
  const handleSelectSlot = (start: string, end: string, attendees: string[]) => {
    const draftEvent: CalendarEvent = {
      id: `draft-${Date.now()}`,
      title: 'Sync Slot Meeting',
      description: 'Systemic overlapping slot discovered by Smart Finder.',
      start,
      end,
      attendees,
      type: 'meeting',
      visibility: 'PUBLIC',
      createdBy: user?.email || 'unknown'
    };
    setEditingEvent(draftEvent);
    setIsCreateOpen(true);
  };

  if (!user || user.role === 'NONE' || user.role === 'PENDING') {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'month_view':
        return (
          <MonthView
            events={events}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            onDateClick={(dateStr) => {
              setSelectedDate(dateStr);
              setEditingEvent(null);
              setIsCreateOpen(true);
            }}
            onEventClick={(evt) => {
              setInspectingEvent(evt);
              setIsDetailOpen(true);
            }}
          />
        );
      case 'list_view':
        return (
          <ListView
            events={events}
            onEventClick={(evt) => {
              setInspectingEvent(evt);
              setIsDetailOpen(true);
            }}
            onAddEventClick={() => {
              setSelectedDate(undefined);
              setEditingEvent(null);
              setIsCreateOpen(true);
            }}
          />
        );
      case 'team_availability':
        return (
          <TeamAvailabilityView
            events={events}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        );
      case 'smart_meeting_finder':
        return (
          <SmartMeetingFinderView
            events={events}
            onSelectSlot={handleSelectSlot}
          />
        );
      case 'analytics':
        return <AnalyticsView />;
      case 'history':
        return <HistoryView />;
      case 'security':
        return <SecurityView />;
      case 'settings':
        return <SettingsView />;
      case 'design_system':
        return <DesignSystemView />;
      default:
        return (
          <MonthView
            events={events}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            onDateClick={() => {}}
            onEventClick={() => {}}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background-light overflow-hidden">
      {/* Top Header Navigation */}
      <Topbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onCreateEventClick={() => {
          setSelectedDate(undefined);
          setEditingEvent(null);
          setIsCreateOpen(true);
        }}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar Navigation */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Active view */}
        {renderActiveView()}
      </div>

      {/* Modals & Dialog overlays */}
      <EventModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        selectedDate={selectedDate}
        editingEvent={editingEvent}
        rooms={ROOMS}
      />

      <EventDetailModal
        isOpen={isDetailOpen}
        event={inspectingEvent}
        onClose={() => {
          setIsDetailOpen(false);
          setInspectingEvent(null);
        }}
        onEdit={(evt) => {
          setEditingEvent(evt);
          setIsCreateOpen(true);
        }}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
