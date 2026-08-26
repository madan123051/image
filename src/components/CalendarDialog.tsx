import { useEffect, useState, type FormEvent } from 'react';
import type { CalendarDefinition, CalendarMember } from '../types/domain';
import { Modal } from './Modal';

interface CalendarDialogProps {
  open: boolean;
  calendar: CalendarDefinition | null;
  defaultShared: boolean;
  userId: string;
  eventCount: number;
  onClose(): void;
  onSave(calendar: CalendarDefinition): void;
  onDelete(calendarId: string): void;
}

function createId(prefix: string): string {
  return `${prefix}_${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
}

export function parseCalendarMembers(value: string): CalendarMember[] {
  const seen = new Set<string>();
  return value.split(/\r?\n/).flatMap((line) => {
    const [rawEmail, rawRole] = line.split(',').map((item) => item.trim());
    const email = rawEmail?.toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || seen.has(email)) return [];
    seen.add(email);
    return [{
      id: createId('member'),
      name: email.split('@')[0],
      email,
      role: rawRole === 'editor' ? 'editor' as const : 'viewer' as const,
      status: 'invited' as const,
    }];
  }).slice(0, 5);
}

export function CalendarDialog({ open, calendar, defaultShared, userId, eventCount, onClose, onSave, onDelete }: CalendarDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2d7c65');
  const [shared, setShared] = useState(defaultShared);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(calendar?.name ?? (defaultShared ? 'Shared calendar' : 'New calendar'));
    setColor(calendar?.color ?? (defaultShared ? '#bd6a5c' : '#2d7c65'));
    setShared(calendar ? !calendar.isPrivate : defaultShared);
    setError('');
    setInviteCode(calendar?.inviteCode ?? createId('invite'));
  }, [calendar, defaultShared, open]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      id: calendar?.id ?? createId('calendar'),
      userId,
      name: name.trim(),
      color,
      icon: shared ? '♧' : '●',
      visible: calendar?.visible ?? true,
      isPrivate: !shared,
      role: calendar?.role ?? 'owner',
      members: shared ? calendar?.members ?? [] : [],
      inviteCode: shared ? inviteCode : null,
    });
    onClose();
  };

  const remove = () => {
    if (!calendar) return;
    try {
      onDelete(calendar.id);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Calendar could not be deleted.');
    }
  };

  return <Modal open={open} title={calendar ? 'Manage calendar' : shared ? 'Create shared calendar' : 'Create calendar'} onClose={onClose} className="calendar-modal">
    <form className="modal-form" onSubmit={submit}>
      <label className="field full-field"><span>Calendar name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} minLength={1} maxLength={120} required /></label>
      <label className="field"><span>Color</span><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
      <label className="toggle-field calendar-share-toggle"><input type="checkbox" checked={shared} onChange={(event) => setShared(event.target.checked)} /><span>Share with people</span></label>
      {shared ? <div className="calendar-link-note full-field"><span aria-hidden="true">↗</span><div><strong>Link and QR sharing</strong><small>{calendar ? 'Your invite link and QR code are available on the Shared page.' : 'Save this calendar, then share it instantly by link or QR code.'}</small></div></div> : null}
      {error ? <p className="form-error full-field" role="alert">{error}</p> : null}
      <footer className="modal-actions full-field">{calendar ? <button className="danger-button" type="button" onClick={remove} disabled={eventCount > 0} title={eventCount > 0 ? 'Move or delete its events first' : undefined}>Delete</button> : null}<span className="action-spacer" /><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{calendar ? 'Save changes' : 'Create calendar'}</button></footer>
    </form>
  </Modal>;
}
