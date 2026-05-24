import { describe, expect, it } from 'vitest';
import { matchCategory, parseDelimited, parseICS } from './import';

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
UID:1@test
SUMMARY:Timed meeting
DTSTART:20260603T140000
DTEND:20260603T150000
LOCATION:Galileo Room
DESCRIPTION:Quarterly sync
CATEGORIES:meeting
END:VEVENT
BEGIN:VEVENT
UID:2@test
SUMMARY:Company holiday
DTSTART;VALUE=DATE:20260704
DTEND;VALUE=DATE:20260705
CATEGORIES:holiday
END:VEVENT
BEGIN:VEVENT
UID:3@test
SUMMARY:Standup
DTSTART:20260601T093000
DTEND:20260601T094500
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10
END:VEVENT
END:VCALENDAR`;

describe('parseICS', () => {
  const c = parseICS(ICS);

  it('parses all VEVENTs', () => {
    expect(c).toHaveLength(3);
    expect(c.every((x) => x.errors.length === 0 && x.include)).toBe(true);
  });

  it('maps a timed event with duration and fields', () => {
    const ev = c[0].event;
    expect(ev.title).toBe('Timed meeting');
    expect(ev.allDay).toBe(false);
    expect(ev.dur).toBe(60);
    expect(ev.loc).toBe('Galileo Room');
    expect(ev.notes).toBe('Quarterly sync');
    expect(ev.cat).toBe('meeting');
    expect(ev.start.getHours()).toBe(14);
  });

  it('maps an all-day event', () => {
    const ev = c[1].event;
    expect(ev.allDay).toBe(true);
    expect(ev.cat).toBe('holiday');
    expect(ev.end).toBeInstanceOf(Date);
  });

  it('maps a weekly RRULE', () => {
    const ev = c[2].event;
    expect(ev.rrule).toBeDefined();
    expect(ev.rrule?.freq).toBe('weekly');
    expect(ev.rrule?.byday).toEqual(['MO', 'WE', 'FR']);
    expect(ev.rrule?.count).toBe(10);
  });

  it('maps a YEARLY RRULE', () => {
    const yearly = parseICS(
      `BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:y\nSUMMARY:Anniversary\nDTSTART;VALUE=DATE:20260101\nRRULE:FREQ=YEARLY\nEND:VEVENT\nEND:VCALENDAR`,
    );
    expect(yearly[0].event.rrule?.freq).toBe('yearly');
    expect(yearly[0].warnings).toHaveLength(0);
  });

  it('maps a MONTHLY+BYDAY RRULE (first Sunday)', () => {
    const monthly = parseICS(
      `BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:m\nSUMMARY:First Sunday\nDTSTART;VALUE=DATE:20260301\nRRULE:FREQ=MONTHLY;BYDAY=1SU\nEND:VEVENT\nEND:VCALENDAR`,
    );
    expect(monthly[0].event.rrule?.freq).toBe('monthly');
    expect(monthly[0].event.rrule?.byday).toEqual(['1SU']);
  });

  it('throws on malformed input', () => {
    expect(() => parseICS('not a calendar')).toThrow();
  });
});

describe('parseDelimited', () => {
  it('parses a TSV block with a header row', () => {
    const tsv = ['Title\tDate\tStart\tEnd\tCategory\tLocation', 'Kickoff\t2026-06-03\t2:00 PM\t90\tworkshop\tZoom'].join('\n');
    const c = parseDelimited(tsv);
    expect(c).toHaveLength(1);
    const ev = c[0].event;
    expect(ev.title).toBe('Kickoff');
    expect(ev.allDay).toBe(false);
    expect(ev.start.getHours()).toBe(14);
    expect(ev.dur).toBe(90);
    expect(ev.cat).toBe('workshop');
    expect(ev.loc).toBe('Zoom');
  });

  it('parses comma-separated rows without a header (fixed order)', () => {
    const csv = 'Lunch,6/4/2026,12:00,1h,social';
    const c = parseDelimited(csv);
    expect(c[0].event.title).toBe('Lunch');
    expect(c[0].event.dur).toBe(60);
    expect(c[0].event.cat).toBe('social');
  });

  it('treats a row with only a date as all-day', () => {
    const c = parseDelimited('Title,Date\nOff-site,2026-07-01');
    expect(c[0].event.allDay).toBe(true);
    expect(c[0].errors).toHaveLength(0);
  });

  it('flags a row with a bad date as an error and excludes it', () => {
    const c = parseDelimited('Title,Date\nMystery,not-a-date');
    expect(c[0].errors.length).toBeGreaterThan(0);
    expect(c[0].include).toBe(false);
  });

  it('flags a missing title', () => {
    const c = parseDelimited('Title,Date\n,2026-06-03');
    expect(c[0].errors.length).toBeGreaterThan(0);
  });

  it('respects quoted commas inside fields', () => {
    const csv = 'Title,Date,Start,End,Category,Location\n"Meeting, with boss",2026-06-03,2:00 PM,60,meeting,"Galileo, room 2"';
    const c = parseDelimited(csv);
    expect(c).toHaveLength(1);
    expect(c[0].errors).toHaveLength(0);
    expect(c[0].event.title).toBe('Meeting, with boss');
    expect(c[0].event.loc).toBe('Galileo, room 2');
  });

  it('unescapes "" inside a quoted field', () => {
    const csv = 'Title,Date\n"She said ""hi""",2026-06-03';
    const c = parseDelimited(csv);
    expect(c[0].event.title).toBe('She said "hi"');
  });
});

describe('matchCategory', () => {
  it('matches by id and label, case-insensitively', () => {
    expect(matchCategory('Workshop')).toBe('workshop');
    expect(matchCategory('deadline')).toBe('deadline');
    expect(matchCategory('Social')).toBe('social');
  });
  it('defaults unknown values to meeting', () => {
    expect(matchCategory('blah')).toBe('meeting');
    expect(matchCategory(undefined)).toBe('meeting');
  });
});
