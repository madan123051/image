import { useState, type FormEvent } from 'react';
import type { AppData, Language } from '../types/domain';
import type { AssistantAction, AssistantResponse } from '../services/assistantSchema';
import { requestAayojAssistant } from '../services/assistantService';
import { AssistantActionList } from './AssistantActionList';
import { BrandMark } from './BrandMark';

interface AIAssistantProps {
  data: AppData;
  userId: string;
  language: Language;
  onApply(actions: AssistantAction[]): { applied: number; errors: string[] };
  onOpenPlanner(): void;
}

export function AIAssistant({ data, userId, language, onApply, onOpenPlanner }: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applyMessage, setApplyMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;
    setLoading(true);
    setError('');
    setApplyMessage('');
    try {
      setResponse(await requestAayojAssistant(prompt, data, userId));
      setInput('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The assistant could not answer right now.');
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!response?.actions.length) return;
    const result = onApply(response.actions);
    setApplyMessage(result.errors.length
      ? `${result.applied} applied · ${result.errors.join(' ')}`
      : `${result.applied} change${result.applied === 1 ? '' : 's'} saved to your workspace.`);
    if (!result.errors.length) setResponse({ ...response, actions: [], requiresConfirmation: false });
  };

  const intro = language === 'ne'
    ? 'कार्यक्रम, कार्य, सम्झना वा दिनचर्या बनाउन, सार्न वा योजना बनाउन आदेश दिनुहोस्।'
    : 'Command me to create, move, plan, update, or remove events, tasks, reminders, and routines.';

  return <div className={`assistant ${open ? 'open' : ''}`}>
    {open ? <section className="assistant-panel" aria-label="Aayoj Assistant">
      <header><BrandMark /><div><strong>Aayoj Assistant</strong><small>Private planning · approval-first</small></div><button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close assistant">×</button></header>
      <div className="assistant-answer" aria-live="polite">
        <p>{response?.reply ?? intro}</p>
        {response?.actions.length ? <AssistantActionList actions={response.actions} compact /> : null}
        {response?.warnings.map((warning) => <small className="assistant-warning" key={warning}>{warning}</small>)}
        {error ? <small className="assistant-error" role="alert">{error}</small> : null}
        {applyMessage ? <small className="assistant-success">{applyMessage}</small> : null}
      </div>
      {response?.actions.length ? <div className="assistant-approval">
        <button className="secondary-button" type="button" onClick={() => setResponse(null)}>Discard</button>
        <button className="primary-button" type="button" onClick={apply}>Apply {response.actions.length} change{response.actions.length === 1 ? '' : 's'}</button>
      </div> : <div className="assistant-suggestions">
        <button type="button" onClick={() => setInput('Plan my unfinished tasks into free time this week.')}>Plan my week</button>
        <button type="button" onClick={() => setInput('Create a reminder tomorrow at 9 AM to call family.')}>Create reminder</button>
      </div>}
      <form onSubmit={submit}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder={language === 'ne' ? 'सहायकलाई सोध्नुहोस्…' : 'Ask your assistant…'} maxLength={2_000} /><button type="submit" aria-label="Send" disabled={loading || !input.trim()}>{loading ? '…' : '↑'}</button></form>
      <button className="assistant-planner-link" type="button" onClick={() => { setOpen(false); onOpenPlanner(); }}>Open full AI Planner →</button>
    </section> : null}
    <button className="assistant-button" type="button" onClick={() => setOpen((current) => !current)} aria-label={open ? 'Close Aayoj Assistant' : 'Open Aayoj Assistant'} aria-expanded={open}>{open ? '×' : <BrandMark />}</button>
  </div>;
}
