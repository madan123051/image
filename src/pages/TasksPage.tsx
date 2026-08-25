import { useMemo, useState } from 'react';
import type { CalendarEvent, FreeSlot, PlannerTask, Routine, UserPreferences } from '../types/domain';
import type { CopyKey } from '../i18n';
import { getTaskScheduleSuggestions } from '../services/taskService';
import { formatDuration, taskDueDate, toDateKey } from '../utils/date';
import { Modal } from '../components/Modal';

type TaskFilter = 'today' | 'upcoming' | 'overdue' | 'completed' | 'all';

interface TasksPageProps {
  tasks: PlannerTask[];
  events: CalendarEvent[];
  routines: Routine[];
  preferences: UserPreferences;
  labels: Record<CopyKey, string>;
  onNewTask(): void;
  onEditTask(taskId: string): void;
  onToggleTask(taskId: string): void;
  onSaveTask(task: PlannerTask): void;
}

export function TasksPage({ tasks, events, routines, preferences, labels, onNewTask, onEditTask, onToggleTask, onSaveTask }: TasksPageProps) {
  const [filter, setFilter] = useState<TaskFilter>('today');
  const [scheduleTask, setScheduleTask] = useState<PlannerTask | null>(null);
  const [suggestions, setSuggestions] = useState<FreeSlot[]>([]);
  const today = toDateKey(new Date());
  const filtered = useMemo(() => tasks.filter((task) => {
    const due = taskDueDate(task);
    if (filter === 'today') return task.status !== 'completed' && (task.dueDate === today || (task.scheduledStart && toDateKey(task.scheduledStart) === today));
    if (filter === 'upcoming') return task.status !== 'completed' && Boolean(due && due > new Date() && task.dueDate !== today);
    if (filter === 'overdue') return task.status !== 'completed' && Boolean(due && due < new Date());
    if (filter === 'completed') return task.status === 'completed';
    return true;
  }).sort((a, b) => {
    const score = { urgent: 4, high: 3, medium: 2, low: 1 };
    return score[b.priority] - score[a.priority];
  }), [filter, tasks, today]);

  const openSchedule = (task: PlannerTask) => {
    setScheduleTask(task);
    setSuggestions(getTaskScheduleSuggestions(task, events, preferences, { tasks, routines }));
  };

  const applySlot = (slot: FreeSlot) => {
    if (!scheduleTask) return;
    onSaveTask({ ...scheduleTask, status: 'planned', scheduledStart: slot.startDateTime, scheduledEnd: slot.endDateTime, updatedAt: new Date().toISOString() });
    setScheduleTask(null);
  };

  const stats = {
    active: tasks.filter((task) => task.status !== 'completed').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
    minutes: tasks.filter((task) => task.status !== 'completed').reduce((sum, task) => sum + task.estimatedMinutes, 0),
  };

  return (
    <div className="page tasks-page">
      <header className="page-heading compact-heading">
        <div><p className="eyebrow">Move work forward</p><h1>{labels.tasks}</h1><p>Capture tasks, estimate the effort, then place them into real free time.</p></div>
        <button className="primary-button" type="button" onClick={onNewTask}>＋ {labels.newTask}</button>
      </header>

      <section className="task-summary">
        <div><strong>{stats.active}</strong><span>Open tasks</span></div>
        <div><strong>{formatDuration(stats.minutes)}</strong><span>Estimated effort</span></div>
        <div><strong>{stats.completed}</strong><span>Recently completed</span></div>
      </section>

      <section className="content-panel task-workspace">
        <div className="task-filterbar">
          {(['today', 'upcoming', 'overdue', 'completed', 'all'] as TaskFilter[]).map((item) => (
            <button className={filter === item ? 'active' : ''} type="button" key={item} onClick={() => setFilter(item)}>{item === 'all' ? labels.allTasks : labels[item]}</button>
          ))}
        </div>
        <div className="task-list">
          {filtered.length ? filtered.map((task) => {
            const subtaskProgress = task.subtasks.length ? `${task.subtasks.filter((item) => item.completed).length}/${task.subtasks.length} subtasks` : '';
            return (
              <article className={`task-row priority-${task.priority}`} key={task.id}>
                <button className={`task-check ${task.status === 'completed' ? 'checked' : ''}`} type="button" onClick={() => onToggleTask(task.id)} aria-label={`Mark ${task.title} ${task.status === 'completed' ? 'open' : 'complete'}`}>{task.status === 'completed' ? '✓' : ''}</button>
                <button className="task-main" type="button" onClick={() => onEditTask(task.id)}>
                  <span><strong>{task.title}</strong>{task.description && <small>{task.description}</small>}</span>
                  <span className="task-meta"><b className={`priority-label ${task.priority}`}>{task.priority}</b><small>{task.category}</small><small>{formatDuration(task.estimatedMinutes)}</small>{task.dueDate && <small>Due {new Date(`${task.dueDate}T12:00:00`).toLocaleDateString()}</small>}{subtaskProgress && <small>{subtaskProgress}</small>}</span>
                </button>
                {task.status !== 'completed' && <button className="schedule-button" type="button" onClick={() => openSchedule(task)}>◷ {labels.schedule}</button>}
              </article>
            );
          }) : <div className="empty-state"><span>✓</span><h3>Nothing here</h3><p>Your current filter is clear.</p></div>}
        </div>
      </section>

      <Modal open={Boolean(scheduleTask)} title={`Schedule “${scheduleTask?.title ?? ''}”`} onClose={() => setScheduleTask(null)}>
        <div className="schedule-dialog-body">
          <div className="approval-note"><span>✦</span><p><strong>Free-time suggestions</strong>These slots avoid events, scheduled tasks, fixed routines, and past time. Choose one to confirm.</p></div>
          {suggestions.length ? suggestions.map((slot) => (
            <button className="slot-option" type="button" key={slot.startDateTime} onClick={() => applySlot(slot)}>
              <span><strong>{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(slot.startDateTime))}</strong><small>{new Date(slot.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(slot.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></span><b>Use slot →</b>
            </button>
          )) : <div className="empty-state"><p>No safe slots found in the next seven days.</p></div>}
        </div>
      </Modal>
    </div>
  );
}
