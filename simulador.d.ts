// Tipus de simulador.js per a la interfície de Reshi (TypeScript).
export type Historia = {mesos: string[]; rendiments: {msci: number[]; btc: number[]; eth: number[]}};
export type Pesos = {compte: number; msci: number; btc: number; eth: number};
export type Resultat = {
	aportat: number;
	perAny: {any: number; aportat: number; mal: number; normal: number; be: number}[];
	final: {mal: number; normal: number; be: number};
	perdre: number;
	caiguda: {normal: number; dolenta: number; dolentaEur: number};
	mesosHistoria: number;
	desDe: string;
};
export function simular(o: {inici: number; aportacio: number; anys: number; interes: number; pesos: Pesos; historia: Historia; finestra: number}): Resultat;
export function resumHistoria(historia: Historia, finestra: number): Record<string, {anual: number; pitjorMes: number}>;
