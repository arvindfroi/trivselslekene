"use client";

import type { ReactNode } from "react";
import AnimatedGradientBackground from "@/components/AnimatedGradientBackground";
import { usePathname } from "next/navigation";

const MAX_WIDTHS: Record<string, string> = {
  "/dashboard": "max-w-4xl",
  "/ovelser": "max-w-5xl",
  "/stilling": "max-w-5xl",
  "/profil": "max-w-4xl",
};

export default function MainShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const maxW = MAX_WIDTHS[pathname] ?? "max-w-4xl";

  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      {/* Fixed animated background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <AnimatedGradientBackground Breathing breathingRange={6} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className={`mx-auto ${maxW} px-4 pt-6 pb-28`}>
          {children}
        </div>
      </div>
    </div>
  );
}
