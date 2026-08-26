import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../types/domain';

const WEATHER_CACHE_KEY = 'aayoj.weather.v1';
const WEATHER_CACHE_MS = 15 * 60_000;

interface WeatherSnapshot {
  apparentTemperature: number;
  code: number;
  isDay: boolean;
  latitude: number;
  longitude: number;
  temperature: number;
  updatedAt: number;
}

type WeatherStatus = 'idle' | 'locating' | 'loading' | 'ready' | 'unavailable';

function readCachedWeather(): WeatherSnapshot | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(WEATHER_CACHE_KEY) ?? 'null') as Partial<WeatherSnapshot> | null;
    if (!value
      || typeof value.apparentTemperature !== 'number' || !Number.isFinite(value.apparentTemperature)
      || typeof value.code !== 'number' || !Number.isFinite(value.code)
      || typeof value.isDay !== 'boolean'
      || typeof value.latitude !== 'number' || !Number.isFinite(value.latitude)
      || typeof value.longitude !== 'number' || !Number.isFinite(value.longitude)
      || typeof value.temperature !== 'number' || !Number.isFinite(value.temperature)
      || typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt)) return null;
    return value as WeatherSnapshot;
  } catch {
    return null;
  }
}

function cacheWeather(snapshot: WeatherSnapshot): void {
  try {
    window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Weather still works when private browsing blocks local storage.
  }
}

function weatherPresentation(code: number, isDay: boolean, language: Language): { icon: string; label: string } {
  if (code === 0) return { icon: isDay ? '☀️' : '🌙', label: language === 'ne' ? 'सफा' : 'Clear' };
  if (code <= 2) return { icon: isDay ? '🌤️' : '☁️', label: language === 'ne' ? 'आंशिक बादल' : 'Partly cloudy' };
  if (code === 3) return { icon: '☁️', label: language === 'ne' ? 'बादल' : 'Cloudy' };
  if (code === 45 || code === 48) return { icon: '🌫️', label: language === 'ne' ? 'कुहिरो' : 'Foggy' };
  if (code >= 95) return { icon: '⛈️', label: language === 'ne' ? 'मेघगर्जन' : 'Thunderstorm' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: '🌨️', label: language === 'ne' ? 'हिमपात' : 'Snow' };
  if (code >= 51 && code <= 82) return { icon: '🌦️', label: language === 'ne' ? 'वर्षा' : 'Rain' };
  return { icon: '🌤️', label: language === 'ne' ? 'मौसम' : 'Weather' };
}

export function WeatherChip({ language }: { language: Language }) {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [status, setStatus] = useState<WeatherStatus>('idle');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const fetchWeather = useCallback(async (latitude: number, longitude: number) => {
    if (!mounted.current) return;
    setStatus('loading');
    try {
      const query = new URLSearchParams({
        current: 'temperature_2m,apparent_temperature,weather_code,is_day',
        latitude: `${latitude}`,
        longitude: `${longitude}`,
        timezone: 'auto',
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
      if (!response.ok) throw new Error('Weather request failed.');
      const payload = await response.json() as { current?: Record<string, unknown> };
      const temperature = Number(payload.current?.temperature_2m);
      const apparentTemperature = Number(payload.current?.apparent_temperature ?? temperature);
      const code = Number(payload.current?.weather_code);
      if (![temperature, apparentTemperature, code].every(Number.isFinite)) throw new Error('Weather response was incomplete.');
      const next: WeatherSnapshot = {
        apparentTemperature,
        code,
        isDay: Number(payload.current?.is_day) !== 0,
        latitude,
        longitude,
        temperature,
        updatedAt: Date.now(),
      };
      cacheWeather(next);
      if (mounted.current) {
        setSnapshot(next);
        setStatus('ready');
      }
    } catch {
      if (mounted.current) setStatus('unavailable');
    }
  }, []);

  useEffect(() => {
    const cached = readCachedWeather();
    if (!cached) return;
    setSnapshot(cached);
    if (Date.now() - cached.updatedAt < WEATHER_CACHE_MS) setStatus('ready');
    else void fetchWeather(cached.latitude, cached.longitude);
  }, [fetchWeather]);

  const requestLocalWeather = () => {
    if (status === 'locating' || status === 'loading') return;
    if (snapshot) {
      void fetchWeather(snapshot.latitude, snapshot.longitude);
      return;
    }
    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Math.round(position.coords.latitude * 100) / 100;
        const longitude = Math.round(position.coords.longitude * 100) / 100;
        void fetchWeather(latitude, longitude);
      },
      () => { if (mounted.current) setStatus('unavailable'); },
      { enableHighAccuracy: false, maximumAge: 30 * 60_000, timeout: 10_000 },
    );
  };

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
