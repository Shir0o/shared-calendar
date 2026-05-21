import React from 'react';
import type { CalendarEvent } from '../types';
import { useAuth } from '../context/AuthContext';

interface EventDetailModalProps {
  isOpen: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  event,
  onClose,
  onEdit,
  onDelete
}) => {
  const { user } = useAuth();
  
  if (!isOpen || !event) return null;

  const isCreatorOrAdmin = user && (
    user.role === 'OWNER' || 
    user.role === 'ADMIN' || 
    event.createdBy.toLowerCase() === user.email.toLowerCase()
  );

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventTagColorClasses = (type: string) => {
    switch (type) {
      case 'work': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'offsite': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'personal': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  const handleEditClick = () => {
    onEdit(event);
    onClose();
  };

  const handleDeleteClick = () => {
    if (window.confirm(`Are you sure you want to delete the event "${event.title}"?`)) {
      onDelete(event.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        
        {/* Color bar at top based on event type */}
        <div className="h-2 w-full" style={{ backgroundColor: event.color || '#2b93ee' }} />

        {/* Modal Header */}
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider capitalize ${getEventTagColorClasses(event.type)}`}
            >
              {event.type}
            </span>
            {event.visibility === 'PRIVATE' && (
              <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]">lock</span>
                Private
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </header>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Title & Creator */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">{event.title}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Created by <span className="font-semibold text-slate-500">{event.createdBy}</span>
            </p>
          </div>

          {/* Time & Recurrence */}
          <div className="flex gap-3 items-start">
            <span className="material-symbols-outlined text-slate-400 text-xl mt-0.5">schedule</span>
            <div>
              <p className="text-sm font-semibold text-slate-800">{formatDateTime(event.start)}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                to {formatDateTime(event.end)}
                {event.recurrence && event.recurrence !== 'none' && (
                  <span className="ml-1 text-primary font-medium capitalize">
                    (Repeats {event.recurrence})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Room Allocation */}
          {event.room && (
            <div className="flex gap-3 items-start">
              <span className="material-symbols-outlined text-slate-400 text-xl mt-0.5">meeting_room</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{event.room}</p>
                <p className="text-xs text-slate-500 mt-0.5">Allocated Workspace Room Slot</p>
              </div>
            </div>
          )}

          {/* Attendees List */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex gap-3 items-start">
              <span className="material-symbols-outlined text-slate-400 text-xl mt-0.5">group</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Attendees ({event.attendees.length})
                </p>
                <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-2">
                  {event.attendees.map((email) => (
                    <div key={email} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center">
                        {email[0].toUpperCase()}
                      </div>
                      <span className="text-xs text-slate-600 truncate">{email}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex gap-3 items-start">
              <span className="material-symbols-outlined text-slate-400 text-xl mt-0.5">notes</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</p>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <footer className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div>
            {isCreatorOrAdmin ? (
              <button
                onClick={handleDeleteClick}
                className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Delete
              </button>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Read-Only
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
            >
              Close
            </button>
            {isCreatorOrAdmin && (
              <button
                onClick={handleEditClick}
                className="flex items-center gap-1 px-4 py-2 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl text-xs shadow-sm transition-colors shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Edit Event
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
