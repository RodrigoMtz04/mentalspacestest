import React from "react";

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Enviar a backend
    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        severity: "CRITICAL",
        message: error.message,
        stack: error.stack,
        endpoint: "/frontend/error-boundary",
        url: window.location.href,
        userAgent: navigator.userAgent,
        componentStack: errorInfo.componentStack,
      }),
    }).catch(() => {/* noop */});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <h1>Ha ocurrido un error</h1>
          <p>Por favor, recarga la página o intenta más tarde.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

