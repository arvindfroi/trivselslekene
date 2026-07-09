export default function StatCard({
  label,
  verdi,
}: {
  label: string;
  verdi: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white/[0.06] p-4 sm:p-5">
      <p className="text-[11px] tracking-widest text-fg-faint uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-fg sm:text-3xl">{verdi}</p>
    </div>
  );
}
