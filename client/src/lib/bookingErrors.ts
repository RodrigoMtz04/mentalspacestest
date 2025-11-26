// Manejo centralizado de errores de reserva relacionados con documentación faltante.
export function handleBookingError(
  error: Error,
  toastFn: (opts: { title: any; description: any; variant?: 'default' | 'destructive' | null }) => void
) {
  const docMsgPrefix = '403: Debes tener documentación aprobada';
  if (error.message.startsWith(docMsgPrefix)) {
    toastFn({
      title: 'Documentación requerida',
      description: 'Tu documentación aún no está aprobada. Debe ser validada por un administrador antes de reservar.',
    });
    return;
  }
  toastFn({ title: 'Error', description: error.message, variant: 'destructive' });
}

export async function createBookingSafe(
  bookingData: any,
  toastFn: (opts: { title: any; description: any; variant?: 'default' | 'destructive' | null }) => void
): Promise<any | null> {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(bookingData),
  });
  if (res.status === 403) {
    try {
      const data = await res.json();
      if (data?.documentationRequired) {
        toastFn({
          title: 'Documentación requerida',
          description: 'Tu documentación aún no está aprobada. Debe ser validada por un administrador antes de reservar.'
        });
        return null;
      }
      // Otros 403
      toastFn({ title: 'No autorizado', description: data?.message || 'No autorizado para crear la reserva', variant: 'destructive' });
      return null;
    } catch {
      toastFn({ title: 'No autorizado', description: 'No autorizado para crear la reserva', variant: 'destructive' });
      return null;
    }
  }
  if (!res.ok) {
    let msg = 'Error al crear la reserva';
    try { const j = await res.json(); msg = j?.message || msg; } catch {}
    toastFn({ title: 'Error', description: msg, variant: 'destructive' });
    return null;
  }
  return await res.json();
}
