import { useEffect, useState } from 'react';
import { useLocalWeather, weatherPresentation } from '../hooks/useLocalWeather';
import type { CalendarEvent, Language, PlannerTask } from '../types/domain';
import { formatDuration } from '../utils/date';

interface TodayLiveHeroProps {
  displayName: string;
  displayedDate: string;
  events: CalendarEvent[];
  focusLabel: string;
  freeMinutes: number;
  greetingLabel: string;
  language: Language;
  now: Date;
  plannerTimezone: string;
  tasks: PlannerTask[];
  todayLabel: string;
}

function solarTime(value: string | null, language: Language): string {
  const time = value?.split('T')[1];
  if (!time) return '—';
  const [hour, minute] = time.split(':').map(Number);
  return new Intl.DateTimeFormat(language === 'ne' ? 'ne-NP' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2026, 0, 1, hour, minute)));
}

function locationName(timezone: string): string {
  return timezone.split('/').pop()?.replace(/_/g, ' ') ?? timezone;
}

function isWetWeather(code: number): boolean {
  return (code >= 51 && code <= 86) || code >= 95;
}

export function TodayLiveHero({
  displayName,
  displayedDate,
  events,
  focusLabel,
  freeMinutes,
  greetingLabel,
  language,
  now,
  plannerTimezone,
  tasks,
  todayLabel,
}: TodayLiveHeroProps) {
  const [showGreeting, setShowGreeting] = useState(true);
  const { requestLocalWeather, snapshot, status } = useLocalWeather({ autoLocate: true });

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setShowGreeting(false), reduceMotion ? 900 : 2_600);
    return () => window.clearTimeout(timer);
  }, []);

  const timezone = snapshot?.timezone || plannerTimezone;
  const localTime = new Intl.DateTimeFormat(language === 'ne' ? 'ne-NP' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(now);
  const presentation = snapshot ? weatherPresentation(snapshot.code, snapshot.isDay, language) : null;
  const nextEvent = events.find((event) => new Date(event.endDateTime) >= now);
  const urgentTasks = tasks.filter((task) => task.priority === 'urgent').length;
  const minutesUntilNext = nextEvent ? Math.round((new Date(nextEvent.startDateTime).getTime() - now.getTime()) / 60_000) : Number.POSITIVE_INFINITY;
  const nextEventTime = nextEvent ? new Intl.DateTimeFormat(language === 'ne' ? 'ne-NP' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: nextEvent.timezone || plannerTimezone,
  }).format(new Date(nextEvent.startDateTime)) : null;

  let briefTitle = language === 'ne' ? 'आजको दिन खुला र सहज छ।' : 'Your day has room to breathe.';
  let briefBody = language === 'ne'
    ? `${formatDuration(freeMinutes)} खाली समयबाट एउटा महत्त्वपूर्ण काम सुरक्षित राख्नुहोस्।`
    : `You have ${formatDuration(freeMinutes)} open in planning hours. Protect one meaningful focus block.`;
  if (nextEvent && minutesUntilNext >= 0 && minutesUntilNext <= 120) {
    briefTitle = language === 'ne' ? 'अर्को काम नजिकै छ।' : 'Your next move is coming up.';
    briefBody = language === 'ne'
      ? `${nextEventTime} बजे ${nextEvent.title} छ। तयारीका लागि केही समय खाली राख्नुहोस्।`
      : `${nextEvent.title} starts at ${nextEventTime}. Keep a little preparation time clear.`;
  } else if (snapshot && isWetWeather(snapshot.code)) {
    briefTitle = language === 'ne' ? 'आजको योजना अलि लचिलो राख्नुहोस्।' : 'Keep today a little flexible.';
    briefBody = language === 'ne'
      ? `${presentation?.label} मौसम छ। बाहिरी योजनाको बीचमा अतिरिक्त यात्रा समय राख्नुहोस्।`
      : `${presentation?.label} conditions are nearby. Add travel buffer around outdoor plans.`;
  } else if (urgentTasks > 0) {
    briefTitle = language === 'ne' ? 'एउटा प्राथमिकता पहिले राख्नुहोस्।' : 'One priority deserves the first block.';
    briefBody = language === 'ne'
      ? `${urgentTasks} जरुरी काम बाँकी छन्। सबैभन्दा महत्वपूर्ण काम पहिले सकाउनुहोस्।`
      : `${urgentTasks} urgent task${urgentTasks === 1 ? ' is' : 's are'} still open. Give the first clear window to the most important one.`;
  } else if (!events.length && !tasks.length) {
    briefTitle = language === 'ne' ? 'आजको दिन तपाईंको हो।' : 'Today is yours to shape.';
    briefBody = language === 'ne'
      ? 'एउटा स्पष्ट लक्ष्य छान्नुहोस्, बाँकी समय खुला राख्नुहोस्।'
      : 'Choose one clear outcome and leave the rest of the day intentionally light.';
  }

  const waiting = status === 'locating' || status === 'loading';
  const locationLabel = snapshot
    ? (language === 'ne' ? 'स्थानीय क्षेत्र' : 'Local area')
    : (language === 'ne' ? 'मेरो स्थान' : 'Use my location');
  const locationDetail = waiting
    ? (language === 'ne' ? 'स्थान खोज्दै…' : 'Finding local brief…')
    : snapshot
      ? `${locationName(snapshot.timezone)} · ${language === 'ne' ? 'प्रत्यक्ष जानकारी' : 'live brief'}`
      : status === 'unavailable'
        ? (language === 'ne' ? 'अनुमति आवश्यक' : 'Location permission needed')
        : (language === 'ne' ? 'मौसम र दिनको उज्यालो' : 'Weather and daylight');

  return <section className={`today-live-hero ${showGreeting ? 'is-greeting' : 'is-live'}`} aria-live="polite">
    <span className="today-hero-glow" aria-hidden="true" />
    {showGreeting ? <div className="today-greeting-stage">
      <p className="eyebrow">{todayLabel} · {displayedDate}</p>
      <h1>{greetingLabel}, {displayName}.</h1>
      <p>{focusLabel}</p>
      <span className="greeting-progress" aria-hidden="true"><i /></span>
    </div> : <div className="today-brief-stage">
      <header>
        <div>
          <p className="eyebrow">{todayLabel} · {displayedDate}</p>
          <h1>{briefTitle}</h1>
          <p>{briefBody}</p>
        </div>
        <button className="local-brief-location" type="button" disabled={waiting} onClick={requestLocalWeather}>
          <span aria-hidden="true">⌖</span>
          <span><strong>{locationLabel}</strong><small>{locationDetail}</small></span>
        </button>
      </header>
      <div className="today-brief-cards">
        <article>
          <span aria-hidden="true">{presentation?.icon ?? '🌤️'}</span>
          <small>{language === 'ne' ? 'मौसम' : 'Weather'}</small>
          <strong>{snapshot ? `${Math.round(snapshot.temperature)}°C` : (language === 'ne' ? 'स्थानीय' : 'Local')}</strong>
          <em>{presentation?.label ?? (language === 'ne' ? 'स्थान सक्षम गर्नुहोस्' : 'Enable location')}</em>
        </article>
        <article>
          <span aria-hidden="true">◷</span>
          <small>{locationName(timezone)}</small>
          <strong>{localTime}</strong>
          <em>{language === 'ne' ? 'स्थानीय समय' : 'Local time'}</em>
        </article>
        <article>
          <span aria-hidden="true">☀</span>
          <small>{language === 'ne' ? 'सूर्यास्त' : 'Sunset'}</small>
          <strong>{solarTime(snapshot?.sunset ?? null, language)}</strong>
          <em>{snapshot ? 'Open-Meteo' : (language === 'ne' ? 'स्थान आवश्यक' : 'Location needed')}</em>
        </article>
        <article>
          <span aria-hidden="true">✦</span>
          <small>{language === 'ne' ? 'अर्को योजना' : 'Up next'}</small>
          <strong>{nextEventTime ?? formatDuration(freeMinutes)}</strong>
          <em>{nextEvent?.title ?? (language === 'ne' ? 'खाली समय' : 'Open time')}</em>
        </article>
      </div>
    </div>}
  </section>;
}
