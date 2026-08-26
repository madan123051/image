import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../types/domain';

const WEATHER_CACHE_KEY = 'aayoj.weather.v2';
const LEGACY_WEATHER_CACHE_KEY = 'aayoj.weather.v1';
const WEATHER_CACHE_MS = 15 * 60_000;

export interface LocalWeatherSnapshot {
  apparentTemperature: number;
  code: number;
  isDay: boolean;
  latitude: number;
  longitude: number;
  sunrise: string | null;
  sunset: string | null;
  temperature: number;
  timezone: string;
  updatedAt: number;
}

export type LocalWeatherStatus = 'idle' | 'locating' | 'loading' | 'ready' | 'unavailable';

interface UseLocalWeatherOptions {
  autoLocate?: boolean;
}

function readCachedWeather(): LocalWeatherSnapshot | null {
  try {
    const currentCache = window.localStorage.getItem(WEATHER_CACHE_KEY);
    const value = JSON.parse(currentCache ?? window.localStorage.getItem(LEGACY_WEATHER_CACHE_KEY) ?? 'null') as Partial<LocalWeatherSnapshot> | null;
    if (!value
      || typeof value.apparentTemperature !== 'number' || !Number.isFinite(value.apparentTemperature)
      || typeof value.code !== 'number' || !Number.isFinite(value.code)
      || typeof value.isDay !== 'boolean'
      || typeof value.latitude !== 'number' || !Number.isFinite(value.latitude)
      || typeof value.longitude !== 'number' || !Number.isFinite(value.longitude)
      || typeof value.temperature !== 'number' || !Number.isFinite(value.temperature)
      || typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt)) return null;
    return {
      ...value,
      sunrise: typeof value.sunrise === 'string' ? value.sunrise : null,
      sunset: typeof value.sunset === 'string' ? value.sunset : null,
      timezone: typeof value.timezone === 'string' ? value.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone,
      updatedAt: currentCache ? value.updatedAt : 0,
    } as LocalWeatherSnapshot;
  } catch {
    return null;
  }
}

function cacheWeather(snapshot: LocalWeatherSnapshot): void {
  try {
    window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Weather still works when private browsing blocks local storage.
  }
}

export function weatherPresentation(code: number, isDay: boolean, language: Language): { icon: string; label: string } {
  if (code === 0) return { icon: isDay ? '☀️' : '🌙', label: language === 'ne' ? 'सफा' : 'Clear' };
  if (code <= 2) return { icon: isDay ? '🌤️' : '☁️', label: language === 'ne' ? 'आंशिक बादल' : 'Partly cloudy' };
  if (code === 3) return { icon: '☁️', label: language === 'ne' ? 'बादल' : 'Cloudy' };
  if (code === 45 || code === 48) return { icon: '🌫️', label: language === 'ne' ? 'कुहिरो' : 'Foggy' };
  if (code >= 95) return { icon: '⛈️', label: language === 'ne' ? 'मेघगर्जन' : 'Thunderstorm' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: '🌨️', label: language === 'ne' ? 'हिमपात' : 'Snow' };
  if (code >= 51 && code <= 82) return { icon: '🌦️', label: language === 'ne' ? 'वर्षा' : 'Rain' };
  return { icon: '🌤️', label: language === 'ne' ? 'मौसम' : 'Weather' };
}

export function useLocalWeather({ autoLocate = false }: UseLocalWeatherOptions = {}) {
  const [snapshot, setSnapshot] = useState<LocalWeatherSnapshot | null>(readCachedWeather);
  const [status, setStatus] = useState<LocalWeatherStatus>(() => readCachedWeather() ? 'ready' : 'idle');
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
        daily: 'sunrise,sunset',
        forecast_days: '1',
        latitude: `${latitude}`,
        longitude: `${longitude}`,
        timezone: 'auto',
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
      if (!response.ok) throw new Error('Weather request failed.');
      const payload = await response.json() as {
        current?: Record<string, unknown>;
        daily?: { sunrise?: unknown[]; sunset?: unknown[] };
        timezone?: unknown;
      };
      const temperature = Number(payload.current?.temperature_2m);
      const apparentTemperature = Number(payload.current?.apparent_temperature ?? temperature);
      const code = Number(payload.current?.weather_code);
      if (![temperature, apparentTemperature, code].every(Number.isFinite)) throw new Error('Weather response was incomplete.');
      const next: LocalWeatherSnapshot = {
        apparentTemperature,
        code,
        isDay: Number(payload.current?.is_day) !== 0,
        latitude,
        longitude,
        sunrise: typeof payload.daily?.sunrise?.[0] === 'string' ? payload.daily.sunrise[0] : null,
        sunset: typeof payload.daily?.sunset?.[0] === 'string' ? payload.daily.sunset[0] : null,
        temperature,
        timezone: typeof payload.timezone === 'string' ? payload.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone,
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

  const locateCurrent = useCallback(() => {
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
  }, [fetchWeather]);

  useEffect(() => {
    if (!snapshot || Date.now() - snapshot.updatedAt < WEATHER_CACHE_MS) return;
    void fetchWeather(snapshot.latitude, snapshot.longitude);
  }, [fetchWeather, snapshot]);

  useEffect(() => {
    if (!autoLocate || snapshot || !navigator.permissions) return;
    let cancelled = false;
    void navigator.permissions.query({ name: 'geolocation' }).then((permission) => {
      if (!cancelled && permission.state === 'granted') locateCurrent();
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [autoLocate, locateCurrent, snapshot]);

  const requestLocalWeather = useCallback(() => {
    if (status === 'locating' || status === 'loading') return;
    if (snapshot) {
      void fetchWeather(snapshot.latitude, snapshot.longitude);
      return;
    }
    locateCurrent();
  }, [fetchWeather, locateCurrent, snapshot, status]);

  return { requestLocalWeather, snapshot, status };
}
