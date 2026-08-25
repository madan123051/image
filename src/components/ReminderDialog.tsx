import { useEffect, useState, type FormEvent } from 'react';
import type { Reminder, ReminderChannel } from '../types/domain';
import { addMinutes } from '../utils/date';
import { zonedDateTime } from '../services/calendarService';
import { Modal } from './Modal';

interface ReminderDialogProps {
  open: boolean;
  reminder: Reminder | null;
  userId: string;
  timezone: string;
  onClose(): void;
  onSave(reminder: Reminder): void;
  onDelete(reminderId: string): void;
}

function toLocalInput(value: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}`;
}

export function ReminderDialog({ open, reminder, userId, timezone, onClose, onSave, onDelete }: ReminderDialogProps) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<Reminder['kind']>('custom');
  const [remindAt, setRemindAt] = useState(() => toLocalInput(addMinutes(new Date(), 60).toISOString(), timezone));
  const [important, setImportant] = useState(false);
  const [browserAlert, setBrowserAlert] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(reminder?.title ?? '');
    setKind(reminder?.kind ?? 'custom');
    setRemindAt(toLocalInput(reminder?.remindAt ?? addMinutes(new Date(), 60).toISOString(), timezone));
    setImportant(reminder?.important ?? false);
    setBrowserAlert(reminder?.channels.includes('push') ?? false);
    setRecurrenceRule(reminder?.recurrenceRule ?? '');
    setNotes(reminder?.notes ?? '');
    setError('');
  }, [open, reminder, timezone]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Please add a reminder title.');
      return;
    }
    const stamp = new Date().toISOString();
    const channels: ReminderChannel[] = browserAlert ? ['in-app', 'push'] : ['in-app'];
    onSave({
      id: reminder?.id ?? `reminder_${Date.now()}`,
      userId,
      title: title.trim(),
      kind,
      remindAt: zonedDateTime(remindAt.slice(0, 10), remindAt.slice(11), timezone).toISOString(),
      important,
      completed: reminder?.completed ?? false,
      channels,
      notes: notes.trim(),
      recurrenceRule: recurrenceRule || null,
      snoozedUntil: null,
      createdAt: reminder?.createdAt ?? stamp,
      updatedAt: stamp,
    });
    onClose();
  };

  return <Modal open={open} title={reminder ? 'Edit reminder' : 'New reminder'} onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <label className="field full-field"><span>Title</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What should Wildsaura remember?" /></label>
      <label className="field"><span>Type</span><select value={kind} onChange={(event) => setKind(event.target.value as Reminder['kind'])}><option value="custom">Custom</option><option value="bill">Bill</option><option value="birthday">Birthday</option><option value="medication">Medication</option><option value="appointment">Appointment</option><option value="renewal">Renewal</option></select></label>
      <label className="field"><span>Remind at</span><input type="datetime-local" value={remindAt} onChange={(event) => setRemindAt(event.target.value)} required /></label>
      <label className="field"><span>Repeat</span><select value={recurrenceRule} onChange={(event) => setRecurrenceRule(event.target.value)}><option value="">Does not repeat</option><option value="FREQ=DAILY">Daily</option><option value="FREQ=WEEKLY">Weekly</option><option value="FREQ=MONTHLY">Monthly</option><option value="FREQ=YEARLY">Yearly</option></select></label>
      <div className="form-options"><label className="toggle-field"><input type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)} /><span>Important</span></label><label className="toggle-field"><input type="checkbox" checked={browserAlert} onChange={(event) => setBrowserAlert(event.target.checked)} /><span>Browser alert</span></label></div>
      <label className="field full-field"><span>Notes</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {error && <p className="form-error full-field" role="alert">{error}</p>}
      <footer className="modal-actions full-field">
        {reminder && <button className="danger-button" type="button" onClick={() => { onDelete(reminder.id); onClose(); }}>Delete</button>}
        <span className="action-spacer" />
        <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
        <button className="primary-button" type="submit">Save reminder</button>
      </footer>
    </form>
  </Modal>;
}
