"use client";

import { ReactNode } from "react";

/**
 * Minimal kit on semantic tokens. Harvest decision (logged in ORCHESTRATOR.md):
 * native primitives (<dialog>, <button>, <a>) re-expressed on tokens instead of
 * pulling a component library — the surfaces here are bespoke (slate, script
 * canvas, meters); only commodity controls are needed.
 */

export function MicroLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`microlabel text-ink-fade ${className}`}>{children}</div>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`hairline bg-raised ${className}`}>{children}</div>;
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "solid" | "ghost" | "accent" | "danger";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
};

export function Button({
  children,
  onClick,
  variant = "solid",
  disabled,
  className = "",
  type = "button",
}: ButtonProps) {
  const base =
    "microlabel inline-flex items-center justify-center gap-2 px-5 py-3 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
  const styles = {
    solid: "bg-ink text-paper hover:bg-ink-soft",
    ghost: "hairline bg-transparent text-ink hover:bg-sand",
    accent: "bg-accent text-paper hover:opacity-90",
    danger: "bg-cut text-paper hover:bg-cut-deep",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}
