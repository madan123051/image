import { useMemo, useState, type DragEvent } from 'react';
import type { CalendarDefinition, CalendarEvent, CalendarView, Language, PlannerTask, UserPreferences } from '../types/domain';
import type { CopyKey } from '../i18n';
import { addDays, getMonthGrid, getWeekDays, isSameDay, localDateTime, minutesBetween, toDateKey } from '../utils/date';
import { getGregorianDateForNepaliDay, getNepaliDate, getNepaliMonthDetails, moveNepaliMonth, NEPALI_MONTHS, toNepaliNumerals } from '../nepaliCalendar';
import { WeatherChip } from '../components/WeatherChip';
import { Modal } from '../components/Modal';
import { OfflineLudo } from '../components/OfflineLudo';
import { CalendarSnakeGame } from '../components/CalendarSnakeGame';

interface CalendarCell {
  date: Date;
  primaryDay: string;
  secondaryDay?: string;
  outside: boolean;
}

interface CalendarPageProps {
  events: CalendarEvent[];
  tasks: PlannerTask[];
  calendars: CalendarDefinition[];
  preferences: UserPreferences;
  language: Language;
  labels: Record<CopyKey, string>;
  anchor: Date;
  onAnchorChange(date: Date): void;
  onPlanDate(dateKey: string): void;
  onEditEvent(eventId: string): void;
  onEditTask(taskId: string): void;
  onSaveEvent(event: CalendarEvent): void;
  onAddCalendar(): void;
}

const englishWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const nepaliWeekdays = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिहि', 'शुक्र', 'शनि'];
const englishMonths = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(2026, month, 1)));

const leisureIdeas = [
  { id: 'ludo', emoji: '🎲', en: 'Play Ludo', ne: 'लुडो खेल्नुहोस्', minutes: 45, color: '#d98429' },
  { id: 'snake', emoji: '🐍', en: 'Snake & Ladders', ne: 'सर्प र भर्‍याङ', minutes: 30, color: '#4d8b72' },
  { id: 'walk', emoji: '🚶', en: 'Take a walk', ne: 'हिँड्न जानुहोस्', minutes: 30, color: '#4d8b72' },
  { id: 'read', emoji: '📖', en: 'Read something', ne: 'केही पढ्नुहोस्', minutes: 30, color: '#7770a8' },
  { id: 'rest', emoji: '☕', en: 'Rest & recharge', ne: 'आराम गर्नुहोस्', minutes: 30, color: '#b96f5f' },
  { id: 'movie', emoji: '🎬', en: 'Watch a movie', ne: 'चलचित्र हेर्नुहोस्', minutes: 120, color: '#467a96' },
] as const;

type LeisureIdea = (typeof leisureIdeas)[number];

const activityEmojiRules: Array<[RegExp, string]> = [
  [/(photo|camera|shoot|portrait|wedding)/i, '📸'],
  [/(video|film|reel|\bedit(ing)?\b|youtube|content)/i, '🎬'],
  [/(meeting|client|interview|appointment)/i, '🤝'],
  [/(call|phone|zoom)/i, '📞'],
  [/(travel|flight|airport|trip|vacation)/i, '✈️'],
  [/(\bgym\b|workout|fitness|exercise|\brun(ning)?\b|yoga)/i, '🏃'],
  [/(birthday|anniversary|celebration|party)/i, '🎂'],
  [/(doctor|hospital|health|medical|dentist)/i, '🩺'],
  [/(study|read|course|class|learn|exam)/i, '📚'],
  [/(shopping|grocery|market|buy)/i, '🛍️'],
  [/(breakfast|lunch|dinner|food|restaurant)/i, '🍽️'],
  [/(invoice|payment|bill|bank|finance)/i, '💳'],
  [/(family|home|house)/i, '🏡'],
  [/(work|project|focus|office|code|design)/i, '💻'],
];

function activityEmoji(text: string, fallback: string): string {
  return activityEmojiRules.find(([pattern]) => pattern.test(text))?.[1] ?? fallback;
}

function isCalendarWeekend(dayIndex: number, language: Language): boolean {
  return dayIndex === 6 || (language === 'en' && dayIndex === 0);
}

function CalendarActivityBadge({ emoji, title, kind, onOpen }: { emoji: string; title: string; kind: 'event' | 'task'; onOpen(): void }) {
  return <button className={`activity-emoji ${kind}`} type="button" title={title} aria-label={`Open ${kind}: ${title}`} onClick={(event) => { event.stopPropagation(); onOpen(); }}>{emoji}</button>;
}

function buildNepaliGrid(anchor: Date, firstDayOfWeek: number): CalendarCell[] {
  const anchorNepali = getNepaliDate(anchor);
  const details = getNepaliMonthDetails(anchorNepali.year, anchorNepali.month);
  const leading = (details.firstDay - firstDayOfWeek + 7) % 7;
  const previous = moveNepaliMonth(anchorNepali, -1);
  const previousDays = getNepaliMonthDetails(previous.year, previous.month).daysInMonth;

  return Array.from({ length: 42 }, (_, index) => {
    let year = anchorNepali.year;
    let month = anchorNepali.month;
    let day = index - leading + 1;
    let outside = false;
    if (day < 1) {
      year = previous.year;
      month = previous.month;
      day = previousDays + day;
      outside = true;
    } else if (day > details.daysInMonth) {
      const next = moveNepaliMonth(anchorNepali, 1);
      year = next.year;
      month = next.month;
      day -= details.daysInMonth;
      outside = true;
    }
    const gregorian = getGregorianDateForNepaliDay(year, month, day);
    const date = new Date(gregorian.year, gregorian.month - 1, gregorian.day);
    return {
      date,
      primaryDay: toNepaliNumerals(day),
      secondaryDay: `${gregorian.month}/${gregorian.day}`,
      outside,
    };
  });
}

function CalendarEventChip({ event, language, onOpen }: { event: CalendarEvent; language: Language; onOpen(): void }) {
  const time = event.allDay ? (language === 'ne' ? 'दिनभर' : 'All day') : new Intl.DateTimeFormat(language === 'ne' ? 'ne-NP' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(event.startDateTime));
  return (
    <button
      className={`event-chip ${event.status}`}
      draggable
      type="button"
      style={{ '--event-color': event.color } as React.CSSProperties}
      onClick={(clickEvent) => { clickEvent.stopPropagation(); onOpen(); }}
      onDragStart={(dragEvent) => { dragEvent.stopPropagation(); dragEvent.dataTransfer.setData('text/event-id', event.id); }}
      title={`${time} · ${event.title}`}
    >
      <span>{event.title}</span><small>{time}</small>
    </button>
  );
}

export function CalendarPage({
  events,
  tasks,
  calendars,
  preferences,
  language,
  labels,
  anchor,
  onAnchorChange,
  onPlanDate,
  onEditEvent,
  onEditTask,
  onSaveEvent,
  onAddCalendar,
}: CalendarPageProps) {
  const [view, setView] = useState<CalendarView>('month');
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(anchor.getFullYear());
  const [pickerError, setPickerError] = useState('');
  const [visibleCalendarIds, setVisibleCalendarIds] = useState(() => calendars.filter((calendar) => calendar.visible).map((calendar) => calendar.id));
  const [leisureDate, setLeisureDate] = useState('');
  const [leisureIdea, setLeisureIdea] = useState<LeisureIdea>(leisureIdeas[0]);
  const [leisureTime, setLeisureTime] = useState('18:00');
  const [leisureMinutes, setLeisureMinutes] = useState(45);
  const [leisureSaved, setLeisureSaved] = useState('');
  const [ludoOpen, setLudoOpen] = useState(false);
  const [ludoDate, setLudoDate] = useState('');
  const [snakeDate, setSnakeDate] = useState('');
  const todayKey = toDateKey(new Date());
  const visibleEvents = useMemo(() => {
    const visibleIds = new Set(visibleCalendarIds);
    return events.filter((event) => visibleIds.has(event.calendarId) && event.status !== 'cancelled');
  }, [events, visibleCalendarIds]);
  const weekdays = language === 'ne' ? nepaliWeekdays : englishWeekdays;

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    visibleEvents.forEach((event) => {
      const key = toDateKey(event.startDateTime);
      const dayEvents = grouped.get(key);
      if (dayEvents) dayEvents.push(event);
      else grouped.set(key, [event]);
    });
    return grouped;
  }, [visibleEvents]);

  const tasksByDay = useMemo(() => {
    const grouped = new Map<string, PlannerTask[]>();
    tasks.forEach((task) => {
      if (task.status === 'completed') return;
      const key = task.scheduledStart ? toDateKey(task.scheduledStart) : task.dueDate;
      if (!key) return;
      const dayTasks = grouped.get(key);
      if (dayTasks) dayTasks.push(task);
      else grouped.set(key, [task]);
    });
    return grouped;
  }, [tasks]);

  const monthCells = useMemo<CalendarCell[]>(() => {
    if (language === 'ne') return buildNepaliGrid(anchor, preferences.firstDayOfWeek);
    return getMonthGrid(anchor, preferences.firstDayOfWeek).map((date) => ({
      date,
      primaryDay: `${date.getDate()}`,
      secondaryDay: `${getNepaliDate(date).day}`,
      outside: date.getMonth() !== anchor.getMonth(),
    }));
  }, [anchor, language, preferences.firstDayOfWeek]);

  const anchorNepali = getNepaliDate(anchor);
  const activeCalendarYear = language === 'ne' ? anchorNepali.year : anchor.getFullYear();
  const activeCalendarMonth = language === 'ne' ? anchorNepali.month : anchor.getMonth() + 1;
  const title = language === 'ne'
    ? `${NEPALI_MONTHS[activeCalendarMonth - 1]} ${toNepaliNumerals(activeCalendarYear)}`
    : new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(anchor);

  const toggleMonthPicker = () => {
    if (monthPickerOpen) {
      setMonthPickerOpen(false);
      return;
    }
    setPickerYear(activeCalendarYear);
    setPickerError('');
    setMonthPickerOpen(true);
  };

  const chooseMonth = (month: number) => {
    try {
      if (language === 'ne') {
        const gregorian = getGregorianDateForNepaliDay(pickerYear, month, 1);
        onAnchorChange(new Date(gregorian.year, gregorian.month - 1, gregorian.day));
      } else {
        if (pickerYear < 1900 || pickerYear > 2200) throw new Error('Unsupported year');
        onAnchorChange(new Date(pickerYear, month - 1, 1));
      }
      setMonthPickerOpen(false);
    } catch {
      setPickerError(language === 'ne' ? 'यो वर्ष समर्थित छैन।' : 'Choose a year between 1900 and 2200.');
    }
  };

  const move = (direction: number) => {
    if (view === 'month') {
      if (language === 'ne') {
        const current = getNepaliDate(anchor);
        const next = moveNepaliMonth(current, direction);
        const gregorian = getGregorianDateForNepaliDay(next.year, next.month, 1);
        onAnchorChange(new Date(gregorian.year, gregorian.month - 1, gregorian.day));
      } else onAnchorChange(new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1));
    } else if (view === 'week') onAnchorChange(addDays(anchor, direction * 7));
    else onAnchorChange(addDays(anchor, direction));
  };

  const handleDrop = (dropEvent: DragEvent, date: Date) => {
    dropEvent.preventDefault();
    const eventId = dropEvent.dataTransfer.getData('text/event-id');
    const source = events.find((event) => event.id === eventId);
    if (!source) return;
    const duration = minutesBetween(source.startDateTime, source.endDateTime);
    const time = source.allDay ? '00:00' : `${`${new Date(source.startDateTime).getHours()}`.padStart(2, '0')}:${`${new Date(source.startDateTime).getMinutes()}`.padStart(2, '0')}`;
    const start = localDateTime(toDateKey(date), time);
    onSaveEvent({ ...source, startDateTime: start, endDateTime: new Date(new Date(start).getTime() + duration * 60_000).toISOString(), updatedAt: new Date().toISOString() });
  };

  const openLeisure = (dateKey: string) => {
    const now = new Date();
    const selectedIsToday = dateKey === toDateKey(now);
    const nextHour = Math.min(22, now.getHours() + 1);
    setLeisureDate(dateKey);
    setLeisureIdea(leisureIdeas[0]);
    setLeisureMinutes(leisureIdeas[0].minutes);
    setLeisureTime(selectedIsToday ? `${`${nextHour}`.padStart(2, '0')}:00` : '18:00');
    setLeisureSaved('');
  };

  const chooseLeisure = (idea: LeisureIdea) => {
    setLeisureIdea(idea);
    setLeisureMinutes(idea.minutes);
  };

  const startLudo = () => {
    setLudoDate(leisureDate);
    setLeisureDate('');
    setLudoOpen(true);
  };

  const startSnake = () => {
    setSnakeDate(leisureDate);
    setLeisureDate('');
  };

  const saveLeisureBlock = () => {
    if (!leisureDate) return;
    const calendar = calendars.find((item) => item.visible && item.isPrivate) ?? calendars.find((item) => item.visible) ?? calendars[0];
    if (!calendar) return;
    const startDateTime = localDateTime(leisureDate, leisureTime);
    const endDateTime = new Date(new Date(startDateTime).getTime() + leisureMinutes * 60_000).toISOString();
    const now = new Date().toISOString();
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    onSaveEvent({
      id: `leisure_${id}`,
      userId: calendar.userId,
      calendarId: calendar.id,
      title: language === 'ne' ? leisureIdea.ne : leisureIdea.en,
      description: language === 'ne' ? 'Aayoj खाली समय सुझाव' : 'Aayoj free-time idea',
      startDateTime,
      endDateTime,
      timezone: preferences.timezone,
      allDay: false,
      location: '',
      color: leisureIdea.color,
      status: 'confirmed',
      recurrenceRule: null,
      reminders: [],
      participants: [],
      attachments: [],
      notes: '',
      url: '',
      isImportant: false,
      countdown: false,
      createdAt: now,
      updatedAt: now,
    });
    setLeisureSaved(language === 'ne' ? 'खाली समय पात्रोमा सुरक्षित भयो।' : 'Free-time block saved to your calendar.');
    window.setTimeout(() => setLeisureDate(''), 650);
  };

  const weekDays = getWeekDays(anchor, preferences.firstDayOfWeek);
  const activeDays = view === 'day' ? [anchor] : weekDays;
  const agendaEvents = visibleEvents
    .filter((event) => new Date(event.endDateTime) >= new Date())
    .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))
    .slice(0, 30);

  return (
    <div className="page calendar-page">
      <header className="page-heading compact-heading">
        <div><p className="eyebrow">Plan with clarity</p><h1>{labels.calendar}</h1><p>Drag to reschedule. Tap any date and let AI plan it for you.</p></div>
        <WeatherChip language={language} />
      </header>

      <section className="calendar-workspace">
        <header className="calendar-toolbar">
          <div className="date-navigation">
            <button className="icon-button" type="button" onClick={() => move(-1)} aria-label="Previous period">‹</button>
            <button className="secondary-button today-button" type="button" onClick={() => onAnchorChange(new Date())}>{labels.today}</button>
            <button className="icon-button" type="button" onClick={() => move(1)} aria-label="Next period">›</button>
            {monthPickerOpen ? <button className="month-picker-scrim" type="button" onClick={() => setMonthPickerOpen(false)} aria-label="Close month picker" /> : null}
            <div className={`month-picker-anchor ${monthPickerOpen ? 'open' : ''}`}>
              <button className="month-title-button" type="button" onClick={toggleMonthPicker} aria-haspopup="dialog" aria-expanded={monthPickerOpen}>{title}<span aria-hidden="true">⌄</span></button>
              {monthPickerOpen ? <section className="month-picker-popover" role="dialog" aria-label="Choose month and year">
                <header>
                  <button type="button" onClick={() => setPickerYear((year) => year - 1)} aria-label="Previous year">‹</button>
                  <input type="number" inputMode="numeric" value={pickerYear} min={language === 'ne' ? 1970 : 1900} max={2200} onChange={(event) => { setPickerYear(Number(event.target.value)); setPickerError(''); }} aria-label="Calendar year" />
                  <button type="button" onClick={() => setPickerYear((year) => year + 1)} aria-label="Next year">›</button>
                </header>
                <div className="month-picker-grid">
                  {(language === 'ne' ? NEPALI_MONTHS : englishMonths).map((monthName, index) => <button className={pickerYear === activeCalendarYear && index + 1 === activeCalendarMonth ? 'active' : ''} type="button" key={monthName} onClick={() => chooseMonth(index + 1)}>{monthName}</button>)}
                </div>
                {pickerError ? <small role="alert">{pickerError}</small> : null}
              </section> : null}
            </div>
          </div>
          <div className="segmented-control" aria-label="Calendar view">
            {(['day', 'week', 'month', 'agenda'] as CalendarView[]).map((item) => (
              <button className={view === item ? 'active' : ''} type="button" key={item} onClick={() => setView(item)}>{labels[item]}</button>
            ))}
          </div>
        </header>

        <div className={`calendar-body ${snakeDate ? 'game-mode' : ''}`}>
          {snakeDate ? <CalendarSnakeGame dateKey={snakeDate} language={language} onClose={() => setSnakeDate('')} /> : <>
          <aside className="calendar-list-panel">
            <strong>My calendars</strong>
            {calendars.map((calendar) => (
              <label className="calendar-toggle" key={calendar.id}>
                <input
                  type="checkbox"
                  checked={visibleCalendarIds.includes(calendar.id)}
                  onChange={(changeEvent) => setVisibleCalendarIds((current) => changeEvent.target.checked ? [...current, calendar.id] : current.filter((id) => id !== calendar.id))}
                />
                <i style={{ background: calendar.color }} /><span>{calendar.name}</span><small>{calendar.role}</small>
              </label>
            ))}
            <button className="text-button calendar-settings-link" type="button" onClick={onAddCalendar}>＋ Add calendar</button>
        <div className="calendar-tip"><span>◎</span><p><strong>Smart scheduling</strong>Fixed appointments stay protected. Suggestions always require approval.</p></div>
          </aside>

          <div className="calendar-canvas">
            {view === 'month' && <div className="month-view">
              <div className="weekday-row">
                {Array.from({ length: 7 }, (_, index) => {
                  const dayIndex = (index + preferences.firstDayOfWeek) % 7;
                  return <strong className={isCalendarWeekend(dayIndex, language) ? 'weekend' : ''} key={dayIndex}>{weekdays[dayIndex]}</strong>;
                })}
              </div>
              <div className="month-grid">
                {monthCells.map((cell) => {
                  const dateKey = toDateKey(cell.date);
                  const dayEvents = eventsByDay.get(dateKey) ?? [];
                  const dayTasks = tasksByDay.get(dateKey) ?? [];
                  const weekend = isCalendarWeekend(cell.date.getDay(), language);
                  const activities = [
                    ...dayTasks.map((task) => ({ id: task.id, emoji: activityEmoji(`${task.title} ${task.category} ${task.description}`, '✅'), title: task.title, kind: 'task' as const })),
                    ...dayEvents.map((event) => ({ id: event.id, emoji: activityEmoji(`${event.title} ${event.description} ${event.location}`, '📅'), title: event.title, kind: 'event' as const })),
                  ];
                  return (
                    <div
                      className={`month-cell ${cell.outside ? 'outside' : ''} ${weekend ? 'weekend' : ''} ${dateKey === todayKey ? 'today' : ''}`}
                      key={cell.date.toISOString()}
                      role="button"
                      tabIndex={0}
                      onClick={() => onPlanDate(dateKey)}
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.target !== keyEvent.currentTarget || !['Enter', ' '].includes(keyEvent.key)) return;
                        keyEvent.preventDefault();
                        onPlanDate(dateKey);
                      }}
                      onDragOver={(dragEvent) => dragEvent.preventDefault()}
                      onDrop={(dropEvent) => handleDrop(dropEvent, cell.date)}
                    >
                      <span className="date-number"><b>{cell.primaryDay}</b><small>{language === 'ne' ? `AD ${cell.secondaryDay}` : `BS ${toNepaliNumerals(cell.secondaryDay ?? '')}`}</small></span>
                      {activities.length ? <div className="day-activity-emojis" role="group" aria-label={`${activities.length} scheduled activities`}>
                        {activities.slice(0, 3).map((activity) => <CalendarActivityBadge key={`${activity.kind}-${activity.id}`} emoji={activity.emoji} title={activity.title} kind={activity.kind} onOpen={() => activity.kind === 'task' ? onEditTask(activity.id) : onEditEvent(activity.id)} />)}
                        {activities.length > 3 ? <small className="activity-count">+{activities.length - 3}</small> : null}
                      </div> : !cell.outside && dateKey >= todayKey ? <button className="free-time-trigger" type="button" onClick={(event) => { event.stopPropagation(); openLeisure(dateKey); }} aria-label={`${language === 'ne' ? 'खाली समय विकल्प' : 'Free-time ideas'} · ${dateKey}`}><span>🎲</span><small>{language === 'ne' ? 'खाली समय' : 'Free time'}</small></button> : null}
                      <div className="cell-events">
                        {dayEvents.slice(0, 3).map((event) => <CalendarEventChip key={event.id} event={event} language={language} onOpen={() => onEditEvent(event.id)} />)}
                        {dayEvents.length > 3 && <small className="more-events">+{dayEvents.length - 3} more</small>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>}

            {(view === 'week' || view === 'day') && <div className={`time-grid ${view}-view`}>
              <div className="time-grid-header"><span />{activeDays.map((date) => (
                <button type="button" className={`${isSameDay(date, new Date()) ? 'active' : ''} ${isCalendarWeekend(date.getDay(), language) ? 'weekend' : ''}`} key={date.toISOString()} onClick={() => { onAnchorChange(date); setView('day'); }}>
                  <small>{weekdays[date.getDay()]}</small><strong>{language === 'ne' ? toNepaliNumerals(getNepaliDate(date).day) : date.getDate()}</strong>
                </button>
              ))}</div>
              <div className="time-grid-scroll">
                {Array.from({ length: 14 }, (_, index) => index + 7).map((hour) => (
                  <div className="time-row" key={hour}><time>{`${hour}`.padStart(2, '0')}:00</time>{activeDays.map((date) => {
                    const hourEvents = (eventsByDay.get(toDateKey(date)) ?? []).filter((event) => new Date(event.startDateTime).getHours() === hour);
                    return <div className="time-cell" key={date.toISOString()} onClick={() => onPlanDate(toDateKey(date))} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, date)}>{hourEvents.map((event) => <CalendarEventChip event={event} language={language} key={event.id} onOpen={() => onEditEvent(event.id)} />)}</div>;
                  })}</div>
                ))}
              </div>
            </div>}

            {view === 'agenda' && <div className="agenda-view">
              {agendaEvents.length ? agendaEvents.map((event, index) => {
                const previous = agendaEvents[index - 1];
                const showDate = !previous || !isSameDay(previous.startDateTime, event.startDateTime);
                return <div key={event.id}>{showDate && <h3>{new Intl.DateTimeFormat(language === 'ne' ? 'ne-NP' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(event.startDateTime))}</h3>}<button className="agenda-event" type="button" onClick={() => onEditEvent(event.id)}><i style={{ background: event.color }} /><time>{event.allDay ? 'All day' : new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time><span><strong>{event.title}</strong><small>{event.location || calendars.find((calendar) => calendar.id === event.calendarId)?.name}</small></span><b>›</b></button></div>;
              }) : <div className="empty-state"><span>☘</span><p>No upcoming events.</p></div>}
            </div>}
          </div>
          </>}
        </div>
      </section>

      <Modal open={Boolean(leisureDate)} title={language === 'ne' ? 'खाली समय मिलाउनुहोस्' : 'Plan some free time'} onClose={() => setLeisureDate('')} className="leisure-modal">
        <div className="leisure-modal-body">
          <header><span>🎲</span><div><p className="eyebrow">{language === 'ne' ? 'Aayoj सुझाव' : 'Aayoj ideas'}</p><h3>{leisureDate ? new Intl.DateTimeFormat(language === 'ne' ? 'ne-NP' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${leisureDate}T12:00:00`)) : ''}</h3></div></header>
          <div className="leisure-ideas" role="list" aria-label={language === 'ne' ? 'खाली समयका सुझावहरू' : 'Free-time ideas'}>{leisureIdeas.map((idea) => <button className={leisureIdea.id === idea.id ? 'active' : ''} type="button" role="listitem" key={idea.id} onClick={() => { chooseLeisure(idea); if (idea.id === 'ludo') startLudo(); if (idea.id === 'snake') startSnake(); }}><span>{idea.emoji}</span><strong>{language === 'ne' ? idea.ne : idea.en}</strong><small>{idea.id === 'ludo' || idea.id === 'snake' ? (language === 'ne' ? 'अफलाइन खेल्नुहोस्' : 'Play offline') : `${idea.minutes} min`}</small></button>)}</div>
          <div className="leisure-schedule">
            <label><span>{language === 'ne' ? 'सुरु समय' : 'Start time'}</span><input type="time" value={leisureTime} onChange={(event) => setLeisureTime(event.target.value)} /></label>
            <label><span>{language === 'ne' ? 'अवधि' : 'Duration'}</span><select value={leisureMinutes} onChange={(event) => setLeisureMinutes(Number(event.target.value))}>{[15,30,45,60,90,120].map((minutes) => <option value={minutes} key={minutes}>{minutes} min</option>)}</select></label>
          </div>
          {leisureSaved ? <p className="success-note" role="status">✓ {leisureSaved}</p> : null}
          <button className="primary-button wide-button" type="button" onClick={saveLeisureBlock}>{language === 'ne' ? `${leisureIdea.emoji} पात्रोमा राख्नुहोस्` : `${leisureIdea.emoji} Add to calendar`}</button>
          <button className="text-button" type="button" onClick={() => { const date = leisureDate; setLeisureDate(''); if (date) onPlanDate(date); }}>{language === 'ne' ? 'यसको सट्टा AI बाट दिन योजना बनाउनुहोस्' : 'Plan the whole day with AI instead'}</button>
        </div>
      </Modal>

      <Modal open={ludoOpen} title={language === 'ne' ? 'Aayoj अफलाइन लुडो' : 'Aayoj Offline Ludo'} onClose={() => setLudoOpen(false)} className="ludo-modal">
        <OfflineLudo language={language} onSchedule={() => { setLudoOpen(false); setLeisureIdea(leisureIdeas[0]); setLeisureMinutes(leisureIdeas[0].minutes); setLeisureDate(ludoDate || todayKey); }} />
      </Modal>
    </div>
  );
}
