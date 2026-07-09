"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-display text-4xl text-fg">Noe gikk galt</h1>
        <p className="mt-3 text-sm text-fg-dim">
          En uventet feil oppstod. Prøv igjen, eller gå tilbake til startsiden.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset} variant="primary" className="px-5 py-2 text-sm">
            Prøv igjen
          </Button>
          <Button
            onClick={() => (window.location.href = "/dashboard")}
            variant="secondary"
            className="px-5 py-2 text-sm"
          >
            Til dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
