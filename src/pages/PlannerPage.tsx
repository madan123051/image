import { useState } from 'react';
import type { AppData } from '../types/domain';
import type { CopyKey } from '../i18n';
import type { AssistantAction, AssistantResponse } from '../services/assistantSchema';
import { requestWildsauraAssistant } from '../services/assistantService';
import { AssistantActionList } from '../components/AssistantActionList';

interface PlannerPageProps {
  data: AppData;
  userId: string;
  labels: Record<CopyKey, string>;
  onApply(actions: AssistantAction[]): { applied: number; errors: string[] };
}

const promptIdeas = [
  'Plan my unfinished tasks into free time this week.',
  'Schedule three one-hour gym sessions this week.',
  'Keep Saturday evening free and move anything flexible.',
  'Create reminders for my urgent tasks.',
];

export function PlannerPage({ data, userId, labels, onApply }: PlannerPageProps) {
  const events = data.events.filter((item) => item.userId === userId);
  const tasks = data.tasks.filter((item) => item.userId === userId);
  const routines = data.routines.filter((item) => item.userId === userId);
  const [prompt, setPrompt] = useState(promptIdeas[0]);
  const [proposal, setProposal] = useState<AssistantResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState('');

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setApplied('');
    setError('');
    try {
      setProposal(await requestWildsauraAssistant(prompt, data, userId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gemini could not build this plan.');
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!proposal?.actions.length) return;
    const result = onApply(proposal.actions);
    setApplied(result.errors.length
      ? `${result.applied} applied. ${result.errors.join(' ')}`
      : `${result.applied} approved change${result.applied === 1 ? '' : 's'} saved to Firebase.`);
    if (!result.errors.length) setProposal({ ...proposal, actions: [], requiresConfirmation: false });
  };

  return <div className="page planner-page">
    <header className="page-heading compact-heading">
      <div><p className="eyebrow">Gemini command planning</p><h1>{labels.aiPlanner}</h1><p>{labels.plannerPrompt}</p></div>
      <span className="provider-chip"><i /> Gemini 3.5 Flash Lite · secure Vercel API</span>
    </header>
    <div className="planner-layout">
      <section className="content-panel planner-prompt-panel">
        <span className="planner-orbit">✦</span>
        <h2>What should Wildsaura arrange?</h2>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} maxLength={2_000} placeholder="Plan, create, update, move, or remove…" />
        <div className="prompt-ideas">{promptIdeas.map((idea) => <button type="button" key={idea} onClick={() => setPrompt(idea)}>{idea}</button>)}</div>
        <button className="primary-button wide-button" type="button" onClick={generate} disabled={loading || !prompt.trim()}>{loading ? 'Gemini is checking your schedule…' : '✦ Generate safe proposal'}</button>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="planner-context">
          <div><strong>{events.length}</strong><span>events considered</span></div>
          <div><strong>{tasks.filter((task) => task.status !== 'completed').length}</strong><span>open tasks</span></div>
          <div><strong>{routines.filter((routine) => routine.active).length}</strong><span>active routines</span></div>
        </div>
      </section>

      <section className="content-panel proposal-panel">
        <header className="section-heading"><div><p className="eyebrow">Approval preview</p><h2>{proposal ? proposal.summary : 'Waiting for your command'}</h2></div>{proposal ? <span className="status-pill preview">preview</span> : null}</header>
        {!proposal ? <div className="empty-state planner-empty"><span>✦</span><p>Gemini will return a typed proposal. Nothing changes until you press Apply.</p></div> : <>
          <p className="proposal-summary">{proposal.reply}</p>
          {proposal.actions.length ? <AssistantActionList actions={proposal.actions} /> : <div className="empty-state"><span>✓</span><p>No calendar change is needed for this answer.</p></div>}
          {proposal.warnings.map((warning) => <div className="approval-note" key={warning}><span>!</span><p><strong>Review note</strong>{warning}</p></div>)}
          {applied ? <p className="success-note">{applied}</p> : null}
          <footer className="proposal-actions">
            <button className="secondary-button" type="button" onClick={() => setProposal(null)}>{labels.cancel}</button>
            <button className="secondary-button" type="button" onClick={generate}>{labels.regenerate}</button>
            {proposal.actions.length ? <button className="primary-button" type="button" onClick={apply}>Apply {proposal.actions.length} change{proposal.actions.length === 1 ? '' : 's'}</button> : null}
          </footer>
        </>}
      </section>
    </div>
  </div>;
}
