"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoadingOrbit from "@/components/LoadingOrbit";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-sans text-sm font-medium px-5 py-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-45 disabled:pointer-events-none active:scale-[0.98] whitespace-nowrap min-h-[44px]";
const primary = `${base} bg-accent text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset] hover:brightness-110 hover:shadow-[0_10px_36px_-10px_rgba(22,184,35,0.65)]`;

interface NavigateButtonProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

export default function NavigateButton({ href, className = "", children }: NavigateButtonProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  return (
    <>
      {navigating && <LoadingOrbit />}
      <button
        type="button"
        className={`${primary} ${className}`}
        onClick={() => {
          setNavigating(true);
          router.push(href);
        }}
      >
        {children}
      </button>
    </>
  );
}
