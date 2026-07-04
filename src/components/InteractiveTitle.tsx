export default function InteractiveTitle({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={className} aria-label={text}>
      {Array.from(text).map((ch, i) =>
        ch === " " ? (
          <span key={i} aria-hidden className="inline-block w-[0.28em]" />
        ) : (
          <span key={i} aria-hidden className="tl-letter">
            {ch}
          </span>
        )
      )}
    </span>
  );
}
