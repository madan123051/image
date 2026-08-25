import { useMemo, useState } from 'react';
import type { CalendarDefinition, CalendarEvent, PlannerTask, QuickAddPreview, Routine, UserPreferences } from '../types/domain';
import type { CopyKey } from '../i18n';
import { LocalRulesAIProvider, quickAddPreviewToDates } from '../services/aiService';
import { Modal } from './Modal';

interface QuickAddDialogProps {
  open: boolean;
  userId: string;
  labels: Record<CopyKey, string>;
  events: CalendarEvent[];
  tasks: PlannerTask[];
  routines: Routine[];
  preferences: UserPreferences;
  calendars: CalendarDefinition[];
  onClose(): void;
  onOpenEvent(): void;
  onOpenTask(): void;
  onOpenReminders(): void;
  onOpenRoutines(): void;
  onSaveEvent(event: CalendarEvent): void;
}

export function QuickAddDialog({
  open,
  userId,
  labels,
  events,
  tasks,
  routines,
  preferences,
  calendars,
  onClose,
  onOpenEvent,
  onOpenTask,
  onOpenReminders,
  onOpenRoutines,
  onSaveEvent,
}: QuickAddDialogProps) {
  const provider = useMemo(() => new LocalRulesAIProvider(), []);
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<QuickAddPreview | null>(null);
  const [loading, setLoading] = useState(false);

  const parse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      setPreview(await provider.parseQuickAdd(input, { events, tasks, routines, preferences }));
    } finally {
      setLoading(false);
    }
  };

  const savePreview = () => {
    if (!preview) return;
    const dates = quickAddPreviewToDates(preview);
    const calendar = calendars[0];
    const stamp = new Date().toISOString();
    onSaveEvent({
      id: `evt_${Date.now()}`,
      userId,
      calendarId: calendar?.id ?? 'cal_personal',
      title: preview.title,
      description: '',
      startDateTime: dates.start,
      endDateTime: dates.end,
      timezone: preferences.timezone,
      allDay: false,
      location: '',
      color: calendar?.color ?? '#e39a27',
      status: 'confirmed',
      recurrenceRule: null,
      reminders: preview.reminderMinutes === undefined ? [] : [{ id: `reminder_${Date.now()}`, minutesBefore: preview.reminderMinutes, channels: ['in-app'] }],
      participants: [],
      attachments: [],
      notes: `Created from: ${preview.sourceText}`,
      url: '',
      isImportant: false,
      countdown: false,
      createdAt: stamp,
      updatedAt: stamp,
    });
    setInput('');
    setPreview(null);
    onClose();
  };

  const choose = (action: () => void) => { onClose(); action(); };

  return <Modal open={open} title={labels.quickAdd} onClose={onClose} className="quick-add-dialog">
    <div className="quick-types">
      <button type="button" onClick={() => choose(onOpenEvent)}><span>▦</span><strong>{labels.newEvent}</strong><small>Time, place & people</small></button>
      <button type="button" onClick={() => choose(onOpenTask)}><span>✓</span><strong>{labels.newTask}</strong><small>Priority & deadline</small></button>
      <button type="button" onClick={() => choose(onOpenReminders)}><span>◷</span><strong>{labels.newReminder}</strong><small>Bills & important dates</small></button>
      <button type="button" onClick={() => choose(onOpenRoutines)}><span>↻</span><strong>{labels.newRoutine}</strong><small>Flexible or fixed</small></button>
    </div>
    <div className="natural-add">
      <div className="natural-heading"><span>✦</span><div><strong>Describe it naturally</strong><small>Local parser now · any AI provider later</small></div></div>
      <div className="natural-input"><textarea rows={3} value={input} onChange={(event) => { setInput(event.target.value); setPreview(null); }} placeholder={labels.naturalPlaceholder} /><button className="primary-button" type="button" onClick={parse} disabled={loading || !input.trim()}>{loading ? 'Parsing…' : labels.preview}</button></div>
      {preview && <div className="parse-preview">
        <header><span>✓</span><div><strong>Review before saving</strong><small>{Math.round(preview.confidence * 100)}% local parse confidence</small></div></header>
        <dl><div><dt>Title</dt><dd>{preview.title}</dd></div><div><dt>Date</dt><dd>{preview.date}</dd></div><div><dt>Time</dt><dd>{preview.startTime} – {preview.endTime}</dd></div><div><dt>Reminder</dt><dd>{preview.reminderMinutes ? `${preview.reminderMinutes} minutes before` : 'None'}</dd></div></dl>
        <footer><button className="secondary-button" type="button" onClick={() => setPreview(null)}>Edit text</button><button className="primary-button" type="button" onClick={savePreview}>{labels.confirmSave}</button></footer>
      </div>}
    </div>
  </Modal>;
}
