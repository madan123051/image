import { useState, type FormEvent } from 'react';
import type { CalendarEvent, PlannerTask } from '../types/domain';
import { addDays, isSameDay } from '../utils/date';

interface AIAssistantProps { events: CalendarEvent[]; tasks: PlannerTask[]; onOpenPlanner(): void; }

export function AIAssistant({ events, tasks, onOpenPlanner }: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('Ask about free time, upcoming events, or request a schedule preview.');

  const route = (event: FormEvent) => {
    event.preventDefault();
    const query = input.toLowerCase();
    if (query.includes('doctor')) {
      const doctor = events.find((item) => item.title.toLowerCase().includes('doctor'));
      setAnswer(doctor ? `Your next doctor appointment is ${new Date(doctor.startDateTime).toLocaleString()}.` : 'I could not find a doctor appointment.');
    } else if (query.includes('tomorrow') && query.includes('free')) {
      const tomorrow = addDays(new Date(), 1);
      const count = events.filter((item) => isSameDay(item.startDateTime, tomorrow)).length;
      setAnswer(count ? `You have ${count} event${count === 1 ? '' : 's'} tomorrow. Open Planner for safe free-time options.` : 'Tomorrow is currently open during your planning hours.');
    } else if (query.includes('busiest')) {
      const grouped = events.reduce<Record<string, number>>((map, item) => { const key = new Date(item.startDateTime).toDateString(); map[key] = (map[key] ?? 0) + 1; return map; }, {});
      const busiest = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0];
      setAnswer(busiest ? `${busiest[0]} is busiest with ${busiest[1]} events.` : 'There are no events to compare.');
    } else if (query.includes('move') || query.includes('schedule') || query.includes('plan')) {
      setAnswer(`I can prepare a proposal using ${tasks.filter((task) => task.status !== 'completed').length} open tasks. Nothing will move until you approve it in Planner.`);
    } else setAnswer('I can search the current schedule locally. Connect an AI provider later for broader natural-language reasoning.');
    setInput('');
  };

  return <div className={`assistant ${open ? 'open' : ''}`}>
    {open && <section className="assistant-panel" aria-label="Wildsaura AI assistant"><header><span>✦</span><div><strong>Wildsaura assistant</strong><small>Approval-first command router</small></div><button className="icon-button" type="button" onClick={() => setOpen(false)}>×</button></header><div className="assistant-answer">{answer}</div><div className="assistant-suggestions"><button type="button" onClick={() => setInput("What's free tomorrow?")}>What’s free tomorrow?</button><button type="button" onClick={() => setInput('When is my next doctor appointment?')}>Next doctor appointment</button></div><form onSubmit={route}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Wildsaura…" /><button type="submit" aria-label="Send">↑</button></form><button className="assistant-planner-link" type="button" onClick={() => { setOpen(false); onOpenPlanner(); }}>Open full AI Planner →</button></section>}
    <button className="assistant-button" type="button" onClick={() => setOpen(!open)} aria-label="Open AI assistant">{open ? '×' : '✦'}</button>
  </div>;
}
