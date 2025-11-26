import type { Router } from "express";
import { locationStorage } from "../../negocio/storage/locationStorage";
import { locationAvailabilityStorage } from "../../negocio/storage/locationAvailabilityStorage";
import { insertLocationSchema, insertLocationAvailabilitySchema, insertLocationAvailabilityClientSchema } from "@shared/schema";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import { asyncRoute, isAdmin } from "./middleware";

// Rutas relacionadas con sedes (locations) y su disponibilidad
export function registerLocationRoutes(router: Router) {
  // POST /api/locations - crear sede con disponibilidad inicial
  router.post('/locations', isAdmin, asyncRoute(async (req, res) => {
    try {
      const validatedData = insertLocationSchema.parse(req.body);
      const location = await locationStorage.createLocation(validatedData);
      const availabilityInput = req.body.availability ?? [];
      const validatedAvailability = z.array(insertLocationAvailabilityClientSchema).parse(availabilityInput);
      for (const day of validatedAvailability) {
        if (day.closeTime) {
          await locationAvailabilityStorage.createLocationAvailability({
            locationId: location.id,
            dayOfWeek: day.dayOfWeek,
            openTime: day.openTime,
            closeTime: day.closeTime,
          });
        }
      }
      res.status(201).json(location);
    } catch (e) {
      if (e instanceof ZodError) return res.status(400).json({ message: 'Invalid location data', errors: fromZodError(e).message });
      throw e;
    }
  }));

  // GET /api/locations - listado completo
  router.get('/locations', asyncRoute(async (_req, res) => {
    const locations = await locationStorage.getAllLocations();
    res.json(locations);
  }));

  // GET /api/locations/:id/availability - disponibilidad de sede
  router.get('/locations/:id/availability', asyncRoute(async (req, res) => {
    const locationId = Number(req.params.id);
    if (isNaN(locationId)) return res.status(400).json({ message: 'Location ID must be a number' });
    const availability = await locationAvailabilityStorage.getLocationAvailability(locationId);
    res.json(availability);
  }));

  // POST /api/location-availability - crear horario para sede
  router.post('/location-availability', isAdmin, asyncRoute(async (req, res) => {
    try {
      const validated = insertLocationAvailabilitySchema.parse(req.body);
      const location = await locationStorage.getLocation(validated.locationId);
      if (!location) return res.status(404).json({ message: 'Location not found' });
      const existing = await locationAvailabilityStorage.getAvailabilityByLocationAndDay(validated.locationId, validated.dayOfWeek);
      if (existing) return res.status(409).json({ message: 'Ya existe un horario para este día en la sede' });
      const created = await locationAvailabilityStorage.createLocationAvailability(validated);
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof ZodError) return res.status(400).json({ message: 'Invalid location data', errors: fromZodError(e).message });
      throw e;
    }
  }));
}
