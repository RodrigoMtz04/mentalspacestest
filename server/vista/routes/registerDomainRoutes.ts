import type { Express, Router } from "express";
import { registerRoomRoutes } from "./rooms.routes";
import { registerBookingRoutes } from "./bookings.routes";
import { registerUserRoutes } from "./users.routes";
import { registerPaymentRoutes } from "./payments.routes";
import { registerConfigRoutes } from "./config.routes";
import { registerLocationRoutes } from "./locations.routes";
import { registerLogsRoutes } from "./logs.routes";
import { registerSubscriptionRoutes } from "./subscription.routes";
import { registerHealthRoutes } from "./health.routes";
import { registerAccountRoutes } from "./account.routes";

export async function registerDomainRoutes(router: Router, app: Express): Promise<void> {
  registerHealthRoutes(router);
  registerRoomRoutes(router);
  registerBookingRoutes(router);
  registerUserRoutes(router);
  registerPaymentRoutes(router, app);
  registerConfigRoutes(router);
  registerLocationRoutes(router);
  registerLogsRoutes(router);
  registerAccountRoutes(router);
  registerSubscriptionRoutes(router);
}
