import { Component, type ErrorInfo, type ReactNode } from "react";

const BASE = import.meta.env.BASE_URL || "/";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Verhindert weißen Bildschirm am unbeaufsichtigten Kiosk bei Render-Crashes. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Kiosk error boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-8 gap-6">
          <h1 className="font-serif text-[28px] font-semibold text-primary">Etwas ist schiefgelaufen</h1>
          <p className="text-muted-foreground text-[15px] max-w-sm leading-relaxed">
            Bitte starte neu. Bei Problemen wende dich an unser Personal.
          </p>
          <button
            onClick={() => { window.location.href = BASE; }}
            className="h-14 px-10 rounded-full bg-primary text-primary-foreground text-[16px] font-semibold shadow-md active:scale-[0.98] transition-transform"
          >
            Neu starten
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
