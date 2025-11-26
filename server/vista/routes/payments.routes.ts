import type { Router, Express } from "express";
import { paymentStorage } from "../../negocio/storage/paymentStorage";
import { userStorage } from "../../negocio/storage/userStorage";
import { insertPaymentBookingSchema } from "@shared/schema";
import { asyncRoute, isAuthenticated, isAdmin } from "./middleware";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import Stripe from "stripe";
import type { User as AppUser } from "@shared/schema";
import { systemLogsStorage } from "../../negocio/storage/systemLogsStorage";

// Rutas relacionadas con pagos y Stripe (excepto webhook)
export function registerPaymentRoutes(router: Router, app: Express) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Webhook (usa app directamente para raw body)
  app.post('/api/payments/webhook', (stripe && webhookSecret) ? (require('express').raw({ type: 'application/json' })) : (req, res) => res.status(500).json({ message: 'Stripe no configurado' }), async (req, res) => {
    if (!stripe || !webhookSecret) return res.status(500).json({ message: 'Stripe no configurado' });
    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') return res.status(400).json({ message: 'Falta stripe-signature' });
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      return res.status(400).json({ message: 'Firma inválida', error: err.message });
    }
    try {
      const already = await paymentStorage.hasPaymentEvent(event.id);
      if (already) return res.status(200).json({ received: true, duplicate: true });
      await paymentStorage.recordPaymentEvent({
        eventId: event.id,
        paymentIntentId: (event.data.object as any)?.id ?? null,
        type: event.type,
        payload: JSON.stringify(event.data.object).slice(0, 4000),
      });
      if (event.type.startsWith('payment_intent.')) {
        const pi = event.data.object as Stripe.PaymentIntent;
        await paymentStorage.updateByPaymentIntentId(pi.id, { status: pi.status });
        if (pi.status === 'succeeded') {
          const metaUserId = pi.metadata?.userId ? parseInt(String(pi.metadata.userId), 10) : NaN;
          if (!isNaN(metaUserId)) {
            try {
              await userStorage.updateUser(metaUserId, { paymentStatus: 'active' as any, lastPaymentDate: new Date() as any, subscriptionEndDate: null as any } as any);
            } catch (e) { /* log error si aplica */ }
          }
        }
      } else if (event.type === 'charge.refunded' || event.type === 'charge.refund.updated') {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent ? String(charge.payment_intent) : null;
        if (paymentIntentId) await paymentStorage.updateByPaymentIntentId(paymentIntentId, { status: 'refunded' as any });
      }
      res.json({ received: true });
    } catch (e: any) {
      return res.status(500).json({ message: 'Error interno procesando webhook', error: e.message });
    }
  });

  // Crear PaymentIntent (Stripe)
  router.post('/payments/create-intent', isAuthenticated, asyncRoute(async (req, res) => {
    if (!stripe) return res.status(500).json({ message: 'Stripe no configurado en el servidor' });
    const { amount, currency, concept, bookingId, idempotencyKey } = req.body as any;
    const user = req.user as AppUser;
    const amountNumber = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!amountNumber || isNaN(amountNumber) || amountNumber <= 0) return res.status(400).json({ message: 'Monto inválido' });
    const curr = (currency || 'mxn').toLowerCase();
    const allowed = new Set(['mxn','usd','eur']);
    if (!allowed.has(curr)) return res.status(400).json({ message: 'Moneda no permitida' });
    const idemKey = idempotencyKey || `pi_${user.id}_${bookingId ?? 'na'}_${amountNumber}_${Date.now()}`;
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amountNumber * 100),
      currency: curr,
      automatic_payment_methods: { enabled: true },
      metadata: { userId: String(user.id), bookingId: bookingId ? String(bookingId) : '', concept: concept || 'Pago' }
    }, { idempotencyKey: idemKey });
    const existing = await paymentStorage.getByPaymentIntentId(intent.id);
    if (!existing) {
      await paymentStorage.createStripePaymentRecord({
        userId: user.id,
        amount: amountNumber.toFixed(2),
        concept: concept || 'Pago',
        bookingId: bookingId ?? null,
        currency: curr,
        paymentIntentId: intent.id,
        idempotencyKey: idemKey,
        status: intent.status,
        method: 'stripe',
      });
    }
    res.status(201).json({ clientSecret: intent.client_secret, paymentIntentId: intent.id, status: intent.status, amount: intent.amount, currency: intent.currency, idempotencyKey: idemKey });
  }));

  // Recuperar PaymentIntent
  router.get('/payments/intent/:id', isAuthenticated, asyncRoute(async (req, res) => {
    if (!stripe) return res.status(500).json({ message: 'Stripe no configurado' });
    const id = req.params.id;
    const intent = await stripe.paymentIntents.retrieve(id);
    await paymentStorage.updateByPaymentIntentId(id, { status: intent.status });
    if (intent.status === 'succeeded') {
      const metaUserId = intent.metadata?.userId ? parseInt(String(intent.metadata.userId), 10) : NaN;
      if (!isNaN(metaUserId)) {
        try { await userStorage.updateUser(metaUserId, { paymentStatus: 'active' as any, lastPaymentDate: new Date() as any, subscriptionEndDate: null as any } as any); } catch {}
      }
    }
    res.json({ id, status: intent.status, amount: intent.amount, currency: intent.currency, clientSecret: intent.client_secret });
  }));

  // Crear pago manual (booking/payment)
  router.post('/payment', asyncRoute(async (req, res) => {
    try {
      const validated = insertPaymentBookingSchema.parse(req.body);
      const user = await userStorage.getUser(validated.userId);
      if (!user) return res.status(403).json({ message: 'Usuario inexistente' });
      const amountDecimal = parseFloat(validated.amount);
      if (isNaN(amountDecimal) || amountDecimal <= 0) return res.status(400).json({ message: 'Monto inválido' });
      const payment = await paymentStorage.createPayment(validated);
      res.status(201).json(payment);
    } catch (e) {
      if (e instanceof ZodError) return res.status(400).json({ message: 'Invalid payment data', errors: fromZodError(e).message });
      throw e;
    }
  }));

  // Descuento por porcentaje sobre un pago
  router.post('/payment/:paymentId/discount', asyncRoute(async (req, res) => {
    const paymentId = parseInt(req.params.paymentId);
    const { percentage } = req.body as { percentage?: number };
    if (isNaN(paymentId)) return res.status(400).json({ message: 'ID de pago inválido' });
    if (percentage == null || isNaN(percentage)) return res.status(400).json({ message: 'Porcentaje inválido' });
    const updated = await paymentStorage.paymentPercentageDiscount(paymentId, percentage);
    res.json({ message: `Descuento del ${percentage}% aplicado correctamente.`, payment: updated });
  }));

  // Listado de pagos (admin) con CSV opcional
  router.get('/payments', isAdmin, asyncRoute(async (req, res) => {
    const q = req.query as any;
    const wantsCsv = String(q.format || '').toLowerCase() === 'csv' || String(req.headers['accept'] || '').includes('text/csv');
    const page = Math.max(1, parseInt(q.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize || '20', 10)));
    const parsed = {
      userId: q.user ? parseInt(String(q.user), 10) : undefined,
      status: q.status ? String(q.status) : undefined,
      dateFrom: q.dateFrom ? new Date(String(q.dateFrom)) : undefined,
      dateTo: q.dateTo ? new Date(String(q.dateTo)) : undefined,
      page,
      pageSize,
    };
    if (parsed.dateFrom && parsed.dateTo && parsed.dateFrom > parsed.dateTo) return res.status(400).json({ message: 'dateFrom no puede ser mayor que dateTo' });
    const { rows, total } = await paymentStorage.listPayments(parsed);

    const sanitize = rows.map((r: any) => ({
      id: r.id,
      createdAt: r.createdAt,
      payment_date: r.payment_date ?? null,
      userId: r.userId,
      userFullName: r.user_full_name ?? null,
      email: r.user_email ?? null,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      method: r.method,
      concept: String(r.concept || '').slice(0,500),
      paymentIntentId: r.paymentIntentId,
    }));

    try { await systemLogsStorage.createLog({ severity: 'INFO', message: `Listado pagos total=${total}`, endpoint: '/api/payments', userId: (req.user as any)?.id } as any); } catch {}

    if (wantsCsv) {
      const headers = ['id','createdAt','payment_date','userId','userFullName','email','amount','currency','status','method','concept','paymentIntentId'];
      const escapeCsv = (val: any) => {
        if (val == null) return ''; let s = String(val); if (["=","+","-","@"].includes(s[0])) s = `'${s}`; if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g,'""') + '"'; return s; };
      const lines = [headers.join(',')];
      for (const r of sanitize) lines.push(headers.map(h => escapeCsv((r as any)[h])).join(','));
      res.setHeader('Content-Type','text/csv; charset=utf-8'); res.setHeader('Content-Disposition','attachment; filename="payments.csv"');
      return res.send(lines.join('\r\n'));
    }

    res.json({ data: sanitize, total, page, pageSize });
  }));

  // Detalle de pago (admin)
  router.get('/payments/:id', isAdmin, asyncRoute(async (req, res) => {
    const id = parseInt(req.params.id,10); if (isNaN(id)) return res.status(400).json({ message: 'ID inválido' });
    const pay = await paymentStorage.getPayment(id); if (!pay) return res.status(404).json({ message: 'Pago no encontrado' });
    let intent: Stripe.Response<Stripe.PaymentIntent> | undefined;
    if (stripe && pay.paymentIntentId) { try { intent = await stripe.paymentIntents.retrieve(pay.paymentIntentId); } catch {} }
    const rawCharges: any[] = (intent as any)?.charges?.data ?? [];
    res.json({ ...pay, clientSecret: intent?.client_secret ? '***' : null, charges: rawCharges.map(c => ({ id: c.id, amount: c.amount, status: c.status })) });
  }));

  // Receipt
  router.get('/payments/:id/receipt', isAdmin, asyncRoute(async (req, res) => {
    if (!stripe) return res.status(500).json({ message: 'Stripe no configurado' });
    const id = parseInt(req.params.id,10); if (isNaN(id)) return res.status(400).json({ message: 'ID inválido' });
    const pay = await paymentStorage.getPayment(id); if (!pay || !pay.paymentIntentId) return res.status(404).json({ message: 'No hay PaymentIntent asociado' });
    const intent = await stripe.paymentIntents.retrieve(pay.paymentIntentId, { expand: ['latest_charge'] as any });
    let receipt: string | null = null;
    if (intent.latest_charge && typeof intent.latest_charge !== 'string') receipt = (intent.latest_charge as any).receipt_url ?? null;
    if (!receipt && (intent as any)?.charges?.data?.length) receipt = (intent as any).charges.data[0]?.receipt_url ?? null;
    if (!receipt) return res.status(404).json({ message: 'No hay recibo para este pago' });
    res.json({ url: receipt });
  }));
}
