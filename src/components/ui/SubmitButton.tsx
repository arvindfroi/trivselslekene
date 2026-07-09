"use client";

import { useFormStatus } from "react-dom";
import Button from "./Button";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Button>, "type" | "disabled"> & {
  /** Tekst som vises mens skjemaet sendes inn. Default: "Lagrer…" */
  pendingText?: string;
};

/**
 * Submit-knapp som automatisk viser loading-state via useFormStatus.
 * Brukes i server components med <form action={serverAction}>.
 * Knappen deaktiveres og viser pendingText mens server action kjører.
 */
export default function SubmitButton({
  children,
  pendingText = "Lagrer…",
  ...props
}: Props) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
