import { auth } from "@/lib/auth";
import { LinkButton } from "@/components/ui/Button";
import PrismaticBurst from "@/components/PrismaticBurst";
import InteractiveTitle from "@/components/InteractiveTitle";
import { ArrowRight } from "lucide-react";

export default async function Hjemmeside() {
  const session = await auth();

  return (
    <section className="relative flex min-h-dvh items-center justify-center overflow-hidden">
      {/* PrismaticBurst-bakgrunn */}
      <div className="absolute inset-0 z-0">
        <PrismaticBurst
          intensity={4.4}
          speed={0.55}
          distort={2}
          animationType="rotate3d"
          colors={["#2be5a0", "#38bdf8", "#7c5cff", "#a855f7"]}
          rayCount={0}
          mixBlendMode="none"
        />
      </div>

      {/* Mørk vignett så teksten er lesbar over bursten */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,rgba(6,6,8,0.12)_0%,rgba(6,6,8,0.55)_72%,#060608_100%)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="animate-fade-up font-display leading-[0.95]">
          <InteractiveTitle
            text="TrivselsLekene"
            className="block text-[13vw] font-medium text-fg sm:text-6xl md:text-7xl"
          />
          <span className="text-gradient mt-1 block text-[15vw] font-semibold sm:text-7xl md:text-8xl">
            2026
          </span>
        </h1>

        <div
          className="animate-fade-up mt-10 flex justify-center"
          style={{ animationDelay: "160ms" }}
        >
          {session?.user ? (
            <LinkButton href="/dashboard" className="animate-float px-7 py-3 text-base">
              Gå til dashbord
              <ArrowRight size={18} />
            </LinkButton>
          ) : (
            <LinkButton href="/bli-med" className="animate-float px-8 py-3.5 text-base">
              Bli med
              <ArrowRight size={18} />
            </LinkButton>
          )}
        </div>
      </div>
    </section>
  );
}
