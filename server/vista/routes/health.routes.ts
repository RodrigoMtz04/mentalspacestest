// Ruta de health check
export function registerHealthRoutes(router: import("express").Router) {
  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
}

