// Tipus de grafics.js per a la interfície de Reshi (TypeScript).
export function squarify<T extends {valor: number}>(elements: T[], x: number, y: number, w: number, h: number): (T & {x: number; y: number; w: number; h: number})[];
export function colorVariacio(pct: number | undefined | null): string;
export const COLORS_PARTS: string[];
export const COLOR_RESERVA: string;
