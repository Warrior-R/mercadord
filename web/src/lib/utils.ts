import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind resolviendo conflictos (ADR 0002). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
