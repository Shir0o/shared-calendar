import { useMemo, useState } from 'react';
import {
  CATEGORIES,
  addDays,
  conflictsForEvent,
  endOfMonth,
  eventEnd,
  expandEvents,
  fmtTime,
  isoDate,
  startOfMonth,
  type CalendarEvent,
  type CategoryId,
  type RRule,
} from '../lib/calendar';
import { Btn, Icon } from './ui';
import { CAT_BY_ID } from '../lib/calendar';
import { RecurrenceBlock } from './smart/RecurrenceBlock';
import { FindFreeSlot } from './smart/FindFreeSlot';
import { SuggestDates } from './smart/SuggestDates';

export type EditorInitial = Partial<CalendarEvent> & { start: Date };

interface EventEditorProps {
  initial: EditorInitial;
  allEvents: CalendarEvent[];
  onSave: (ev: CalendarEvent) => void;
  onCancel: () => void;
  onDelete: (ev: CalendarEvent, opts?: { series?: boolean }) => void;
}

export const EventEditor = ({ initial, allEvents, onSave, onCancel, onDelete }: EventEditorProps) => {
  const isNew = !initial.id;
  const [title, setTitle] = useState(initial.title || '');
  const [cat, setCat] = useState<CategoryId>(initial.cat || 'meeting');
  const [date, setDate] = useState<Date>(() => (initial.start ? initial.start : new Date()));
  const [allDay, setAllDay] = useState(!!initial.allDay);
  const [startH, setStartH] = useState(() => (initial.start ? initial.start.getHours() : 10));
  const [startM, setStartM] = useState(() => (initial.start ? initial.start.getMinutes() : 0));
  const [dur, setDur] = useState(initial.dur ?? 60);
  const [loc, setLoc] = useState(initial.loc || '');
  const [notes, setNotes] = useState(initial.notes || '');
  const [rrule, setRrule] = useState<RRule | null>(initial.rrule || null);

  const [tab, setTab] = useState<'finder' | 'suggest' | 'none'>('none');

  const draft: CalendarEvent = useMemo(() => {
    const start = new Date(date);
    if (allDay) start.setHours(0, 0, 0, 0);
    else start.setHours(startH, startM, 0, 0);
    return {
      ...(initial as CalendarEvent),
      id: initial.id || '__draft',
      title: title || 'Untitled event',
      cat,
      loc: loc || '—',
      notes,
      start,
      allDay,
      dur: allDay ? 0 : dur,
      end: allDay ? addDays(start, 1) : undefined,
      rrule: rrule || undefined,
    };
  }, [title, cat, date, allDay, startH, startM, dur, loc, notes, rrule, initial]);

  const expanded = useMemo(() => {
    const s = addDays(startOfMonth(date), -14);
    const e = addDays(endOfMonth(date), 14);
    return expandEvents(
      allEvents.filter((ev) => ev.id !== (initial.id || '__never__') && ev.__seriesId !== (initial.id || '__never__')),
      s,
      e,
    );
  }, [allEvents, date, initial.id]);

  const draftConflicts = useMemo(() => conflictsForEvent(draft, expanded), [draft, expanded]);

  const save = () => {
    const start = new Date(date);
    if (allDay) start.setHours(0, 0, 0, 0);
    else start.setHours(startH, startM, 0, 0);
    const out: CalendarEvent = {
      ...(initial as CalendarEvent),
      id: initial.id || 'e' + Date.now(),
      title: title || 'Untitled event',
      cat,
      loc: loc || '—',
      notes,
      start,
      allDay,
      dur: allDay ? 0 : dur,
      end: allDay ? addDays(start, 1) : undefined,
      rrule: rrule || undefined,
    };
    onSave(out);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>{isNew ? 'New event' : 'Edit event'}</h3>
          <button className="iconbtn" onClick={onCancel} aria-label="Close">
            <Icon name="close" size={12} />
          </button>
        </header>

        <div className="modal-body">
          <input className="modal-title-input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />

          <div className="modal-row">
            <label className="modal-label">Category</label>
            <div className="cat-chips">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  className={'cat-chip' + (cat === c.id ? ' is-active' : '')}
                  onClick={() => setCat(c.id)}
                  style={cat === c.id ? { background: c.soft, color: c.ink, borderColor: c.dot } : {}}
                >
                  <span className="catdot" style={{ width: 7, height: 7, background: c.dot }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-row modal-row-split">
            <div className="modal-row">
              <label className="modal-label">Date</label>
              <input
                type="date"
                className="modal-input mono"
                value={isoDate(date)}
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split('-').map(Number);
                  setDate(new Date(y, m - 1, d));
                }}
              />
            </div>
            <div className="modal-row">
              <label className="modal-label">All-day</label>
              <button className={'toggle' + (allDay ? ' is-on' : '')} onClick={() => setAllDay((a) => !a)}>
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
                <span>{allDay ? 'Yes' : 'No'}</span>
              </button>
            </div>
          </div>

          {!allDay && (
            <div className="modal-row modal-row-split">
              <div className="modal-row">
                <label className="modal-label">Starts</label>
                <div className="time-pick mono">
                  <select value={startH} onChange={(e) => setStartH(+e.target.value)}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <span>:</span>
                  <select value={startM} onChange={(e) => setStartM(+e.target.value)}>
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-row">
                <label className="modal-label">Duration</label>
                <select className="modal-input mono" value={dur} onChange={(e) => setDur(+e.target.value)}>
                  {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
                    <option key={m} value={m}>
                      {m < 60 ? m + 'm' : m / 60 + 'h'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!allDay && (
            <div className="modal-row">
              <div className="modal-label-row">
                <label className="modal-label">Smart helpers</label>
                <div className="finder-tabs">
                  <button className={'link-btn' + (tab === 'suggest' ? ' is-on' : '')} onClick={() => setTab(tab === 'suggest' ? 'none' : 'suggest')}>
                    <Icon name="spark" size={11} />
                    Suggest dates
                  </button>
                  <button className={'link-btn' + (tab === 'finder' ? ' is-on' : '')} onClick={() => setTab(tab === 'finder' ? 'none' : 'finder')}>
                    <Icon name="clock" size={11} />
                    Find free slot
                  </button>
                </div>
              </div>
              {tab === 'suggest' && (
                <SuggestDates
                  date={date}
                  dur={dur}
                  allEvents={allEvents}
                  onPick={(d) => {
                    setDate(d);
                    setTab('finder');
                  }}
                />
              )}
              {tab === 'finder' && (
                <FindFreeSlot
                  date={date}
                  dur={dur}
                  allEvents={allEvents}
                  currentH={startH}
                  currentM={startM}
                  onPick={(h, m) => {
                    setStartH(h);
                    setStartM(m);
                    setTab('none');
                  }}
                />
              )}
            </div>
          )}

          {!allDay && <RecurrenceBlock rrule={rrule} setRrule={setRrule} date={date} />}

          {draftConflicts.length > 0 && (
            <div className="conflict-banner is-inline">
              <Icon name="warn" size={13} />
              <div className="conflict-banner-body">
                <div className="conflict-banner-head mono">
                  HEADS UP · This {allDay ? 'day' : 'slot'} already has {draftConflicts.length} event{draftConflicts.length > 1 ? 's' : ''}
                </div>
                <ul>
                  {draftConflicts.slice(0, 4).map((c) => {
                    const cc = CAT_BY_ID[c.cat];
                    return (
                      <li key={c.id}>
                        <span className="catdot" style={{ width: 6, height: 6, background: cc.dot }} />
                        <span className="conflict-time mono">
                          {fmtTime(c.start)}–{fmtTime(eventEnd(c))}
                        </span>
                        <span className="conflict-title">{c.title}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          <div className="modal-row">
            <label className="modal-label">Location</label>
            <input className="modal-input" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Galileo Room, Zoom, …" />
          </div>

          <div className="modal-row">
            <label className="modal-label">Notes</label>
            <textarea className="modal-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Agenda, links, prep…" />
          </div>
        </div>

        <footer className="modal-foot">
          {!isNew && (
            <button className="btn btn-ghost btn-danger" onClick={() => onDelete(initial as CalendarEvent)}>
              <Icon name="trash" size={12} />
              <span>Delete</span>
            </button>
          )}
          <span style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={onCancel}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={save}>
            {isNew ? 'Create event' : 'Save'}
          </Btn>
        </footer>
      </div>
    </div>
  );
};
