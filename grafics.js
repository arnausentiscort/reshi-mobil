// Gràfics del Mercat que fan servir igual Reshi (ordinador) i el mòbil.

/** Mapa de rectangles ("treemap" quadrat): reparteix el rectangle (x, y, w, h) entre els elements segons `valor`, amb
 * rectangles tan quadrats com es pugui (Bruls, Huizing i van Wijk). Torna cada element amb x, y, w, h. */
export function squarify(elements, x, y, w, h) {
	const total = elements.reduce((s, e) => s + e.valor, 0);
	const items = [...elements].sort((a, b) => b.valor - a.valor).map((e) => ({...e, area: (e.valor / total) * w * h}));
	const surt = [];
	let rect = {x, y, w, h};
	let fila = [];
	const pitjor = (f, costat) => {
		const s = f.reduce((t, e) => t + e.area, 0);
		const max = Math.max(...f.map((e) => e.area));
		const min = Math.min(...f.map((e) => e.area));
		return Math.max((costat * costat * max) / (s * s), (s * s) / (costat * costat * min));
	};
	const col·loca = (f) => {
		const s = f.reduce((t, e) => t + e.area, 0);
		if (rect.w >= rect.h) {
			const amplada = s / rect.h;
			let yy = rect.y;
			for (const e of f) {
				const alt = e.area / amplada;
				surt.push({...e, x: rect.x, y: yy, w: amplada, h: alt});
				yy += alt;
			}
			rect = {x: rect.x + amplada, y: rect.y, w: rect.w - amplada, h: rect.h};
		} else {
			const alt = s / rect.w;
			let xx = rect.x;
			for (const e of f) {
				const amplada = e.area / alt;
				surt.push({...e, x: xx, y: rect.y, w: amplada, h: alt});
				xx += amplada;
			}
			rect = {x: rect.x, y: rect.y + alt, w: rect.w, h: rect.h - alt};
		}
	};
	for (const e of items) {
		const costat = Math.min(rect.w, rect.h);
		if (!fila.length || pitjor([...fila, e], costat) <= pitjor(fila, costat)) fila.push(e);
		else {
			col·loca(fila);
			fila = [e];
		}
	}
	if (fila.length) col·loca(fila);
	return surt;
}

/** El color d'una variació de la setmana: verd si puja, vermell si baixa, més intens com més es mou (fins a ±6 %). */
export function colorVariacio(pct) {
	if (pct === undefined || pct === null) return 'rgba(255,255,255,0.08)';
	const k = Math.min(1, Math.abs(pct) / 6);
	return pct >= 0 ? `rgba(74, 222, 128, ${0.18 + k * 0.62})` : `rgba(229, 83, 75, ${0.18 + k * 0.62})`;
}

// colors per a les parts de les carteres: validats sobre el fons fosc (dataviz, scripts/validate_palette.js)
export const COLORS_PARTS = ['#3987e5', '#d95926', '#199e70', '#c98500'];
export const COLOR_RESERVA = '#5c5b57';
