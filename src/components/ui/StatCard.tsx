export default function StatCard({
  label,
  verdi,
}: {
  label: string;
  verdi: string;
}) {
  return (
    <div className="surface rounded-2xl p-4 sm:p-5">
      <p className="text-[11px] tracking-widest text-fg-faint uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-fg sm:text-3xl">{verdi}</p>
    </div>
  );
}
