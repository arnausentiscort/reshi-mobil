// Els escenaris de "Començar a invertir", els mateixos a Reshi i al mòbil. Tot surt dels preus de final de mes reals
// (Yahoo Finance): no endevina res, explica què ha passat. Els preus mensuals amaguen les caigudes de dins del mes, així
// que les de debò van ser una mica més fondes.

// noms per reconèixer les caigudes grosses, segons l'actiu i l'any del punt més baix
const NOMS = {
	msci: {2011: 'crisi del deute de l’euro', 2015: 'devaluació de la Xina', 2016: 'por per la Xina', 2018: 'guerra comercial', 2020: 'covid', 2022: 'inflació i pujada de tipus', 2025: 'aranzels de Trump'},
	btc: {2015: 'hivern cripto', 2018: 'hivern cripto', 2019: 'hivern cripto', 2020: 'covid', 2021: 'la Xina prohibeix minar', 2022: 'caiguda de Luna i FTX', 2026: 'la caiguda d’ara'},
	eth: {2018: 'hivern cripto', 2019: 'hivern cripto', 2020: 'covid', 2022: 'caiguda de Luna i FTX', 2026: 'la caiguda d’ara'},
};
const mesos = (a, b) => {
	const [y1, m1] = a.split('-').map(Number);
	const [y2, m2] = b.split('-').map(Number);
	return (y2 - y1) * 12 + (m2 - m1);
};

/** Les caigudes de més d'un `minim` (0,2 = 20 %) des d'un màxim: quan, quant, quant va trigar a tornar on era. */
export function caigudes(serie, minim, actiu) {
	const surt = [];
	let pic = 0;
	let i = 1;
	while (i < serie.length) {
		if (serie[i][1] >= serie[pic][1]) {
			pic = i;
			i++;
			continue;
		}
		// som per sota del màxim: on és el fons i quan es torna a passar el màxim
		let fons = i;
		let j = i;
		while (j < serie.length && serie[j][1] < serie[pic][1]) {
			if (serie[j][1] < serie[fons][1]) fons = j;
			j++;
		}
		const caiguda = 1 - serie[fons][1] / serie[pic][1];
		if (caiguda >= minim) {
			const any = Number(serie[fons][0].slice(0, 4));
			surt.push({
				pic: serie[pic][0],
				fons: serie[fons][0],
				caiguda,
				mesosBaixant: mesos(serie[pic][0], serie[fons][0]),
				recuperat: j < serie.length ? serie[j][0] : null,
				mesosRecuperar: j < serie.length ? mesos(serie[pic][0], serie[j][0]) : null, // des del màxim
				nom: NOMS[actiu]?.[any] ?? null,
				iPic: pic,
				iFons: fons,
			});
		}
		pic = j < serie.length ? j : pic;
		i = j + 1;
	}
	return surt;
}

/** Si haguessis entrat al màxim d'abans d'una caiguda amb `capital` i hi anessis posant `mensual` cada mes: quants mesos
 * (des del màxim) fins a tornar a tenir més del que hi havies posat, un cop passat el punt més baix. Sense posar res,
 * és el temps de recuperació normal. */
export function mesosFinsEnPositiu(serie, iPic, iFons, capital, mensual) {
	let unitats = capital / serie[iPic][1];
	let posat = capital;
	for (let k = iPic + 1; k < serie.length; k++) {
		unitats += mensual / serie[k][1];
		posat += mensual;
		if (k > iFons && unitats * serie[k][1] >= posat) return k - iPic;
	}
	return null; // encara no
}

/** Tot de cop o repartit en `repartit` mesos, mirant el resultat al cap de `horitzo` mesos, per a cada mes d'inici del
 * passat. Diu quantes vegades guanya cadascun i què passa en el pitjor cas. */
export function totDeCop(serie, capital, repartit, horitzo) {
	const casos = [];
	for (let s = 0; s + horitzo < serie.length; s++) {
		const final = serie[s + horitzo][1];
		const cop = (capital / serie[s][1]) * final;
		let unitats = 0;
		for (let k = 0; k < repartit; k++) unitats += capital / repartit / serie[s + k][1];
		casos.push({inici: serie[s][0], cop, poc: unitats * final});
	}
	if (!casos.length) return null;
	const perCop = (f) => [...casos].sort((a, b) => a[f] - b[f]);
	const mitjana = (f) => casos.reduce((t, c) => t + c[f], 0) / casos.length;
	return {
		casos: casos.length,
		desDe: casos[0].inici,
		guanyaCop: casos.filter((c) => c.cop > c.poc).length / casos.length,
		mitjanaCop: mitjana('cop'),
		mitjanaPoc: mitjana('poc'),
		pitjorCop: perCop('cop')[0],
		pitjorPoc: perCop('poc')[0],
		perdCop: casos.filter((c) => c.cop < capital).length / casos.length,
		perdPoc: casos.filter((c) => c.poc < capital).length / casos.length,
	};
}
