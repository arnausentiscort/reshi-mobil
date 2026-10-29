// Tipus de grafics.js per a la interfície de Reshi (TypeScript).
export function squarify<T extends {valor: number}>(elements: T[], x: number, y: number, w: number, h: number): (T & {x: number; y: number; w: number; h: number})[];
export function colorVariacio(pct: number | undefined | null): string;
export const COLORS_PARTS: string[];
export const COLOR_RESERVA: string;
export type Fet = {id: string; data: string; efecte: 'bo' | 'dolent' | 'depen'; titol: string};
export function fetsDe(targetes: {id: string; titol: string; titol_abans?: string; nova?: string; toca?: {actiu: string; efecte: string}[]; actualitzacions?: {data: string; titol?: string}[]}[], actiu: string, dataEdicio: string): Fet[];
export function marquesSobre(serie: number[], dates: string[] | undefined, fets: Fet[]): {i: number; data: string; x: number; y: number; fets: Fet[]; efecte: Fet['efecte']}[];
export const ORDRE_TOCA: string[];
export function perActiu<T extends {toca?: {actiu: string; efecte: string}[]}>(targetes: T[]): {actiu: string; llista: {t: T; x: NonNullable<T['toca']>[number]}[]; bo: number; dolent: number; depen: number}[];
