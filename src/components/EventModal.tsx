import React, { useState, useEffect } from 'react';
import type { CalendarEvent, EventType, MeetingRoom } from '../types';
import { useAuth } from '../context/AuthContext';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  selectedDate?: string; // YYYY-MM-DD format
  editingEvent?: CalendarEvent | null;
  rooms: MeetingRoom[];
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  editingEvent,
  rooms
}) => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'people' | 'settings'>('details');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [type, setType] = useState<EventType>('meeting');
  const [room, setRoom] = useState('');
  const [attendeesInput, setAttendeesInput] = useState('');
  const [attendeesList, setAttendeesList] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [customColor, setCustomColor] = useState('#2b93ee');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const typeColors: { [key in EventType]: string } = {
    meeting: '#2b93ee',
    work: '#10b981',
    offsite: '#8b5cf6',
    personal: '#f59e0b'
  };

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description || '');
      setStart(editingEvent.start);
      setEnd(editingEvent.end);
      setType(editingEvent.type);
      setRoom(editingEvent.room || '');
      setAttendeesList(editingEvent.attendees);
      setRecurrence(editingEvent.recurrence || 'none');
      setVisibility(editingEvent.visibility);
      setCustomColor(editingEvent.color || typeColors[editingEvent.type]);
    } else {
      setTitle('');
      setDescription('');
      
      const defaultStart = selectedDate 
        ? `${selectedDate}T09:00` 
        : `${new Date().toISOString().split('T')[0]}T09:00`;
      const defaultEnd = selectedDate 
        ? `${selectedDate}T10:00` 
        : `${new Date().toISOString().split('T')[0]}T10:00`;
        
      setStart(defaultStart);
      setEnd(defaultEnd);
      setType('meeting');
      setRoom('');
      setAttendeesList([]);
      setAttendeesInput('');
      setRecurrence('none');
      setVisibility('PUBLIC');
      setCustomColor(typeColors.meeting);
    }
    setErrors({});
    setActiveSubTab('details');
  }, [editingEvent, selectedDate, isOpen]);

  // Sync color when event type changes if it hasn't been custom customized
  const handleTypeChange = (newType: EventType) => {
    setType(newType);
    setCustomColor(typeColors[newType]);
  };

  const handleAddAttendee = (e: React.FormEvent) => {
    e.preventDefault();
    const email = attendeesInput.trim().toLowerCase();
    if (!email) return;
    
    // Quick regex email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ ...errors, attendees: 'Invalid email address format' });
      return;
    }

    if (attendeesList.includes(email)) {
      setAttendeesInput('');
      return;
    }

    setAttendeesList([...attendeesList, email]);
    setAttendeesInput('');
    setErrors({ ...errors, attendees: '' });
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendeesList(attendeesList.filter(a => a !== email));
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = 'Event title is required';
    if (!start) newErrors.start = 'Start time is required';
    if (!end) newErrors.end = 'End time is required';
    
    if (start && end && new Date(start) >= new Date(end)) {
      newErrors.end = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || !user) return;

    const eventPayload: CalendarEvent = {
      id: editingEvent?.id || `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      description: description.trim() || undefined,
      start,
      end,
      type,
      room: room || undefined,
      attendees: attendeesList,
      recurrence,
      visibility,
      color: customColor,
      createdBy: editingEvent?.createdBy || user.email
    };

    onSave(eventPayload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-xl">
              {editingEvent ? 'edit_calendar' : 'add_circle'}
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {editingEvent ? 'Modify Event Settings' : 'Create Extensive Event'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </header>

        {/* Modal sub-tab bar */}
        <div className="px-6 border-b border-slate-100 flex gap-4 shrink-0 bg-slate-50/30">
          {(['details', 'people', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeSubTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeSubTab === 'details' && (
            <div className="space-y-4">
              {/* Event Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Event Title *
                </label>
                <input
                  type="text"
                  placeholder="Add title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm transition-all outline-none ${
                    errors.title ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary'
                  }`}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1 font-medium">{errors.title}</p>}
              </div>

              {/* Event Type & Color Picker */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Category Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as EventType)}
                    className="w-full px-3 py-2.5 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none"
                  >
                    <option value="meeting">Team Meeting</option>
                    <option value="work">Focus Work</option>
                    <option value="offsite">Q4 Offsite / Event</option>
                    <option value="personal">Personal Leave / Out of office</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Color Tag
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-10 h-10 border border-slate-200 rounded-xl cursor-pointer p-0 overflow-hidden bg-transparent"
                    />
                    <span className="text-xs text-slate-500 font-mono uppercase">{customColor}</span>
                  </div>
                </div>
              </div>

              {/* Timings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Starts *
                  </label>
                  <input
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none ${
                      errors.start ? 'border-red-500' : 'border-slate-200 focus:border-primary focus:ring-1'
                    }`}
                  />
                  {errors.start && <p className="text-red-500 text-xs mt-1 font-medium">{errors.start}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Ends *
                  </label>
                  <input
                    type="datetime-local"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none ${
                      errors.end ? 'border-red-500' : 'border-slate-200 focus:border-primary focus:ring-1'
                    }`}
                  />
                  {errors.end && <p className="text-red-500 text-xs mt-1 font-medium">{errors.end}</p>}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Description / Notes
                </label>
                <textarea
                  placeholder="Agenda items, video conference link, notes, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm transition-all outline-none resize-none"
                />
              </div>
            </div>
          )}

          {activeSubTab === 'people' && (
            <div className="space-y-6">
              {/* Meeting Room Allocation */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Allocate Meeting Room
                </label>
                <select
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none"
                >
                  <option value="">No Physical Room (Virtual / Remote)</option>
                  {rooms.map(rm => (
                    <option key={rm.id} value={rm.name}>
                      {rm.name} (Cap: {rm.capacity} • {rm.features.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Attendees List */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Attendees
                </label>
                <form onSubmit={handleAddAttendee} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter email (e.g. sarah.connor@example.com)"
                    value={attendeesInput}
                    onChange={(e) => setAttendeesInput(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm transition-all outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    Add
                  </button>
                </form>
                {errors.attendees && <p className="text-red-500 text-xs mt-1 font-medium">{errors.attendees}</p>}

                {/* Attendee Badges List */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {attendeesList.length === 0 ? (
                    <p className="text-slate-400 text-xs italic py-2">No attendees added yet.</p>
                  ) : (
                    attendeesList.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-sm"
                      >
                        <span className="truncate max-w-[150px]">{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(email)}
                          className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                        >
                          <span className="material-symbols-outlined text-[12px] font-bold">close</span>
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'settings' && (
            <div className="space-y-4">
              {/* Recurrence Rule */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Recurrence
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as any)}
                  className="w-full px-3 py-2.5 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none"
                >
                  <option value="none">One-time Event</option>
                  <option value="daily">Repeat Daily</option>
                  <option value="weekly">Repeat Weekly</option>
                  <option value="monthly">Repeat Monthly</option>
                </select>
              </div>

              {/* Visibility and Security Controls */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Privacy & Access
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 bg-slate-50/50 border border-slate-200/50 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="visibility"
                      value="PUBLIC"
                      checked={visibility === 'PUBLIC'}
                      onChange={() => setVisibility('PUBLIC')}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">Public Organization View</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Anyone in the organization can inspect event details, agendas, and logs.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 bg-slate-50/50 border border-slate-200/50 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="visibility"
                      value="PRIVATE"
                      checked={visibility === 'PRIVATE'}
                      onChange={() => setVisibility('PRIVATE')}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">Private (Attendees Only)</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Details are hidden from the public timeline. Only whitelisted attendees can inspect notes.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl text-xs shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            {editingEvent ? 'Save Changes' : 'Publish Event'}
          </button>
        </footer>
      </div>
    </div>
  );
};
