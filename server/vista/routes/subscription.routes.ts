import type { Router } from "express";
import { asyncRoute, isAuthenticated } from "./middleware";
import { userStorage } from "../../negocio/storage/userStorage";
import { paymentStorage } from "../../negocio/storage/paymentStorage";
import type { User as AppUser } from "@shared/schema";

// Rutas relacionadas con la suscripcin de usuarios
export function registerSubscriptionRoutes(router: Router) {
  // Cancelar suscripción (al final del ciclo)
  router.post('/subscription/cancel', isAuthenticated, asyncRoute(async (req, res) => {
    const user = req.user as AppUser;
    const endDate = new Date(); endDate.setDate(endDate.getDate() + 30);
    const updated = await userStorage.updateUser(user.id, { paymentStatus: 'inactive' as any, subscriptionEndDate: endDate as any } as any);
    if (!updated) return res.status(500).json({ message: 'No se pudo cancelar la suscripción' });
    const { password, ...safe } = updated; res.json({ ok: true, subscriptionEndDate: endDate.toISOString(), user: safe });
  }));

  // Resumen de suscripción
  router.get('/subscription/summary', isAuthenticated, asyncRoute(async (req, res) => {
    const authUser = req.user as AppUser;
    const dbUser = await userStorage.getUser(authUser.id);
    const baseStatus = (dbUser?.paymentStatus as any) || 'inactive';
    const lastPayment = await paymentStorage.getLastSucceededPaymentForUser(authUser.id);
    const paymentStatus: 'active' | 'inactive' = lastPayment ? 'active' : 'inactive';
    const lastPaymentDate = (dbUser?.lastPaymentDate as any) || (lastPayment?.createdAt as any) || null;
    let nextPaymentDate: string | null = null;
    if (paymentStatus === 'active' && lastPaymentDate) {
      const next = new Date(lastPaymentDate as any); next.setDate(next.getDate() + 30); nextPaymentDate = next.toISOString();
    }
    let planName: string | undefined; let planPrice: number | undefined;
    if (lastPayment) {
      const concept = String(lastPayment.concept || '');
      const rx = /suscripci[oó]n\s*-\s*(.+)/i; const m = concept.match(rx);
      planName = (m ? m[1] : concept).trim();
      const parsed = parseFloat(String(lastPayment.amount)); if (!isNaN(parsed)) planPrice = parsed;
    }
    res.json({ paymentStatus, lastPaymentDate: lastPaymentDate ? new Date(lastPaymentDate as any).toISOString() : null, subscriptionEndDate: dbUser?.subscriptionEndDate ? new Date(dbUser.subscriptionEndDate as any).toISOString() : null, nextPaymentDate, plan: lastPayment && planName ? { name: planName, price: planPrice } : null });
  }));
}
