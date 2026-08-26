import { useLocalWeather, weatherPresentation } from '../hooks/useLocalWeather';
import type { Language } from '../types/domain';

export function WeatherChip({ language }: { language: Language }) {
  const { requestLocalWeather, snapshot, status } = useLocalWeather();

  const presentation = snapshot ? weatherPresentation(snapshot.code, snapshot.isDay, language) : null;
  const waiting = status === 'locating' || status === 'loading';
  const fallbackLabel = status === 'unavailable'
    ? (language === 'ne' ? 'स्थान अनुमति चाहिन्छ' : 'Location needed')
    : waiting
      ? (language === 'ne' ? 'मौसम खोज्दै…' : 'Finding weather…')
      : (language === 'ne' ? 'स्थानीय मौसम हेर्नुहोस्' : 'Tap for local weather');

  return (
    <button className="calendar-weather" type="button" disabled={waiting} onClick={requestLocalWeather} title={snapshot ? `Feels like ${Math.round(snapshot.apparentTemperature)}°C · Weather data by Open-Meteo` : fallbackLabel}>
      <span className="calendar-weather-icon" aria-hidden="true">{presentation?.icon ?? '🌤️'}</span>
      <span>
        <strong>{snapshot ? `${Math.round(snapshot.temperature)}°C` : (language === 'ne' ? 'मौसम' : 'Weather')}</strong>
        <small>{presentation ? `${presentation.label} · Open-Meteo` : fallbackLabel}</small>
      </span>
    </button>
  );
}
