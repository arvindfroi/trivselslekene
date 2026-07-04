import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export const inputClass =
  "w-full rounded-xl border border-line bg-white/[0.04] px-4 py-3 text-fg placeholder:text-fg-faint transition-colors focus-visible:outline-none focus-visible:border-accent-2 focus-visible:ring-2 focus-visible:ring-accent-2/40";

export function Label({
  className = "",
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1.5 block font-sans text-[11px] font-medium tracking-widest text-fg-dim uppercase ${className}`}
      {...rest}
    />
  );
}

export function Input({
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${className}`} {...rest} />;
}

export function Textarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} ${className}`} {...rest} />;
}

export function Select({
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={`${inputClass} ${className}`} {...rest}>
      {children}
    </select>
  );
}
