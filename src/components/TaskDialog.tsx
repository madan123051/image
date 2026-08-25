import { useEffect, useState, type FormEvent } from 'react';
import type { PlannerTask, TaskPriority, TaskStatus } from '../types/domain';
import type { CopyKey } from '../i18n';
import { Modal } from './Modal';

interface TaskDialogProps {
  open: boolean;
  task: PlannerTask | null;
  userId: string;
  labels: Record<CopyKey, string>;
  onClose(): void;
  onSave(task: PlannerTask): void;
}

export function TaskDialog({ open, task, userId, labels, onClose, onSave }: TaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('18:00');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('inbox');
  const [category, setCategory] = useState('Personal');
  const [duration, setDuration] = useState(45);
  const [recurrence, setRecurrence] = useState('');
  const [subtasks, setSubtasks] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setDueDate(task?.dueDate ?? '');
    setDueTime(task?.dueTime ?? '18:00');
    setPriority(task?.priority ?? 'medium');
    setStatus(task?.status ?? 'inbox');
    setCategory(task?.category ?? 'Personal');
    setDuration(task?.estimatedMinutes ?? 45);
    setRecurrence(task?.recurrenceRule ?? '');
    setSubtasks(task?.subtasks.map((item) => item.title).join('\n') ?? '');
    setError('');
  }, [open, task]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Please add a task title.');
      return;
    }
    const stamp = new Date().toISOString();
    onSave({
      id: task?.id ?? `task_${Date.now()}`,
      userId,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: dueDate || null,
      dueTime: dueDate ? dueTime : null,
      scheduledStart: task?.scheduledStart ?? null,
      scheduledEnd: task?.scheduledEnd ?? null,
      estimatedMinutes: duration,
      category: category.trim() || 'Personal',
      subtasks: subtasks.split('\n').map((item) => item.trim()).filter(Boolean).map((item, index) => ({ id: task?.subtasks[index]?.id ?? `subtask_${Date.now()}_${index}`, title: item, completed: task?.subtasks[index]?.completed ?? false })),
      recurrenceRule: recurrence || null,
      reminderMinutes: 30,
      completedAt: status === 'completed' ? task?.completedAt ?? stamp : null,
      createdAt: task?.createdAt ?? stamp,
      updatedAt: stamp,
    });
    onClose();
  };

  return (
    <Modal open={open} title={task ? 'Edit task' : labels.newTask} onClose={onClose} className="task-dialog">
      <form className="modal-form" onSubmit={submit}>
        <label className="field full-field"><span>{labels.title}</span><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to get done?" /></label>
        <label className="field full-field"><span>{labels.description}</span><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <label className="field"><span>Due date</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
        <label className="field"><span>Due time</span><input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} disabled={!dueDate} /></label>
        <label className="field"><span>Priority</span><select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
        <label className="field"><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}><option value="inbox">Inbox</option><option value="planned">Planned</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></label>
        <label className="field"><span>Category</span><input value={category} onChange={(e) => setCategory(e.target.value)} /></label>
        <label className="field"><span>Estimated duration</span><select value={duration} onChange={(e) => setDuration(Number(e.target.value))}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>1 hour</option><option value={90}>1.5 hours</option><option value={120}>2 hours</option><option value={240}>4 hours</option></select></label>
        <label className="field"><span>Recurrence</span><select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}><option value="">Does not repeat</option><option value="FREQ=DAILY">Daily</option><option value="FREQ=WEEKLY">Weekly</option><option value="FREQ=MONTHLY">Monthly</option></select></label>
        <label className="field full-field"><span>Subtasks (one per line)</span><textarea rows={3} value={subtasks} onChange={(e) => setSubtasks(e.target.value)} /></label>
        {error && <p className="form-error full-field">{error}</p>}
        <footer className="modal-actions full-field"><span className="action-spacer" /><button className="secondary-button" type="button" onClick={onClose}>{labels.cancel}</button><button className="primary-button" type="submit">{labels.save}</button></footer>
      </form>
    </Modal>
  );
}
