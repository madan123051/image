import { useEffect, useState, type FormEvent } from 'react';
import type { Routine, RoutineFlexibility } from '../types/domain';
import { Modal } from './Modal';

interface RoutineDialogProps {
  open: boolean;
  routine: Routine | null;
  userId: string;
  onClose(): void;
  onSave(routine: Routine): void;
  onDelete(routineId: string): void;
}

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RoutineDialog({ open, routine, userId, onClose, onSave, onDelete }: RoutineDialogProps) {
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('07:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [flexibility, setFlexibility] = useState<RoutineFlexibility>('flexible');
  const [color, setColor] = useState('#8c6ab1');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(routine?.title ?? '');
    setDays(routine?.days ?? [1, 2, 3, 4, 5]);
    setStartTime(routine?.startTime ?? '07:00');
    setDurationMinutes(routine?.durationMinutes ?? 30);
    setReminderMinutes(routine?.reminderMinutes ?? 10);
    setFlexibility(routine?.flexibility ?? 'flexible');
    setColor(routine?.color ?? '#8c6ab1');
    setError('');
  }, [open, routine]);

  const toggleDay = (day: number) => {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort());
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !days.length) {
      setError('Add a title and select at least one day.');
      return;
    }
    const stamp = new Date().toISOString();
    onSave({
      id: routine?.id ?? `routine_${Date.now()}`,
      userId,
      title: title.trim(),
      days,
      startTime,
      durationMinutes,
      reminderMinutes,
      flexibility,
      color,
      active: routine?.active ?? true,
      createdAt: routine?.createdAt ?? stamp,
      updatedAt: stamp,
    });
    onClose();
  };

  return <Modal open={open} title={routine ? 'Edit routine' : 'New routine'} onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <label className="field full-field"><span>Routine</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Reading, meditation, workout…" /></label>
      <div className="field full-field"><span>Days</span><div className="day-picker">{dayLabels.map((label, day) => <button className={days.includes(day) ? 'active' : ''} type="button" key={label} onClick={() => toggleDay(day)}>{label}</button>)}</div></div>
      <label className="field"><span>Start time</span><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
      <label className="field"><span>Duration</span><select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>1 hour</option><option value={90}>1.5 hours</option><option value={480}>8 hours</option></select></label>
      <label className="field"><span>Reminder</span><select value={reminderMinutes} onChange={(event) => setReminderMinutes(Number(event.target.value))}><option value={0}>At start</option><option value={10}>10 minutes before</option><option value={30}>30 minutes before</option><option value={60}>1 hour before</option></select></label>
      <label className="field"><span>Scheduling</span><select value={flexibility} onChange={(event) => setFlexibility(event.target.value as RoutineFlexibility)}><option value="flexible">Flexible</option><option value="fixed">Fixed · protect this time</option></select></label>
      <label className="field"><span>Color</span><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
      {error && <p className="form-error full-field" role="alert">{error}</p>}
      <footer className="modal-actions full-field">
        {routine && <button className="danger-button" type="button" onClick={() => { onDelete(routine.id); onClose(); }}>Delete</button>}
        <span className="action-spacer" />
        <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
        <button className="primary-button" type="submit">Save routine</button>
      </footer>
    </form>
  </Modal>;
}
