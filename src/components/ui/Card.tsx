import type { CSSProperties, ReactNode } from "react";

export default function Card({
  children,
  className = "",
  hover = false,
  padding = "p-5 sm:p-6",
  style,
  id,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: string;
  style?: CSSProperties;
  id?: string;
}) {
  return (
    <div
      id={id}
      style={style}
      className={`surface rounded-2xl ${hover ? "surface-hover" : ""} ${padding} ${className}`}
    >
      {children}
    </div>
  );
}
