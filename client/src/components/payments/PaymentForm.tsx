import { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

function PaymentFormInner({ paymentIntentId, onSucceeded, onFinished }: { paymentIntentId: string | null; onSucceeded?: (info: { paymentIntentId: string; status: string }) => void; onFinished?: (info: { paymentIntentId?: string; status: string }) => void; }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/my-payments',
      },
      redirect: 'if_required',
    });
    setLoading(false);

    if (result.error) {
      const t = result.error?.type as string | undefined;
      const msg = result.error?.message ?? (t === 'canceled' ? 'Pago cancelado' : 'Error al procesar el pago');
      toast({ title: t === 'canceled' ? 'Pago cancelado' : 'Error en el pago', description: msg, variant: 'destructive' });
      onFinished?.({ status: 'failed' });
      return;
    }

    const piId = result.paymentIntent?.id || paymentIntentId;
    if (piId) {
      // Sincronizar estado en backend
      try {
        const res = await fetch(`/api/payments/intent/${piId}`, { credentials: 'include' });
        const data = await res.json();
        const status = data.status as string;
        if (status === 'succeeded') {
          toast({ title: 'Pago exitoso', description: 'Tu pago fue confirmado correctamente.' });
          onSucceeded?.({ paymentIntentId: piId, status });
          onFinished?.({ paymentIntentId: piId, status });
          return;
        } else if (status === 'processing') {
          toast({ title: 'Pago en proceso', description: 'Estamos confirmando tu pago.' });
        } else if (status === 'canceled') {
          toast({ title: 'Pago cancelado', description: 'No se completó el cargo.' });
        } else {
          toast({ title: `Estado: ${status}`, description: 'Revisa tu método de pago e intenta de nuevo.' });
        }
        onFinished?.({ paymentIntentId: piId, status });
      } catch (e: any) {
        toast({ title: 'Pago procesado', description: 'El estado será actualizado en breve.' });
        onFinished?.({ paymentIntentId: piId, status: 'unknown' });
      }
    } else {
      toast({ title: 'Pago procesado', description: 'El estado será actualizado en breve.' });
      onFinished?.({ status: 'unknown' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md border bg-card p-3">
        <PaymentElement />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={!stripe || loading}>
          {loading ? 'Procesando…' : 'Pagar ahora'}
        </Button>
      </div>
    </form>
  );
}

interface PaymentFormProps {
  amount: number; // en unidades mayores (ej. MXN)
  currency?: string;
  concept?: string;
  bookingId?: number;
  publishableKey: string;
  onSucceeded?: (info: { paymentIntentId: string; status: string }) => void;
  onFinished?: (info: { paymentIntentId?: string; status: string }) => void;
}

export default function PaymentForm({ amount, currency = 'mxn', concept = 'Pago', bookingId, publishableKey, onSucceeded, onFinished }: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  // Detectar modo oscuro (clase 'dark' en <html>) y reaccionar a cambios
  const getIsDark = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [isDark, setIsDark] = useState<boolean>(getIsDark());
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(getIsDark()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Apariencia Stripe Elements adaptada a escala de grises en dark
  const appearance = useMemo(() => {
    const baseVarsLight = {
      colorPrimary: '#111827',
      colorBackground: '#ffffff',
      colorText: '#111827',
      colorDanger: '#dc2626',
      colorSuccess: '#16a34a',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
      borderRadius: '8px',
    } as const;
    const baseVarsDark = {
      colorPrimary: '#e5e7eb', // gris claro
      colorBackground: '#111213',
      colorText: '#e5e7eb',
      colorDanger: '#f87171',
      colorSuccess: '#34d399',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
      borderRadius: '8px',
    } as const;

    const rulesCommon: any = {
      '.Input': {
        backgroundColor: isDark ? '#1a1b1d' : '#ffffff',
        color: isDark ? '#e5e7eb' : '#111827',
        border: `1px solid ${isDark ? '#2a2c2f' : '#e5e7eb'}`,
      },
      '.Input:focus': {
        borderColor: isDark ? '#6b7280' : '#111827',
        boxShadow: 'none',
      },
      '.Tab, .Pill': {
        backgroundColor: isDark ? '#1a1b1d' : '#f8fafc',
        color: isDark ? '#e5e7eb' : '#111827',
        border: `1px solid ${isDark ? '#2a2c2f' : '#e5e7eb'}`,
      },
      '.Label': {
        color: isDark ? '#cfd3d8' : '#374151',
      },
      '.HelpText': {
        color: isDark ? '#9ca3af' : '#6b7280',
      },
      'input::placeholder, textarea::placeholder': {
        color: isDark ? '#9ca3af' : '#9ca3af',
      },
      '.CodeInput': {
        backgroundColor: isDark ? '#1a1b1d' : '#ffffff',
      },
      '.Dropdown, select, .Select': {
        backgroundColor: isDark ? '#1a1b1d' : '#ffffff',
        color: isDark ? '#e5e7eb' : '#111827',
        border: `1px solid ${isDark ? '#2a2c2f' : '#e5e7eb'}`,
      },
      '.Input--invalid': {
        borderColor: '#f87171',
      },
    };

    return {
      theme: isDark ? 'night' : 'stripe',
      variables: isDark ? baseVarsDark : baseVarsLight,
      rules: rulesCommon,
      labels: 'floating',
    } as const;
  }, [isDark]);

  useEffect(() => {
    let aborted = false;
    const run = async () => {
      setError(null);
      try {
        const res = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ amount, currency, concept, bookingId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = (data && data.message) ? data.message : `Error ${res.status}`;
          if (!aborted) setError(msg);
          return;
        }
        if (!aborted) {
          setClientSecret(data.clientSecret);
          setPaymentIntentId(data.paymentIntentId || null);
        }
      } catch (e: any) {
        if (!aborted) setError(e.message || 'No se pudo iniciar el pago');
      }
    };
    run();
    return () => { aborted = true; };
  }, [amount, currency, concept, bookingId]);

  if (error) return <div className="text-red-600 dark:text-red-400">{error}</div>;
  if (!clientSecret) return <div className="text-muted-foreground">Preparando pago…</div>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance }} key={`stripe-${isDark ? 'dark' : 'light'}-${clientSecret}`}>
      <PaymentFormInner paymentIntentId={paymentIntentId} onSucceeded={onSucceeded} onFinished={onFinished} />
    </Elements>
  );
}
