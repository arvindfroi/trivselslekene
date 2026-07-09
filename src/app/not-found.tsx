import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="text-center">
        <p className="font-display text-8xl text-fg-faint">404</p>
        <h1 className="mt-3 font-display text-4xl text-fg">Siden finnes ikke</h1>
        <p className="mt-3 text-sm text-fg-dim">
          Denne siden ble ikke funnet. Kanskje den er flyttet eller slettet.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-accent-bright"
          >
            Gå til dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
