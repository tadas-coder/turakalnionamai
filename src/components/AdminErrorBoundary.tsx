import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  children: ReactNode;
  title?: string;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class AdminErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep the log readable and useful in production
    console.error("[AdminErrorBoundary] Render error:", error);
    console.error("[AdminErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const title = this.props.title ?? "Įvyko klaida administratoriaus skiltyje";

    return (
      <div className="min-h-screen bg-muted flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pabandykite perkrauti puslapį. Jei klaida kartojasi, nukopijuokite klaidos tekstą ir atsiųskite man.
            </p>

            <div className="rounded-md border bg-background p-3">
              <pre className="text-xs whitespace-pre-wrap break-words">
                {this.state.error?.message ?? "Nežinoma klaida"}
              </pre>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => window.location.reload()}>Perkrauti</Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const msg = this.state.error?.message ?? "Nežinoma klaida";
                  try {
                    await navigator.clipboard.writeText(msg);
                  } catch {
                    // ignore
                  }
                }}
              >
                Kopijuoti klaidą
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
