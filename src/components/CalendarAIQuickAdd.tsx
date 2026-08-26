import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { AssistantAction, AssistantResponse } from '../services/assistantSchema';
import { requestAayojAssistant } from '../services/assistantService';
import type { AppData, Language } from '../types/domain';
import { toDateKey } from '../utils/date';
import { AssistantActionList } from './AssistantActionList';
import { BrandMark } from './BrandMark';
import { Modal } from './Modal';

interface CalendarAIQuickAddProps {
  open: boolean;
  dateKey: string;
  data: AppData;
  userId: string;
  language: Language;
  onClose(): void;
  onApply(actions: AssistantAction[]): { applied: number; errors: string[] };
}

function belongsToDate(action: AssistantAction, dateKey: string): boolean {
  if (action.operation !== 'create' || !['event', 'task'].includes(action.entity)) return false;
  const candidate = action.entity === 'event'
    ? action.data.startDateTime
    : action.data.scheduledStart ?? action.data.dueDate;
  if (!candidate) return false;
  if (candidate.startsWith(dateKey)) return true;
  const parsed = new Date(candidate);
  return !Number.isNaN(parsed.getTime()) && toDateKey(parsed) === dateKey;
}

export function CalendarAIQuickAdd({ open, dateKey, data, userId, language, onClose, onApply }: CalendarAIQuickAddProps) {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applyMessage, setApplyMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setInput('');
    setResponse(null);
    setError('');
    setApplyMessage('');
  }, [dateKey, open]);

  const dateLabel = useMemo(() => new Intl.DateTimeFormat(language === 'ne' ? 'ne-NP' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00`)), [dateKey, language]);

  const suggestions = language === 'ne'
    ? ['बेलुका ५ बजे फोटो सुट', 'दिउँसो ३ बजे ग्राहक बैठक', 'बेलुकाको जरुरी काम']
    : ['Photo shoot at 5 PM', 'Client meeting at 3 PM', 'High-priority task this evening'];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const request = input.trim();
    if (!request || loading) return;
    setLoading(true);
    setError('');
    setApplyMessage('');
    setResponse(null);
    try {
      const proposal = await requestAayojAssistant(
        `Create a concise calendar proposal for ${dateKey} in my planner timezone. User request: ${request}. Keep every new event or scheduled task on ${dateKey}. If time is missing, choose a sensible free time that avoids conflicts. Return only create-event or create-task actions. Do not apply anything yet.`,
        data,
        userId,
      );
      const actions = proposal.actions.filter((action) => belongsToDate(action, dateKey));
      const removedCount = proposal.actions.length - actions.length;
      setResponse({
        ...proposal,
        actions,
        requiresConfirmation: actions.length > 0,
        warnings: removedCount
          ? [...proposal.warnings, `${removedCount} action${removedCount === 1 ? ' was' : 's were'} excluded because it did not match the selected date.`]
          : proposal.warnings,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'AI could not prepare this date right now.');
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!response?.actions.length) return;
    const result = onApply(response.actions);
    if (!result.errors.length) {
      onClose();
      return;
    }
    setApplyMessage(`${result.applied} saved · ${result.errors.join(' ')}`);
  };

  return <Modal open={open} title={language === 'ne' ? 'AI सँग योजना बनाउनुहोस्' : 'Plan this date with AI'} onClose={onClose} className="calendar-ai-dialog">
    <div className="calendar-ai-body">
      <div className="calendar-ai-date">
        <BrandMark />
        <span><small>{language === 'ne' ? 'चयन गरिएको मिति' : 'Selected date'}</small><strong>{dateLabel}</strong></span>
        <i aria-hidden="true">✦</i>
      </div>

      {!response?.actions.length ? <>
        <p className="calendar-ai-intro">{language === 'ne'
          ? 'के योजना बनाउने हो लेख्नुहोस्। Aayoj ले खाली समय हेरेर छोटो प्रस्ताव बनाउँछ।'
          : 'Say what you need. Aayoj checks your schedule and prepares a compact proposal.'}</p>
        <div className="calendar-ai-suggestions" aria-label="Planning suggestions">
          {suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setInput(suggestion)}>{suggestion}</button>)}
        </div>
      </> : null}

      <form className="calendar-ai-compose" onSubmit={submit}>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={2} maxLength={2_000} placeholder={language === 'ne' ? 'जस्तै: बेलुका ५ बजे २ घण्टाको फोटो सुट…' : 'Example: Photo shoot at 5 PM for 2 hours…'} autoFocus />
        <button className="primary-button" type="submit" disabled={loading || !input.trim()}>{loading ? 'Planning…' : language === 'ne' ? 'प्रस्ताव बनाउनुहोस्' : 'Create proposal'}</button>
      </form>

      {response ? <div className="calendar-ai-response" aria-live="polite">
        <p>{response.reply}</p>
        {response.actions.length ? <AssistantActionList actions={response.actions} compact /> : <small>No safe proposal was returned. Try adding a clear activity and time.</small>}
        {response.warnings.map((warning) => <small className="assistant-warning" key={warning}>{warning}</small>)}
      </div> : null}
      {error ? <small className="assistant-error" role="alert">{error}</small> : null}
      {applyMessage ? <small className="assistant-error" role="alert">{applyMessage}</small> : null}

      <footer className="calendar-ai-footer">
        <small>{language === 'ne' ? 'तपाईंले स्वीकृत नगरेसम्म केही पनि सुरक्षित हुँदैन।' : 'Nothing is saved until you approve.'}</small>
        {response?.actions.length ? <span>
          <button className="secondary-button" type="button" onClick={() => setResponse(null)}>Adjust</button>
          <button className="primary-button" type="button" onClick={apply}>Approve & save</button>
        </span> : null}
      </footer>
    </div>
  </Modal>;
}
