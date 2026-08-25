import type { AssistantAction } from '../services/assistantSchema';

interface AssistantActionListProps {
  actions: AssistantAction[];
  compact?: boolean;
}

const entityIcons: Record<AssistantAction['entity'], string> = {
  event: '◫',
  task: '✓',
  reminder: '◷',
  routine: '↻',
};

function actionTime(action: AssistantAction): string | null {
  const value = action.data.startDateTime
    ?? action.data.scheduledStart
    ?? action.data.remindAt
    ?? action.data.dueDate
    ?? action.data.startTime;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AssistantActionList({ actions, compact = false }: AssistantActionListProps) {
  return <div className={compact ? 'assistant-action-list compact' : 'assistant-action-list'}>
    {actions.map((action) => <article className={`assistant-action ${action.operation}`} key={action.id}>
      <span className="assistant-action-icon" aria-hidden="true">{entityIcons[action.entity]}</span>
      <span>
        <small>{action.operation} {action.entity}</small>
        <strong>{action.label}</strong>
        {actionTime(action) ? <time>{actionTime(action)}</time> : null}
        {!compact ? <em>{action.reason}</em> : null}
      </span>
    </article>)}
  </div>;
}
