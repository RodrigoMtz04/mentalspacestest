import { useEffect, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';

interface Options {
  timeoutMs?: number;
  enabled: boolean;
}

// Hook para detectar inactividad y renovar actividad de sesión
export function useIdleSession({ timeoutMs = 30 * 60 * 1000, enabled }: Options) {
  const timerRef = useRef<number | null>(null);
  const lastTouchRef = useRef<number>(0);
  const INCREMENTAL_TOUCH_INTERVAL = 60 * 1000; // tocar backend cada 60s como máximo

  async function touch() {
    try {
      await fetch('/api/session/touch', { method: 'POST', credentials: 'include' });
    } catch (e) {
      // ignorar
    }
  }

  async function forceInactiveLogout() {
    try {
      await fetch('/api/logout/inactive', { method: 'POST', credentials: 'include' });
    } catch {}
    // Limpiar cache usuario
    queryClient.setQueryData(['\/api\/user'], null);
    alert('Tu sesión ha finalizado por inactividad');
    if (window.location.pathname !== '/auth') {
      window.location.href = '/auth';
    }
  }

  function resetTimer() {
    if (!enabled) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      forceInactiveLogout();
    }, timeoutMs);
    const now = Date.now();
    if (now - lastTouchRef.current > INCREMENTAL_TOUCH_INTERVAL) {
      lastTouchRef.current = now;
      void touch();
    }
  }

  useEffect(() => {
    if (!enabled) return;
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handler = () => resetTimer();
    events.forEach(ev => window.addEventListener(ev, handler));
    resetTimer();
    return () => {
      events.forEach(ev => window.removeEventListener(ev, handler));
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, timeoutMs]);
}

