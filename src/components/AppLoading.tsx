// Vises umiddelbart mens en side lastes, så navigasjonen føles rask.
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-28 pb-12">
      <div className="animate-pulse">
        <div className="h-3 w-40 rounded-full bg-white/10" />
        <div className="mt-3 h-9 w-64 rounded-lg bg-white/[0.08]" />
        <div className="mt-3 h-4 w-52 rounded-full bg-white/[0.05]" />

        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          <div className="h-24 rounded-2xl bg-white/[0.04]" />
          <div className="h-24 rounded-2xl bg-white/[0.04]" />
          <div className="h-24 rounded-2xl bg-white/[0.04]" />
        </div>

        <div className="mt-8 h-44 rounded-2xl bg-white/[0.04]" />
      </div>
    </div>
  );
}
