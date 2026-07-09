import type { Kvalitet, LagFormat, OvelseStatus } from "@prisma/client";
import {
  BookOpen,
  Brain,
  Clover,
  Dumbbell,
  HeartPulse,
  Palette,
  Snowflake,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const lagFormatTekst: Record<LagFormat, string> = {
  PAR: "2 mot 2 (par)",
  TRIO: "3 mot 3",
  FIRE_MOT_FIRE: "4 mot 4",
  FEM_MOT_FEM: "5 mot 5",
  FIRE_MOT_FEM: "4 mot 5",
  TRE_MOT_TRE_MOT_TRE: "3 mot 3 mot 3",
  TO_MOT_TO_MOT_TO_MOT_TO: "2 mot 2 mot 2 mot 2",
  TO_LAG: "2 lag",
  TRE_LAG: "3 lag",
  FIRE_LAG: "4 lag",
  FLERE_LAG: "Flere lag",
  ANNET: "Annet oppsett",
};

/** Rekkefølgen og teksten som vises i lagvelgeren. */
export const lagFormatValg: {
  verdi: LagFormat;
  tittel: string;
  hint: string;
}[] = [
  { verdi: "PAR", tittel: "2 mot 2", hint: "Par mot par, som bridge" },
  { verdi: "TRIO", tittel: "3 mot 3", hint: "Tre på hvert lag" },
  { verdi: "FIRE_MOT_FIRE", tittel: "4 mot 4", hint: "Fire på hvert lag" },
  { verdi: "FEM_MOT_FEM", tittel: "5 mot 5", hint: "Fem på hvert lag" },
  { verdi: "FIRE_MOT_FEM", tittel: "4 mot 5", hint: "Fire mot fem — fotball" },
  { verdi: "TRE_MOT_TRE_MOT_TRE", tittel: "3 mot 3 mot 3", hint: "Tre lag à tre spillere" },
  { verdi: "TO_MOT_TO_MOT_TO_MOT_TO", tittel: "2 mot 2 mot 2 mot 2", hint: "Fire lag à to spillere" },
  { verdi: "TO_LAG", tittel: "2 lag", hint: "To lag mot hverandre" },
  { verdi: "TRE_LAG", tittel: "3 lag", hint: "Tre lag i kamp" },
  { verdi: "FIRE_LAG", tittel: "4 lag", hint: "Fire lag i kamp" },
  { verdi: "FLERE_LAG", tittel: "Flere lag", hint: "Fem eller flere lag" },
  { verdi: "ANNET", tittel: "Annet", hint: "Et annet lagoppsett" },
];

export const kvalitetTekst: Record<Kvalitet, string> = {
  STYRKE: "Styrke",
  UTHOLDENHET: "Utholdenhet",
  PRESISJON: "Presisjon",
  FLAKS: "Flaks",
  LAGSPILL: "Lagspill",
  TAKTIKK: "Taktikk",
  HURTIGHET: "Hurtighet",
  KREATIVITET: "Kreativitet",
  KUNNSKAP: "Kunnskap",
  NERVER: "Nerver",
};

/** Ikon (lucide) brukt for hver egenskap i kort og velgere. */
export const kvalitetIkon: Record<Kvalitet, LucideIcon> = {
  STYRKE: Dumbbell,
  UTHOLDENHET: HeartPulse,
  PRESISJON: Target,
  FLAKS: Clover,
  LAGSPILL: Users,
  TAKTIKK: Brain,
  HURTIGHET: Zap,
  KREATIVITET: Palette,
  KUNNSKAP: BookOpen,
  NERVER: Snowflake,
};

/** Rekkefølgen egenskapene vises i. */
export const ALLE_KVALITETER: Kvalitet[] = [
  "STYRKE",
  "UTHOLDENHET",
  "PRESISJON",
  "HURTIGHET",
  "FLAKS",
  "LAGSPILL",
  "TAKTIKK",
  "KREATIVITET",
  "KUNNSKAP",
  "NERVER",
];

export const kvalitetValg: {
  verdi: Kvalitet;
  tittel: string;
  Ikon: LucideIcon;
}[] = ALLE_KVALITETER.map((k) => ({
  verdi: k,
  tittel: kvalitetTekst[k],
  Ikon: kvalitetIkon[k],
}));

export const statusTekst: Record<OvelseStatus, string> = {
  PLANLAGT: "Planlagt",
  PAAGAAR: "Pågår",
  FULLFORT: "Fullført",
};

export const statusVariant: Record<
  OvelseStatus,
  "planlagt" | "pagaar" | "fullfort"
> = {
  PLANLAGT: "planlagt",
  PAAGAAR: "pagaar",
  FULLFORT: "fullfort",
};
