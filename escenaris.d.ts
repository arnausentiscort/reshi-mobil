// Tipus d'escenaris.js per a la interfície de Reshi (TypeScript).
export type Serie = [string, number][];
export type Caiguda = {
	pic: string;
	fons: string;
	caiguda: number;
	mesosBaixant: number;
	recuperat: string | null;
	mesosRecuperar: number | null;
	nom: string | null;
	iPic: number;
	iFons: number;
};
export function caigudes(serie: Serie, minim: number, actiu: string): Caiguda[];
export function mesosFinsEnPositiu(serie: Serie, iPic: number, iFons: number, capital: number, mensual: number): number | null;
export type TotDeCop = {
	casos: number;
	desDe: string;
	guanyaCop: number;
	mitjanaCop: number;
	mitjanaPoc: number;
	pitjorCop: {inici: string; cop: number; poc: number};
	pitjorPoc: {inici: string; cop: number; poc: number};
	perdCop: number;
	perdPoc: number;
};
export function totDeCop(serie: Serie, capital: number, repartit: number, horitzo: number): TotDeCop | null;
