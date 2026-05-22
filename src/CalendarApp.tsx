import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  conflictMap,
  expandEvents,
  startOfDay,
  eventSpanDays,
  type CalendarEvent,
  type CategoryId,
} from './lib/calendar';
import { useAuth, canEdit as roleCanEdit } from './lib/auth';
import { removeEvent, saveEvent, subscribeEvents } from './lib/events';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { SearchResults } from './components/SearchResults';
import { MonthView } from './views/MonthView';
import { WeekView } from './views/WeekView';
import { AgendaView } from './views/AgendaView';
import { TimelineView } from './views/TimelineView';
import { YearView } from './views/YearView';
import { EventDetails } from './components/EventDetails';
import { EventEditor, type EditorInitial } from './components/EventEditor';
import { MorePopover } from './components/MorePopover';
import { HoverPreview } from './components/HoverPreview';
import { TweaksPanel, useTweaks } from './components/TweaksPanel';
import { AccessPanel } from './views/AccessPanel';
import type { HoverPayload, MorePayload, ViewId } from './types';

const ACCENTS: Record<string, { c: string; soft: string; h: number }> = {
  '#4f4cdb': { c: 'oklch(0.5 0.18 265)', soft: 'oklch(0.95 0.04 265)', h: 265 },
  '#2c7a5b': { c: 'oklch(0.45 0.13 155)', soft: 'oklch(0.95 0.04 155)', h: 155 },
  '#b15b2c': { c: 'oklch(0.5 0.16 35)', soft: 'oklch(0.95 0.04 35)', h: 35 },
  '#3d3d3d': { c: 'oklch(0.28 0.01 80)', soft: 'oklch(0.92 0.005 80)', h: 80 },
};
const ACCENT_KEYS = Object.keys(ACCENTS);

export const CalendarApp = () => {
  const { role, signOutUser } = useAuth();
  const canEdit = roleCanEdit(role);
  const canCreate = role === 'member' || canEdit;
  const [t, setTweak] = useTweaks();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [view, setView] = useState<ViewId>(t.defaultView);
  const [pickedEvent, setPickedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<EditorInitial | null>(null);
  const [hoverEvent, setHoverEvent] = useState<HoverPayload | null>(null);
  const [morePayload, setMorePayload] = useState<MorePayload | null>(null);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<CategoryId[]>([]);
  const [accessOpen, setAccessOpen] = useState(false);

  // Realtime subscription to the shared event collection.
  useEffect(() => subscribeEvents(setEvents, (e) => console.error('events subscription error', e)), []);

  const expanded = useMemo(() => {
    const s = new Date(cursor.getFullYear(), 0, 1);
    const e = new Date(cursor.getFullYear() + 1, 0, 1);
    return expandEvents(events, addDays(s, -42), addDays(e, 42));
  }, [events, cursor]);

  const filtered = useMemo(() => expanded.filter((e) => !catFilter.includes(e.cat)), [expanded, catFilter]);

  const conflicts = useMemo(() => (t.showConflicts ? conflictMap(filtered) : new Map<string, number>()), [filtered, t.showConflicts]);

  const monthConflictCount = useMemo(() => {
    const mo = cursor.getMonth(),
      yr = cursor.getFullYear();
    let n = 0;
    conflicts.forEach((_, id) => {
      const ev = filtered.find((e) => e.id === id);
      if (ev && ev.start.getMonth() === mo && ev.start.getFullYear() === yr) n++;
    });
    return n;
  }, [conflicts, filtered, cursor]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const moveEvent = (id: string, day: Date) => {
    if (!canEdit) return;
    const seriesId = id.includes('#') ? id.split('#')[0] : id;
    const e = events.find((x) => x.id === seriesId);
    if (!e || e.rrule) return; // don't move a recurring series via drag
    let next: CalendarEvent;
    if (e.allDay || e.end) {
      const span = eventSpanDays(e);
      const newStart = startOfDay(day);
      next = { ...e, start: newStart, end: addDays(newStart, span) };
    } else {
      const ns = new Date(day);
      ns.setHours(e.start.getHours(), e.start.getMinutes(), 0, 0);
      next = { ...e, start: ns };
    }
    void saveEvent(next);
  };

  const handleSave = (ev: CalendarEvent) => {
    const targetId = ev.id && ev.id.includes('#') ? ev.id.split('#')[0] : ev.id;
    const persisted: CalendarEvent = { ...ev, id: targetId };
    delete persisted.__seriesId;
    delete persisted.__instanceDate;
    void saveEvent(persisted);
    setEditingEvent(null);
    setPickedEvent(null);
  };

  const deleteEvent = (ev: CalendarEvent, opts: { series?: boolean } = {}) => {
    if (!canEdit) return;
    const seriesId = ev.__seriesId || (ev.id.includes('#') ? ev.id.split('#')[0] : ev.id);
    if (opts.series || !ev.__seriesId) {
      void removeEvent(seriesId);
    } else {
      const series = events.find((x) => x.id === seriesId);
      if (series && series.rrule) {
        const exdates = [...(series.rrule.exdates || []), ev.__instanceDate!];
        void saveEvent({ ...series, rrule: { ...series.rrule, exdates } });
      }
    }
    setEditingEvent(null);
    setPickedEvent(null);
  };

  const skipInstance = (ev: CalendarEvent) => deleteEvent(ev);

  const createAt = (date: Date) => {
    if (!canCreate) return;
    setEditingEvent({ start: date, cat: 'meeting', dur: 60, allDay: false });
  };

  const onPickEvent = (ev: CalendarEvent) => setPickedEvent(ev);

  const onEditEvent = (ev: CalendarEvent) => {
    if (!canEdit) return;
    if (ev.__seriesId) {
      const series = events.find((e) => e.id === ev.__seriesId);
      if (series) {
        setEditingEvent(series);
        setPickedEvent(null);
        return;
      }
    }
    setEditingEvent(ev);
    setPickedEvent(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        createAt(cursor);
      }
      if (e.key === 't' || e.key === 'T') setCursor(new Date());
      if (e.key === 'Escape') {
        setPickedEvent(null);
        setEditingEvent(null);
        setMorePayload(null);
        setAccessOpen(false);
      }
      if (e.key === '1') setView('month');
      if (e.key === '2') setView('week');
      if (e.key === '3') setView('agenda');
      if (e.key === '4') setView('year');
      if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const c = new Date(cursor);
        c.setMonth(c.getMonth() - 1);
        setCursor(c);
      }
      if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const c = new Date(cursor);
        c.setMonth(c.getMonth() + 1);
        setCursor(c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, canCreate]);

  const accent = ACCENTS[t.accent] || ACCENTS['#4f4cdb'];
  const themeClass = 'theme-' + (t.theme === 'dark' ? 'dark' : 'light');
  const densityClass = 'density-' + (t.density || 'default');

  const jumpToFirstConflict = () => {
    const mo = cursor.getMonth(),
      yr = cursor.getFullYear();
    for (const [id] of conflicts) {
      const ev = filtered.find((e) => e.id === id);
      if (ev && ev.start.getMonth() === mo && ev.start.getFullYear() === yr) {
        setCursor(new Date(ev.start));
        setView('week');
        setTimeout(() => setPickedEvent(ev), 50);
        return;
      }
    }
  };

  return (
    <div className={'app view-' + view + ' ' + themeClass + ' ' + densityClass} style={{ '--accent': accent.c, '--accent-soft': accent.soft, '--accent-h': accent.h } as React.CSSProperties}>
      <Sidebar
        cursor={cursor}
        setCursor={setCursor}
        rawEvents={events}
        expandedEvents={expanded}
        catFilter={catFilter}
        setCatFilter={setCatFilter}
        accent={accent}
        role={role!}
        canCreate={canCreate}
        onCreate={() => createAt(cursor)}
        onPickEvent={onPickEvent}
        onOpenAccess={() => setAccessOpen(true)}
        onSignOut={signOutUser}
      />

      <main className="main">
        <TopBar
          view={view}
          setView={setView}
          cursor={cursor}
          setCursor={setCursor}
          query={query}
          setQuery={setQuery}
          conflictCount={monthConflictCount}
          onConflictClick={jumpToFirstConflict}
          onToday={() => setCursor(new Date())}
        />

        {query && <SearchResults query={query} events={filtered} onPick={onPickEvent} onClose={() => setQuery('')} />}

        <section className="view">
          {view === 'month' && (
            <MonthView
              cursor={cursor}
              events={filtered}
              conflicts={conflicts}
              onPickEvent={onPickEvent}
              onPickMore={setMorePayload}
              onMoveEvent={moveEvent}
              onCreateAt={createAt}
              density={t.density}
              showWeekends={t.showWeekends}
              canDrag={canEdit}
              setHoverEvent={setHoverEvent}
            />
          )}
          {view === 'week' && (
            <WeekView
              cursor={cursor}
              events={filtered}
              conflicts={conflicts}
              onPickEvent={onPickEvent}
              onMoveEvent={moveEvent}
              onCreateAt={createAt}
              density={t.density}
              showWeekends={t.showWeekends}
              canDrag={canEdit}
              setHoverEvent={setHoverEvent}
            />
          )}
          {view === 'agenda' && <AgendaView cursor={cursor} events={filtered} conflicts={conflicts} onPickEvent={onPickEvent} />}
          {view === 'timeline' && <TimelineView cursor={cursor} events={filtered} conflicts={conflicts} onPickEvent={onPickEvent} setHoverEvent={setHoverEvent} />}
          {view === 'year' && <YearView cursor={cursor} events={filtered} onPickEvent={onPickEvent} onPickMonth={(d) => { setCursor(d); setView('month'); }} />}
        </section>
      </main>

      {pickedEvent && (
        <EventDetails
          ev={pickedEvent}
          allEvents={filtered}
          canEdit={canEdit}
          onClose={() => setPickedEvent(null)}
          onEdit={() => onEditEvent(pickedEvent)}
          onDelete={deleteEvent}
          onSkipInstance={skipInstance}
          onPickEvent={onPickEvent}
        />
      )}

      {editingEvent && canEdit && (
        <EventEditor initial={editingEvent} allEvents={expanded} onSave={handleSave} onCancel={() => setEditingEvent(null)} onDelete={deleteEvent} />
      )}
      {/* Members can create but not edit: only show the editor for brand-new drafts. */}
      {editingEvent && !canEdit && !editingEvent.id && (
        <EventEditor initial={editingEvent} allEvents={expanded} onSave={handleSave} onCancel={() => setEditingEvent(null)} onDelete={deleteEvent} />
      )}

      {morePayload && <MorePopover payload={morePayload} onClose={() => setMorePayload(null)} onPickEvent={onPickEvent} />}

      <HoverPreview hover={hoverEvent} />

      {accessOpen && role === 'owner' && <AccessPanel onClose={() => setAccessOpen(false)} />}

      <TweaksPanel tweaks={t} setTweak={setTweak} accents={ACCENT_KEYS} />
    </div>
  );
};
