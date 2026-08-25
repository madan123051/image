import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { CalendarDefinition, CalendarEvent, Language } from '../types/domain';
import type { CopyKey } from '../i18n';
import { eventConflicts, localDateTime, toDateInputValue, toTimeInputValue } from '../utils/date';
import { Modal } from './Modal';

interface EventDialogProps {
  open: boolean;
  event: CalendarEvent | null;
  defaultDate: string;
  userId: string;
  timezone: string;
  calendars: CalendarDefinition[];
  events: CalendarEvent[];
  language: Language;
  labels: Record<CopyKey, string>;
  onClose(): void;
  onSave(event: CalendarEvent): void;
  onDelete(eventId: string): void;
}

interface EventDraft {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  calendarId: string;
  reminderMinutes: number;
  recurrenceRule: string;
  notes: string;
  url: string;
  participantEmails: string;
  isImportant: boolean;
  countdown: boolean;
}

function newDraft(defaultDate: string, calendarId: string): EventDraft {
  return {
    title: '',
    description: '',
    date: defaultDate,
    startTime: '09:00',
    endTime: '10:00',
    allDay: false,
    location: '',
    calendarId,
    reminderMinutes: 15,
    recurrenceRule: '',
    notes: '',
    url: '',
    participantEmails: '',
    isImportant: false,
    countdown: false,
  };
}

function eventToDraft(event: CalendarEvent): EventDraft {
  return {
    title: event.title,
    description: event.description,
    date: toDateInputValue(event.startDateTime),
    startTime: toTimeInputValue(event.startDateTime),
    endTime: toTimeInputValue(event.endDateTime),
    allDay: event.allDay,
    location: event.location,
    calendarId: event.calendarId,
    reminderMinutes: event.reminders[0]?.minutesBefore ?? 15,
    recurrenceRule: event.recurrenceRule ?? '',
    notes: event.notes,
    url: event.url,
    participantEmails: event.participants.map((participant) => participant.email).join(', '),
    isImportant: event.isImportant,
    countdown: event.countdown,
  };
}

export function EventDialog({
  open,
  event,
  defaultDate,
  userId,
  timezone,
  calendars,
  events,
  labels,
  onClose,
  onSave,
  onDelete,
}: EventDialogProps) {
  const [draft, setDraft] = useState<EventDraft>(() => newDraft(defaultDate, calendars[0]?.id ?? ''));
  const [error, setError] = useState('');
  const [showConflict, setShowConflict] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(event ? eventToDraft(event) : newDraft(defaultDate, calendars[0]?.id ?? ''));
    setError('');
    setShowConflict(false);
  }, [open, event, defaultDate, calendars]);

  const candidate = useMemo<CalendarEvent>(() => {
    const stamp = new Date().toISOString();
    const start = draft.allDay ? localDateTime(draft.date, '00:00') : localDateTime(draft.date, draft.startTime);
    const end = draft.allDay ? new Date(new Date(start).getTime() + 86_400_000).toISOString() : localDateTime(draft.date, draft.endTime);
    const selectedCalendar = calendars.find((calendar) => calendar.id === draft.calendarId) ?? calendars[0];
    return {
      id: event?.id ?? `evt_${Date.now()}`,
      userId,
      calendarId: draft.calendarId,
      title: draft.title.trim(),
      description: draft.description.trim(),
      startDateTime: start,
      endDateTime: end,
      timezone,
      allDay: draft.allDay,
      location: draft.location.trim(),
      color: selectedCalendar?.color ?? '#e39a27',
      status: event?.status ?? 'confirmed',
      recurrenceRule: draft.recurrenceRule || null,
      reminders: draft.reminderMinutes >= 0 ? [{ id: event?.reminders[0]?.id ?? `event_reminder_${Date.now()}`, minutesBefore: draft.reminderMinutes, channels: ['in-app'] }] : [],
      participants: draft.participantEmails.split(',').map((email) => email.trim()).filter(Boolean).map((email, index) => ({ id: `participant_${index}_${Date.now()}`, name: email.split('@')[0], email, response: 'pending' as const })),
      attachments: event?.attachments ?? [],
      notes: draft.notes.trim(),
      url: draft.url.trim(),
      isImportant: draft.isImportant,
      countdown: draft.countdown,
      createdAt: event?.createdAt ?? stamp,
      updatedAt: stamp,
    };
  }, [draft, event, userId, timezone, calendars]);

  const conflicts = useMemo(() => eventConflicts(candidate, events, event?.id), [candidate, events, event]);

  const save = (force = false) => {
    if (!candidate.title) {
      setError('Please add a title.');
      return;
    }
    if (new Date(candidate.endDateTime) <= new Date(candidate.startDateTime)) {
      setError('End time must be after start time.');
      return;
    }
    if (!force && conflicts.length) {
      setShowConflict(true);
      return;
    }
    onSave(candidate);
    onClose();
  };

  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    save(false);
  };

  const duplicate = () => {
    const duplicated = { ...candidate, id: `evt_${Date.now()}`, title: `${candidate.title} copy`, createdAt: new Date().toISOString() };
    onSave(duplicated);
    onClose();
  };

  return (
    <Modal open={open} title={event ? 'Edit event' : labels.newEvent} onClose={onClose} className="event-dialog">
      <form className="modal-form" onSubmit={submit}>
        <label className="field full-field">
          <span>{labels.title}</span>
          <input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="What is happening?" />
        </label>
        <label className="field full-field">
          <span>{labels.description}</span>
          <textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Add useful context" />
        </label>
        <label className="field">
          <span>Date</span>
          <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} required />
        </label>
        <label className="toggle-field">
          <input type="checkbox" checked={draft.allDay} onChange={(e) => setDraft({ ...draft, allDay: e.target.checked })} />
          <span>{labels.allDay}</span>
        </label>
        {!draft.allDay && <>
          <label className="field"><span>{labels.start}</span><input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} /></label>
          <label className="field"><span>{labels.end}</span><input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} /></label>
        </>}
        <label className="field">
          <span>{labels.calendarLabel}</span>
          <select value={draft.calendarId} onChange={(e) => setDraft({ ...draft, calendarId: e.target.value })}>
            {calendars.map((calendar) => <option value={calendar.id} key={calendar.id}>{calendar.name}</option>)}
          </select>
        </label>
        <label className="field"><span>{labels.location}</span><input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Add location" /></label>
        <label className="field">
          <span>{labels.reminder}</span>
          <select value={draft.reminderMinutes} onChange={(e) => setDraft({ ...draft, reminderMinutes: Number(e.target.value) })}>
            <option value={0}>At time</option><option value={10}>10 minutes before</option><option value={30}>30 minutes before</option><option value={60}>1 hour before</option><option value={1440}>1 day before</option><option value={10080}>1 week before</option>
          </select>
        </label>
        <label className="field">
          <span>Recurrence</span>
          <select value={draft.recurrenceRule} onChange={(e) => setDraft({ ...draft, recurrenceRule: e.target.value })}>
            <option value="">Does not repeat</option><option value="FREQ=DAILY">Daily</option><option value="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">Weekdays</option><option value="FREQ=WEEKLY">Weekly</option><option value="FREQ=MONTHLY">Monthly</option><option value="FREQ=YEARLY">Yearly</option>
          </select>
        </label>
        <label className="field full-field"><span>Participants</span><input value={draft.participantEmails} onChange={(e) => setDraft({ ...draft, participantEmails: e.target.value })} placeholder="name@example.com, …" /></label>
        <label className="field"><span>URL</span><input type="url" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://" /></label>
        <label className="field"><span>Notes / attachment reference</span><input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></label>
        <div className="form-options full-field">
          <label className="toggle-field"><input type="checkbox" checked={draft.isImportant} onChange={(e) => setDraft({ ...draft, isImportant: e.target.checked })} /><span>{labels.important}</span></label>
          <label className="toggle-field"><input type="checkbox" checked={draft.countdown} onChange={(e) => setDraft({ ...draft, countdown: e.target.checked })} /><span>Show countdown</span></label>
        </div>
        {error && <p className="form-error full-field" role="alert">{error}</p>}
        {showConflict && <div className="conflict-alert full-field" role="alert">
          <span>!</span><div><strong>{labels.conflict}</strong><p>Overlaps with {conflicts.map((item) => item.title).join(', ')}.</p></div>
          <button type="button" className="text-button" onClick={() => setShowConflict(false)}>{labels.changeTime}</button>
          <button type="button" className="danger-ghost" onClick={() => save(true)}>{labels.saveAnyway}</button>
        </div>}
        <footer className="modal-actions full-field">
          {event && <>
            <button className="danger-button" type="button" onClick={() => { onDelete(event.id); onClose(); }}>{labels.delete}</button>
            <button className="secondary-button" type="button" onClick={duplicate}>{labels.duplicate}</button>
            <button className="secondary-button" type="button" onClick={() => { onSave({ ...candidate, status: 'completed' }); onClose(); }}>{labels.markComplete}</button>
          </>}
          <span className="action-spacer" />
          <button className="secondary-button" type="button" onClick={onClose}>{labels.cancel}</button>
          <button className="primary-button" type="submit">{labels.save}</button>
        </footer>
      </form>
    </Modal>
  );
}
