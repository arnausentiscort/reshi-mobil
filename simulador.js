// El simulador del mode Mercat, el mateix a Reshi (ordinador) i al mòbil. No endevina el futur: agafa els rendiments
// de cada mes d'un període real (els últims 3 o 5 anys, o tot el que hi ha) i en fa milers de camins barrejant-los a
// l'atzar. Cada mes es tria un mes real i s'aplica a tots els actius alhora, perquè si aquell mes tot va caure, tot cau.
// El compte remunerat dona el seu interès fix. Els números surten sempre iguals (llavor fixa) perquè no ballin.

const CAMINS = 2000;

function atzar(llavor) {
	return () => {
		llavor = (llavor + 0x6d2b79f5) | 0;
		let t = Math.imul(llavor ^ (llavor >>> 15), 1 | llavor);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const percentil = (xs, p) => {
	const s = [...xs].sort((a, b) => a - b);
	return s[Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))))];
};

/**
 * inici: euros que hi poses avui · aportacio: euros cada mes · anys · interes: % anual del compte
 * pesos: {compte, msci, btc, eth} en %, sumen 100 · historia: {mesos, rendiments: {msci: [...], btc: [...], eth: [...]}}
 * finestra: quants mesos del final de la història es fan servir (36, 60...) o 0 per a tots
 */
export function simular({inici, aportacio, anys, interes, pesos, historia, finestra}) {
	const total = historia.mesos.length;
	const des = finestra ? Math.max(0, total - finestra) : 0;
	const R = {msci: historia.rendiments.msci.slice(des), btc: historia.rendiments.btc.slice(des), eth: historia.rendiments.eth.slice(des)};
	const n = R.msci.length;
	const w = {compte: pesos.compte / 100, msci: pesos.msci / 100, btc: pesos.btc / 100, eth: pesos.eth / 100};
	const rCompte = (1 + interes / 100) ** (1 / 12) - 1;
	const mesos = Math.round(anys * 12);
	const aleatori = atzar(20261026);

	const perAny = Array.from({length: Math.ceil(anys)}, () => []);
	const finals = [];
	const caigudes = []; // la pitjor baixada de cada camí, en % des del punt més alt
	const caigudesEur = [];
	for (let c = 0; c < CAMINS; c++) {
		const v = {compte: inici * w.compte, msci: inici * w.msci, btc: inici * w.btc, eth: inici * w.eth};
		let maxim = inici;
		let pitjor = 0;
		let pitjorEur = 0;
		for (let m = 1; m <= mesos; m++) {
			const j = Math.floor(aleatori() * n);
			v.compte = (v.compte + aportacio * w.compte) * (1 + rCompte);
			v.msci = (v.msci + aportacio * w.msci) * (1 + R.msci[j]);
			v.btc = (v.btc + aportacio * w.btc) * (1 + R.btc[j]);
			v.eth = (v.eth + aportacio * w.eth) * (1 + R.eth[j]);
			const t = v.compte + v.msci + v.btc + v.eth;
			const aportat = inici + aportacio * m;
			maxim = Math.max(maxim, t);
			pitjor = Math.max(pitjor, 1 - t / maxim);
			pitjorEur = Math.max(pitjorEur, maxim - t);
			if (m % 12 === 0 || m === mesos) perAny[Math.ceil(m / 12) - 1][c] = t;
			if (m === mesos) finals.push({t, aportat});
		}
		caigudes.push(pitjor);
		caigudesEur.push(pitjorEur);
	}
	const aportat = inici + aportacio * mesos;
	return {
		aportat,
		perAny: perAny.map((xs, i) => ({
			any: i + 1,
			aportat: inici + aportacio * Math.min(mesos, (i + 1) * 12),
			mal: percentil(xs, 10),
			normal: percentil(xs, 50),
			be: percentil(xs, 90),
		})),
		final: {mal: percentil(finals.map((f) => f.t), 10), normal: percentil(finals.map((f) => f.t), 50), be: percentil(finals.map((f) => f.t), 90)},
		perdre: finals.filter((f) => f.t < f.aportat).length / finals.length, // camins que acaben amb menys del que hi has posat
		caiguda: {normal: percentil(caigudes, 50), dolenta: percentil(caigudes, 90), dolentaEur: percentil(caigudesEur, 90)},
		mesosHistoria: n,
		desDe: historia.mesos[des],
	};
}

// el que el període triat diu de cada actiu: quant ha donat l'any de mitjana i el pitjor mes
export function resumHistoria(historia, finestra) {
	const des = finestra ? Math.max(0, historia.mesos.length - finestra) : 0;
	const surt = {};
	for (const [k, rs] of Object.entries(historia.rendiments)) {
		const r = rs.slice(des);
		const anual = Math.exp((r.reduce((s, x) => s + Math.log(1 + x), 0) / r.length) * 12) - 1;
		surt[k] = {anual, pitjorMes: Math.min(...r)};
	}
	return surt;
}
