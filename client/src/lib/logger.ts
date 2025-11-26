export function logClientError(data: {
  severity?: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  message: string;
  stack?: string;
  endpoint?: string;
  url?: string;
}) {
  try {
    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        severity: data.severity || "ERROR",
        message: data.message,
        stack: data.stack,
        endpoint: data.endpoint || "/frontend/runtime",
        url: data.url || window.location.href,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {});
  } catch (_) {}
}

export function registerClientErrorHandlers() {
  if ((window as any).__clientErrorHandlersRegistered) return;
  (window as any).__clientErrorHandlersRegistered = true;

  window.addEventListener("error", (event) => {
    const err = event.error || new Error(event.message || "Script error");
    logClientError({
      severity: "CRITICAL",
      message: err.message,
      stack: err.stack,
      endpoint: "/frontend/window.onerror",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason: any = event.reason;
    const message = typeof reason === "string" ? reason : reason?.message || "Unhandled rejection";
    const stack = typeof reason === "object" ? reason?.stack : undefined;
    logClientError({
      severity: "CRITICAL",
      message,
      stack,
      endpoint: "/frontend/unhandledrejection",
    });
  });
}
