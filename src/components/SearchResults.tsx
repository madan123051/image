import type { SearchResult } from '../types/domain';

interface SearchResultsProps { query: string; results: SearchResult[]; onSelect(result: SearchResult): void; onClose(): void; }

export function SearchResults({ query, results, onSelect, onClose }: SearchResultsProps) {
  if (!query.trim()) return null;
  return <div className="search-popover" role="dialog" aria-label="Search results">
    <header><span>⌕</span><strong>{results.length} result{results.length === 1 ? '' : 's'} for “{query}”</strong><button className="icon-button" type="button" onClick={onClose}>×</button></header>
    <div className="search-results">{results.length ? results.map((result) => <button type="button" key={`${result.type}_${result.id}`} onClick={() => onSelect(result)}><span className={`search-result-icon ${result.type}`}>{result.type === 'event' ? '▦' : result.type === 'task' ? '✓' : result.type === 'reminder' ? '◷' : '↻'}</span><span><strong>{result.title}</strong><small>{result.subtitle}</small></span><b>{result.type}</b></button>) : <div className="empty-state"><p>No events, tasks, reminders, routines or notes matched.</p></div>}</div>
  </div>;
}
