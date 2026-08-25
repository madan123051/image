import { useMemo, useState } from 'react';
import type { CalendarEvent, PlannerProposal, PlannerTask, Routine, UserPreferences } from '../types/domain';
import type { CopyKey } from '../i18n';
import { LocalRulesAIProvider } from '../services/aiService';
import { formatDuration } from '../utils/date';

interface PlannerPageProps {
  events: CalendarEvent[];
  tasks: PlannerTask[];
  routines: Routine[];
  preferences: UserPreferences;
  labels: Record<CopyKey, string>;
  onApply(proposal: PlannerProposal): void;
}

const promptIdeas = [
  'Plan my day around my important tasks.',
  'Schedule gym three times this week.',
  'Keep Saturday evening free for family.',
  'Organize my unfinished tasks.',
];

export function PlannerPage({ events, tasks, routines, preferences, labels, onApply }: PlannerPageProps) {
  const provider = useMemo(() => new LocalRulesAIProvider(), []);
  const [prompt, setPrompt] = useState('Plan my day around my important tasks.');
  const [proposal, setProposal] = useState<PlannerProposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setApplied(false);
    try {
      setProposal(await provider.proposePlan(prompt, { events, tasks, routines, preferences }));
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!proposal) return;
    onApply({ ...proposal, status: 'applied' });
    setProposal({ ...proposal, status: 'applied' });
    setApplied(true);
  };

  return (
    <div className="page planner-page">
      <header className="page-heading compact-heading">
        <div><p className="eyebrow">Approval-first scheduling</p><h1>{labels.aiPlanner}</h1><p>{labels.plannerPrompt}</p></div>
        <span className="provider-chip"><i /> Local rules · provider swappable</span>
      </header>
      <div className="planner-layout">
        <section className="content-panel planner-prompt-panel">
          <span className="planner-orbit">✦</span>
          <h2>What should we make room for?</h2>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} placeholder="Plan my day…" />
          <div className="prompt-ideas">{promptIdeas.map((idea) => <button type="button" key={idea} onClick={() => setPrompt(idea)}>{idea}</button>)}</div>
          <button className="primary-button wide-button" type="button" onClick={generate} disabled={loading}>{loading ? 'Building a safe preview…' : '✦ Generate plan'}</button>
          <div className="planner-context">
            <div><strong>{events.length}</strong><span>events considered</span></div>
            <div><strong>{tasks.filter((task) => task.status !== 'completed').length}</strong><span>open tasks</span></div>
            <div><strong>{routines.length}</strong><span>routines protected</span></div>
          </div>
        </section>

        <section className="content-panel proposal-panel">
          <header className="section-heading"><div><p className="eyebrow">Plan preview</p><h2>{proposal ? 'Your proposed schedule' : 'Waiting for your request'}</h2></div>{proposal && <span className={`status-pill ${proposal.status}`}>{proposal.status}</span>}</header>
          {!proposal ? <div className="empty-state planner-empty"><span>✦</span><p>Your proposal will appear here. No calendar data is changed during planning.</p></div> : <>
            <p className="proposal-summary">{proposal.summary}</p>
            <div className="proposal-timeline">
              {proposal.items.map((item) => <article key={item.id}><time>{new Date(item.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time><i /><span><strong>{item.title}</strong><small>{new Date(item.startDateTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {formatDuration(Math.round((new Date(item.endDateTime).getTime() - new Date(item.startDateTime).getTime()) / 60_000))}</small><em>{item.reason}</em></span></article>)}
            </div>
            {proposal.warnings.map((warning) => <div className="approval-note" key={warning}><span>✓</span><p><strong>Approval required</strong>{warning}</p></div>)}
            {applied && <p className="success-note">Plan applied to the selected tasks.</p>}
            <footer className="proposal-actions"><button className="secondary-button" type="button" onClick={() => setProposal(null)}>{labels.cancel}</button><button className="secondary-button" type="button" onClick={generate}>{labels.regenerate}</button><button className="primary-button" type="button" onClick={apply} disabled={proposal.status === 'applied'}>{labels.applyPlan}</button></footer>
          </>}
        </section>
      </div>
    </div>
  );
}
