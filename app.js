// Reshi al mòbil: les Notícies, el Mercat i la Vitrina. Sense llibreries: dades.json té l'edició pública, els preus del
// mercat i la vitrina; privat.json, xifrat, el "per què t'importa" de cada notícia i la situació de l'Arnau. El codi es
// posa un cop i el mòbil el recorda. Els vots, de moment, es guarden en aquest mòbil.
import {ICONES} from './icones.js';
import {caigudes, mesosFinsEnPositiu, totDeCop} from './escenaris.js';
import {COMPROVAT, GUIA} from './guia.js';
import {resumHistoria, simular} from './simulador.js';

const TEMES = {
	politica: {nom: 'Política', icona: 'politica'},
	mercat: {nom: 'Mercat', icona: 'mercat'},
	cripto: {nom: 'Cripto', icona: 'cripto'},
	conflictes: {nom: 'Món', icona: 'conflictes'},
	tecnologia: {nom: 'Tecnologia', icona: 'tecnologia'},
	jocs: {nom: 'Jocs', icona: 'jocs'},
	ofertes: {nom: 'Ofertes', icona: 'ofertes'},
	eina: {nom: 'Eina de la setmana', icona: 'eina'},
};
const FILTRES = [
	{id: 'totes', nom: 'Totes', temes: null},
	{id: 'politica', nom: 'Política', temes: ['politica']},
	{id: 'mercat', nom: 'Mercat i món', temes: ['mercat', 'cripto', 'conflictes']},
	{id: 'tecnologia', nom: 'Tecnologia', temes: ['tecnologia', 'eina']},
	{id: 'jocs', nom: 'Jocs', temes: ['jocs', 'ofertes']},
];
const PLACA = {fet: 'Acabat', 'en curs': 'En marxa', aturat: 'Per acabar', idea: 'Idea'};
const DIES = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
const DIES_CURTS = ['dg.', 'dl.', 'dt.', 'dc.', 'dj.', 'dv.', 'ds.'];
const MESOS = ['gen.', 'febr.', 'març', 'abr.', 'maig', 'juny', 'jul.', 'ag.', 'set.', 'oct.', 'nov.', 'des.'];
const MESOS_LLARGS = ['de gener', 'de febrer', 'de març', 'd’abril', 'de maig', 'de juny', 'de juliol', 'd’agost', 'de setembre', 'd’octubre', 'de novembre', 'de desembre'];

const dia = (s) => new Date(`${s}T12:00:00`);
const dataLlarga = (s) => `${DIES[dia(s).getDay()]}, ${dia(s).getDate()} ${MESOS_LLARGS[dia(s).getMonth()]}`;
const dataCurta = (s) => `${DIES_CURTS[dia(s).getDay()]} ${dia(s).getDate()} ${MESOS[dia(s).getMonth()]}`;
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const icona = (nom, mida = 18) =>
	`<svg class="ic" width="${mida}" height="${mida}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nom] ?? ''}</svg>`;

// el que el mòbil recorda (sempre amb try: hi ha navegadors que no deixen)
const guardat = {
	llegir(k, def) {
		try {
			return JSON.parse(localStorage.getItem(k)) ?? def;
		} catch {
			return def;
		}
	},
	posar(k, v) {
		try {
			localStorage.setItem(k, JSON.stringify(v));
		} catch {}
	},
};

const estat = {
	dades: null,
	vista: 'noticies',
	filtre: 'totes',
	personal: null,
	cartera: null,
	privat: null,
	vots: guardat.llegir('reshi-vots', {}),
	lector: null,
	error: null,
	sim: guardat.llegir('reshi-sim', {msci: 60, btc: 15, eth: 0, anys: null, aportacio: null, finestra: 60}),
	vistes: new Set(guardat.llegir('reshi-vistes', [])), // les que ja ha llegit (aquí o a l'ordinador)
	projecte: null, // el projecte de la vitrina obert
	inv: {siBaixa: 'msci', minim: 10, capital: 1000, mensual: 100, totCop: 'msci', anys: 5}, // "Començar a invertir"
	llegidesAbans: new Set(), // les llegides quan es va pintar la llista: l'ordre es fa amb aquestes perquè res salti mentre llegeix
};
const desarVistes = () => guardat.posar('reshi-vistes', [...estat.vistes]);
const llegir = (id) => {
	if (estat.vistes.has(id)) return;
	estat.vistes.add(id);
	desarVistes();
};
const refreshLlegides = () => (estat.llegidesAbans = new Set(estat.vistes));
// el que surt del privat.json: abans només eren les notícies; ara, notícies i cartera
const aplicar = (obert) => {
	estat.personal = obert?.noticies ?? obert;
	estat.cartera = obert?.cartera ?? null;
	estat.projectes = obert?.projectes ?? null; // la nota de cada projecte de la vitrina (què ha fet, què falta)
	for (const id of obert?.vistes ?? []) estat.vistes.add(id); // les que ja va llegir a l'ordinador
	desarVistes();
	refreshLlegides();
};

// --- la part personal: PBKDF2 + AES-GCM, igual que web_mobil.py ---
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const normalitzat = (c) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');
async function obrir(codi) {
	const p = estat.privat;
	const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(normalitzat(codi)), 'PBKDF2', false, ['deriveKey']);
	const clau = await crypto.subtle.deriveKey({name: 'PBKDF2', salt: deB64(p.sal), iterations: p.iteracions, hash: 'SHA-256'}, base, {name: 'AES-GCM', length: 256}, false, ['decrypt']);
	const clar = await crypto.subtle.decrypt({name: 'AES-GCM', iv: deB64(p.iv)}, clau, deB64(p.dades));
	return JSON.parse(new TextDecoder().decode(clar));
}

const targetesVisibles = () => {
	const temes = FILTRES.find((f) => f.id === estat.filtre)?.temes;
	return [...estat.dades.edicio.targetes].sort(ordre).filter((t) => !temes || temes.includes(t.tema));
};
// les ja llegides al final; les urgents d'entre setmana ("nova") primer, les més noves davant; després, per importància
const ordre = (a, b) =>
	Number(estat.llegidesAbans.has(a.id)) - Number(estat.llegidesAbans.has(b.id)) || (b.nova ?? '').localeCompare(a.nova ?? '') || b.punts - a.punts;
const noves = () => estat.dades.edicio.targetes.filter((t) => !estat.vistes.has(t.id)).length;
// "2026-10-26 08:35" -> "avui a les 08:35", "ahir a les...", "dilluns a les..."
const quan = (s) => {
	const d = new Date(s.replace(' ', 'T'));
	const dies = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
	return `${dies === 0 ? 'avui' : dies === 1 ? 'ahir' : DIES[d.getDay()]} a les ${s.slice(11, 16)}`;
};

const foto = (t, classe) =>
	t.imatge
		? `<span class="${classe}" data-tema="${t.tema}"><img src="${esc(t.imatge)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">${icona(TEMES[t.tema].icona, 28)}</span>`
		: `<span class="${classe}" data-tema="${t.tema}">${icona(TEMES[t.tema].icona, 28)}</span>`;

// la xifra que resumeix la notícia: grossa, en daurat
const xifra = (t, classe = 'xifra') => (t.xifra ? `<span class="${classe}"><b>${esc(t.xifra.valor)}</b><span>${esc(t.xifra.que)}</span></span>` : '');

// a què toca cada notícia: pastilla verda (bo per a qui ho té), vermella (dolent) o grisa (depèn)
const NOMS_TOCA = {msci: 'MSCI World', btc: 'Bitcoin', eth: 'Ethereum', compte: 'El teu compte', casa: 'La casa', butxaca: 'La butxaca'};
const FLETXA = {bo: '↗', dolent: '↘', depen: '⇄'};
const pastilla = (x, {petit = false, senseNom = false} = {}) =>
	`<span class="pastilla-toca ${x.efecte}"><i>${FLETXA[x.efecte]}</i>${senseNom ? '' : `<b>${esc(NOMS_TOCA[x.actiu])}</b>`}${petit ? '' : `<span>${esc(x.que)}</span>`}</span>`;
const toques = (t) => (t.toca?.length ? `<span class="toques">${t.toca.map((x) => pastilla(x, {petit: true})).join('')}</span>` : '');
// les notícies de l'edició que toquen una cosa del mercat (les més importants primer)
const enllacos = (actiu) =>
	estat.dades.edicio.targetes
		.flatMap((n) => (n.toca ?? []).filter((x) => x.actiu === actiu).map((x) => ({n, x})))
		.sort((a, b) => b.n.punts - a.n.punts)
		.slice(0, 3);
const noticiesQueToquen = (actiu, senseNom = true) => {
	const ll = enllacos(actiu);
	return ll.length
		? `<ul class="m-noticies">${ll.map(({n, x}) => `<li><button type="button" data-anar-noticia="${n.id}">${pastilla(x, {senseNom})}<span>${esc(n.titol)}</span></button></li>`).join('')}</ul>`
		: '';
};

const etiqueta = (tema, nova) =>
	`<span class="etiqueta" data-tema="${tema}">${icona(TEMES[tema].icona, 12)} ${TEMES[tema].nom}${nova ? `<em class="nou">Nou · ${esc(dataCurta(nova))}</em>` : ''}</span>`;

const formCodi = (titol, text) => `<form class="cadenat" id="form-codi">
		<span class="cadenat-icona">${icona('cadenat', 18)}</span>
		<label for="codi"><b>${titol}</b><span>${text}</span></label>
		<div class="cadenat-fila">
			<input id="codi" name="codi" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX" maxlength="12">
			<button type="submit">Obrir</button>
		</div>
		${estat.error ? `<p class="cadenat-error">${esc(estat.error)}</p>` : ''}
	</form>`;

function vistaNoticies() {
	const e = estat.dades.edicio;
	const avui = new Date().toISOString().slice(0, 10);
	const llista = targetesVisibles();
	const pendents = llista.filter((t) => !estat.llegidesAbans.has(t.id));
	const [primera, ...resta] = pendents;
	const llegides = llista.filter((t) => estat.llegidesAbans.has(t.id));
	const n = noves();
	const agenda = e.agenda.filter((a) => a.data >= avui);
	const fila = (t, i) => `<li><button type="button" class="fila ${estat.vots[t.id] === -1 ? 'sobra' : ''} ${estat.vistes.has(t.id) ? 'vista' : ''}" data-obrir="${i}">
		<span class="fila-text">${etiqueta(t.tema, t.nova)}<b>${esc(t.titol)}</b>${xifra(t)}${toques(t)}</span>
		${foto(t, 'fila-foto')}
	</button></li>`;
	return `
	<header class="cap">
		<span class="sobre">${esc(dataLlarga(e.data))}</span>
		<h1>${esc(e.titol)}</h1>
		<p>${esc(e.intro)}</p>
	</header>
	<div class="estat-noves">
		${e.actualitzat ? `<span>Actualitzat ${esc(quan(e.actualitzat))}</span>` : ''}
		${
			n
				? `<b class="noves">${n === 1 ? '1 nova' : `${n} noves`}</b><button type="button" data-llegir-totes>Marcar llegides</button>`
				: `<b class="al-dia">${icona('fet', 14)} Les has llegit totes</b>`
		}
	</div>
	${estat.personal ? '' : formCodi('La part que va per tu', 'Posa el codi i cada notícia et dirà per què t’importa. El mòbil el recordarà.')}
	${
		agenda.length
			? `<section class="agenda" aria-label="Pròximament">
		<h2 class="etiqueta">${icona('calendari', 12)} Pròximament</h2>
		<ol>${agenda.map((a) => `<li data-tema="${a.tema}"><b>${esc(dataCurta(a.data))}</b><span>${esc(a.text)}</span></li>`).join('')}</ol>
	</section>`
			: ''
	}
	<nav class="filtres" aria-label="Temes">${FILTRES.map((f) => {
		const n = e.targetes.filter((t) => !f.temes || f.temes.includes(t.tema)).length;
		return `<button type="button" data-filtre="${f.id}" aria-pressed="${estat.filtre === f.id}">${f.nom} <small>${n}</small></button>`;
	}).join('')}</nav>
	${
		primera
			? `<button type="button" class="portada" data-obrir="0">
		${foto(primera, 'portada-foto')}
		<span class="portada-text">${etiqueta(primera.tema, primera.nova)}<h2>${esc(primera.titol)}</h2>${xifra(primera)}${toques(primera)}</span>
	</button>`
			: ''
	}
	<ul class="llista">${resta.map((t, i) => fila(t, i + 1)).join('')}</ul>
	${
		llegides.length
			? `<h2 class="etiqueta separador">${icona('fet', 12)} Ja llegides</h2>
	<ul class="llista">${llegides.map((t, i) => fila(t, pendents.length + i)).join('')}</ul>`
			: ''
	}
	${votsPerPassar()}`;
}

// mentre els vots del mòbil no arribin sols a Reshi: un botó que els copia per enganxar-los al xat amb el Claude
function votsPerPassar() {
	const n = Object.keys(estat.vots).length;
	if (!n) return '';
	return `<section class="passar">
		<p><b>${n} ${n === 1 ? 'vot' : 'vots'} en aquest mòbil.</b> Encara no arriben sols a Reshi: copia’ls i enganxa’ls al xat amb el Claude.</p>
		<button type="button" data-copiar-vots>Copiar els vots</button>
	</section>`;
}
const textVots = () =>
	['VOTS RESHI', ...Object.entries(estat.vots).map(([id, v]) => `${v > 0 ? '+1' : '-1'} ${id}`)].join(String.fromCharCode(10));

// --- Mercat: la situació (xifrada), el mercat avui i el simulador ---
const eur = (x) => `${Math.round(x).toLocaleString('ca-ES')} €`;
const pct = (x, d = 1) => `${x > 0 ? '+' : ''}${x.toLocaleString('ca-ES', {maximumFractionDigits: d})} %`;
const preu = (a) =>
	a.moneda === 'EUR'
		? `${a.preu.toLocaleString('ca-ES', {maximumFractionDigits: a.preu > 1000 ? 0 : 2})} €`
		: a.id === 'eurusd'
			? a.preu.toLocaleString('ca-ES', {minimumFractionDigits: 3, maximumFractionDigits: 3})
			: `${a.preu.toLocaleString('ca-ES', {maximumFractionDigits: 2})} $`;
const linia = (serie, puja) => {
	const min = Math.min(...serie);
	const max = Math.max(...serie);
	const pts = serie.map((v, i) => `${((i / (serie.length - 1)) * 100).toFixed(2)},${(36 - ((v - min) / (max - min || 1)) * 32 - 2).toFixed(2)}`).join(' ');
	return `<svg class="m-linia ${puja ? 'puja' : 'baixa'}" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,36 ${pts} 100,36"/><polyline points="${pts}" vector-effect="non-scaling-stroke"/></svg>`;
};
const canvi = (nom, v) => `<span class="m-canvi ${v > 0 ? 'puja' : v < 0 ? 'baixa' : ''}"><small>${nom}</small>${pct(v)}</span>`;
const FINESTRES = [
	{mesos: 36, nom: '3 anys'},
	{mesos: 60, nom: '5 anys'},
	{mesos: 0, nom: 'Des del 2018'},
];

function calcularSim() {
	const c = estat.cartera;
	const s = estat.sim;
	const historia = estat.dades.mercat.historia;
	const anys = s.anys ?? c.objectiu.anys;
	const aportacio = s.aportacio ?? c.aportacio;
	const inici = Math.max(0, c.compte.saldo - c.matalas);
	const compte = 100 - s.msci - s.btc - s.eth;
	const base = {inici, aportacio, anys, interes: c.compte.interes_aviat, historia, finestra: s.finestra};
	const r = simular({...base, pesos: {compte, msci: s.msci, btc: s.btc, eth: s.eth}});
	const nomesCompte = simular({...base, pesos: {compte: 100, msci: 0, btc: 0, eth: 0}}).perAny.map((p) => p.normal);
	return {r, nomesCompte, inici, anys, aportacio, compte};
}

function grafic({r, nomesCompte, inici}) {
	const W = 340;
	const H = 190;
	const pad = {e: 44, d: 8, a: 10, b: 22};
	const punts = [{any: 0, mal: inici, normal: inici, be: inici, aportat: inici}, ...r.perAny];
	const maxY = Math.max(...r.perAny.map((p) => p.be), ...nomesCompte) * 1.05;
	const x = (a) => pad.e + (a / r.perAny.length) * (W - pad.e - pad.d);
	const y = (v) => pad.a + (1 - v / maxY) * (H - pad.a - pad.b);
	const pas = maxY > 400000 ? 100000 : maxY > 150000 ? 50000 : maxY > 60000 ? 20000 : 10000;
	const marques = Array.from({length: Math.floor(maxY / pas) + 1}, (_, i) => i * pas);
	const linia = (vs) => vs.map(([a, v]) => `${x(a).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
	return `<svg class="m-ventall" viewBox="0 0 ${W} ${H}" role="img" aria-label="Com podrien créixer els estalvis any a any">
		${marques.map((v) => `<line x1="${pad.e}" x2="${W - pad.d}" y1="${y(v)}" y2="${y(v)}" class="m-reixa"/><text x="${pad.e - 6}" y="${y(v) + 4}" text-anchor="end" class="m-eix">${v ? `${v / 1000}k` : '0'}</text>`).join('')}
		${punts.map((p) => `<text x="${x(p.any)}" y="${H - 6}" text-anchor="middle" class="m-eix">${p.any}</text>`).join('')}
		<polygon class="m-franja" points="${linia([...punts.map((p) => [p.any, p.be]), ...[...punts].reverse().map((p) => [p.any, p.mal])])}"/>
		<polyline class="m-aportat" points="${linia(punts.map((p) => [p.any, p.aportat]))}"/>
		<polyline class="m-compte" points="${linia([inici, ...nomesCompte].map((v, i) => [i, v]))}"/>
		<polyline class="m-normal" points="${linia(punts.map((p) => [p.any, p.normal]))}"/>
		<circle class="m-punt" cx="${x(punts.at(-1).any)}" cy="${y(punts.at(-1).normal)}" r="4.5"/>
	</svg>`;
}

function resultatSim() {
	const d = calcularSim();
	const {r, nomesCompte, compte} = d;
	const guany = r.final.normal - nomesCompte.at(-1);
	return `<div class="m-tres">
		<div><span>Si va malament</span><b>${eur(r.final.mal)}</b></div>
		<div class="normal"><span>El normal</span><b>${eur(r.final.normal)}</b></div>
		<div><span>Si va molt bé</span><b>${eur(r.final.be)}</b></div>
	</div>
	${grafic(d)}
	<ul class="m-llegenda"><li class="l-franja">malament – molt bé</li><li class="l-normal">el normal</li><li class="l-compte">tot al compte</li><li class="l-aportat">el que hi poses</li></ul>
	<ul class="m-frases">
		<li>Hi hauràs posat <b>${eur(r.aportat)}</b>. Tot al compte en tindries uns <b>${eur(nomesCompte.at(-1))}</b>${
			compte < 100 ? `; amb aquesta barreja, el normal seria <b class="${guany >= 0 ? 'puja' : 'baixa'}">${guany >= 0 ? '+' : '−'}${eur(Math.abs(guany))}</b> més.` : '.'
		}</li>
		${
			compte < 100
				? `<li>En <b>${Math.round(r.perdre * 100)} de cada 100</b> camins acabes amb menys del que hi has posat.</li>
		<li>En un mal moment podries veure-ho baixar un <b>${Math.round(r.caiguda.dolenta * 100)} %</b> (uns ${eur(r.caiguda.dolentaEur)}). Aguantaries sense vendre?</li>`
				: ''
		}
	</ul>
	<p class="m-peu">2.000 camins barrejant mesos reals des de ${r.desDe.slice(5)}/${r.desDe.slice(0, 4)}. Canvia el període i mira com canvia tot: el futur no es repetirà igual. No és cap previsió ni cap consell.</p>`;
}

// --- Començar a invertir: la guia, què ha passat quan ha caigut i tot de cop o a poc a poc (mobil/escenaris.js) ---
const ACTIUS_INV = [
	{id: 'msci', nom: 'MSCI World', minim: 10},
	{id: 'btc', nom: 'Bitcoin', minim: 40},
	{id: 'eth', nom: 'Ethereum', minim: 40},
];
const MESOS_CURTS = ['gen.', 'febr.', 'març', 'abr.', 'maig', 'juny', 'jul.', 'ag.', 'set.', 'oct.', 'nov.', 'des.'];
const mesAny = (ym) => `${MESOS_CURTS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const durada = (m) => (m < 12 ? `${m} ${m === 1 ? 'mes' : 'mesos'}` : m % 12 === 0 ? `${m / 12} ${m === 12 ? 'any' : 'anys'}` : `${(m / 12).toLocaleString('ca-ES', {maximumFractionDigits: 1})} anys`);
const triarActiu = (camp) =>
	`<div class="m-finestres">${ACTIUS_INV.map((a) => `<button type="button" data-inv-actiu="${camp}:${a.id}" aria-pressed="${estat.inv[camp] === a.id}">${a.nom}</button>`).join('')}</div>`;

function resultatSiBaixa() {
	const v = estat.inv;
	const serie = estat.dades.mercat.series[v.siBaixa];
	const nom = ACTIUS_INV.find((a) => a.id === v.siBaixa).nom;
	const llista = caigudes(serie, v.minim / 100, v.siBaixa);
	const pitjor = llista.reduce((p, x) => (!p || x.caiguda > p.caiguda ? x : p), null);
	const desDe = serie[0][0].slice(0, 4);
	return `<p class="inv-impacte">Una caiguda del ${v.minim} % vol dir que <b>${eur(v.capital)}</b> es queden en <b class="baixa">${eur(v.capital * (1 - v.minim / 100))}</b>.</p>
	<p class="m-explica">${
		llista.length
			? `Des del ${desDe}, el ${nom} ha caigut més d’un ${v.minim} % <b>${llista.length} ${llista.length === 1 ? 'vegada' : 'vegades'}</b>. La pitjor, un <b class="baixa">−${Math.round(pitjor.caiguda * 100)} %</b>${pitjor.nom ? ` (${esc(pitjor.nom)})` : ''}.`
			: `Des del ${desDe}, el ${nom} no ha caigut mai més d’un ${v.minim} % (mirant els preus de final de mes).`
	}</p>
	<ol class="inv-caigudes">${[...llista]
		.reverse()
		.map((x) => {
			const aportant = v.mensual > 0 ? mesosFinsEnPositiu(serie, x.iPic, x.iFons, v.capital, v.mensual) : null;
			return `<li>
		<div class="inv-caiguda-cap"><b class="baixa">−${Math.round(x.caiguda * 100)} %</b><span>${x.nom ? `<strong>${esc(x.nom)}</strong>` : ''}<small>${mesAny(x.pic)} → ${mesAny(x.fons)}</small></span></div>
		<div class="inv-barra"><i style="width:${x.caiguda * 100}%"></i></div>
		<p>${x.mesosRecuperar !== null ? `Va trigar <b>${durada(x.mesosRecuperar)}</b> a tornar on era.` : '<b>Encara no ha tornat</b> on era.'}${
			v.mensual > 0
				? aportant !== null
					? ` Posant ${eur(v.mensual)} cada mes, hauries tornat a guanyar en <b class="puja">${durada(aportant)}</b>.`
					: ` Posant ${eur(v.mensual)} cada mes, encara no estaries en positiu.`
				: ''
		}</p>
	</li>`;
		})
		.join('')}</ol>`;
}

function vistaInvertir() {
	const m = estat.dades.mercat;
	if (!m?.series) return '';
	const v = estat.inv;
	const guia = `<section class="m-bloc">
		<h2 class="etiqueta">${icona('noticies', 12)} Abans de començar</h2>
		<div class="inv-guia">${GUIA.map(
			(g, i) => `<article class="inv-pas"><span class="inv-num">${i + 1}</span><b class="inv-xifra">${esc(g.xifra)}</b><h3>${esc(g.titol)}</h3><p>${esc(g.text)}</p>${
				g.fonts.length ? `<footer class="fonts">${g.fonts.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nom)} ${icona('fletxa', 12)}</a>`).join('')}</footer>` : ''
			}</article>`,
		).join('')}</div>
		<p class="m-peu">Informació general comprovada l’${COMPROVAT}: mira-ho a la web de cada lloc abans de fer res. Reshi no et diu què has de fer.</p>
	</section>`;
	const siBaixa = `<section class="m-bloc m-sim inv-bloc">
		<h2 class="etiqueta">${icona('mercat', 12)} Si baixa… què ha passat altres vegades?</h2>
		${triarActiu('siBaixa')}
		<label class="m-ll" for="inv-minim"><span><b>Caigudes de més d’un</b><small>des del punt més alt</small></span><input id="inv-minim" type="range" min="10" max="80" step="5" value="${v.minim}" data-inv="minim"><output id="out-inv-minim">${v.minim} %</output></label>
		<label class="m-ll" for="inv-capital"><span><b>Si hi tinguessis</b><small>euros</small></span><input id="inv-capital" type="range" min="100" max="10000" step="100" value="${v.capital}" data-inv="capital"><output id="out-inv-capital">${eur(v.capital)}</output></label>
		<label class="m-ll" for="inv-mensual"><span><b>I hi posessis cada mes</b><small>euros</small></span><input id="inv-mensual" type="range" min="0" max="1000" step="50" value="${v.mensual}" data-inv="mensual"><output id="out-inv-mensual">${eur(v.mensual)}</output></label>
		<div id="inv-si-baixa" class="m-resultat">${resultatSiBaixa()}</div>
		<p class="m-peu">Amb els preus de final de mes: dins del mes, les caigudes van ser una mica més fondes.${v.siBaixa === 'msci' ? ' Aquest fons existeix des del 2009: no hi surt la crisi del 2008, quan el MSCI World va perdre més de la meitat i va trigar uns cinc anys a recuperar-se.' : ''}</p>
	</section>`;
	let tot = '';
	if (estat.cartera) {
		const c = estat.cartera;
		const capital = Math.max(0, c.compte.saldo - c.matalas);
		const r = totDeCop(m.series[v.totCop], capital, 12, v.anys * 12);
		const col = (titol, mitjana, pitjor, inici, perd) => `<div><h3>${titol}</h3><dl>
			<dt>De mitjana acabes amb</dt><dd>${eur(mitjana)}</dd>
			<dt>El pitjor moment per començar</dt><dd>${eur(pitjor)}<small>${mesAny(inici)}</small></dd>
			<dt>Vegades que acabes perdent</dt><dd class="${perd ? 'baixa' : 'puja'}">${Math.round(perd * 100)} de 100</dd></dl></div>`;
		tot = `<section class="m-bloc m-sim inv-bloc">
		<h2 class="etiqueta">${icona('calculadora', 12)} ${eur(capital)}: tot de cop o en 12 mesos?</h2>
		${triarActiu('totCop')}
		<div class="m-finestres">${[3, 5, 7].map((a) => `<button type="button" data-inv-anys="${a}" aria-pressed="${v.anys === a}">${a} anys</button>`).join('')}</div>
		${
			r
				? `<p class="m-explica">Mirant els ${r.casos} mesos en què hauries pogut començar des del ${mesAny(r.desDe)}, posar-ho <b>tot de cop</b> va acabar millor <b>${Math.round(r.guanyaCop * 100)} de cada 100 vegades</b>. Repartir-ho et protegeix de començar just abans d’una caiguda.</p>
		<div class="inv-dos">${col('Tot de cop', r.mitjanaCop, r.pitjorCop.cop, r.pitjorCop.inici, r.perdCop)}${col('En 12 mesos', r.mitjanaPoc, r.pitjorPoc.poc, r.pitjorPoc.inici, r.perdPoc)}</div>`
				: `<p class="m-explica">No hi ha prou història per mirar ${v.anys} anys enrere.</p>`
		}
		<p class="m-peu">Només els diners que ja tens, menys el matalàs, sense comptar el que estalvies cada mes ni els impostos. El passat no es repetirà igual.</p>
	</section>`;
	}
	return `<header class="cap inv-cap"><span class="sobre">Començar a invertir</span><h1>Abans de moure res</h1><p>Què cal saber, què ha passat les altres vegades que ha caigut i què hauria passat amb els teus diners.</p></header>
	${guia}${siBaixa}${tot}`;
}

function vistaMercat() {
	const m = estat.dades.mercat;
	const c = estat.cartera;
	const s = estat.sim;
	const situacio = c
		? `<section class="m-situacio">
		<div class="gran"><b>${eur(c.compte.saldo)}</b><span>a ${esc(c.compte.nom)}</span></div>
		<div><b>${c.compte.interes} % → ${c.compte.interes_aviat} %</b><span>el que et paga, d’aquí poc</span></div>
		<div><b>${eur(c.aportacio)}</b><span>que estalvies al mes</span></div>
		<div><b>${eur(c.matalas)}</b><span>de matalàs</span></div>
		<div><b>${c.objectiu.anys} anys</b><span>fins a ${esc(c.objectiu.nom.toLowerCase())}</span></div>
		${
			enllacos('compte').length || enllacos('casa').length
				? `<div class="m-toca-tens"><h3>Aquesta setmana toca el que tens</h3>${noticiesQueToquen('compte', false)}${noticiesQueToquen('casa', false)}</div>`
				: ''
		}
		<p>Al compte, el ${c.compte.interes_aviat} % són uns <b>${eur((c.compte.saldo * c.compte.interes_aviat) / 100)} l’any</b>. Amb la inflació al voltant del 3 %, els diners guardats perden una mica de valor cada any.</p>
	</section>`
		: formCodi('La teva situació i el simulador', 'Posa el codi per veure els teus números i simular on posar els estalvis.');
	const actius = m
		? `<section class="m-bloc">
		<h2 class="etiqueta">${icona('mercat', 12)} El mercat <small>· ${esc(m.actualitzat?.slice(8, 10))}/${esc(m.actualitzat?.slice(5, 7))} ${esc(m.actualitzat?.slice(11))}</small></h2>
		<div class="m-actius">${m.actius
			.map(
				(a) => `<article class="m-actiu">
			<div class="m-actiu-cap"><b>${esc(a.nom)}</b><small>${esc(a.que)}</small></div>
			<span class="m-preu">${preu(a)}</span>
			${linia(a.serie, a.canvis.any >= 0)}
			<div class="m-canvis">${canvi('setm.', a.canvis.setmana)}${canvi('mes', a.canvis.mes)}${canvi('any', a.canvis.any)}</div>
			${{msci: 'msci', btc: 'btc', eth: 'eth', brent: 'butxaca'}[a.id] ? noticiesQueToquen({msci: 'msci', btc: 'btc', eth: 'eth', brent: 'butxaca'}[a.id], a.id !== 'brent') : ''}
		</article>`,
			)
			.join('')}
			${m.tipus_bce !== undefined ? `<article class="m-actiu m-bce"><div class="m-actiu-cap"><b>Tipus del BCE</b><small>D’aquí surt el que et paga el compte</small></div><span class="m-preu">${m.tipus_bce.toLocaleString('ca-ES', {minimumFractionDigits: 2})} %</span>${noticiesQueToquen('compte')}</article>` : ''}
		</div>
	</section>`
		: '<p class="buit">Encara no hi ha preus del mercat.</p>';
	const resum = m && c ? resumHistoria(m.historia, s.finestra) : null;
	const ll = (k, nom) => `<label class="m-ll" for="sim-${k}">
		<span><b>${nom}</b><small>${pct(resum[k].anual * 100)} l’any · pitjor mes ${pct(resum[k].pitjorMes * 100, 0)}</small></span>
		<input id="sim-${k}" type="range" min="0" max="100" step="5" value="${s[k]}" data-sim="${k}"><output id="out-${k}">${s[k]} %</output>
	</label>`;
	const simulador =
		m && c
			? `<section class="m-bloc m-sim">
		<h2 class="etiqueta">${icona('calculadora', 12)} Simulador: on poso els estalvis?</h2>
		<div class="m-finestres">${FINESTRES.map((f) => `<button type="button" data-finestra="${f.mesos}" aria-pressed="${s.finestra === f.mesos}">${f.nom}</button>`).join('')}</div>
		<p class="m-explica">Comences amb <b>${eur(Math.max(0, c.compte.saldo - c.matalas))}</b> (sense el matalàs) i cada mes hi afegeixes el que estalvies.</p>
		<div class="m-ll compte"><span><b>Compte remunerat</b><small>${c.compte.interes_aviat} % l’any · no baixa mai</small></span><div class="m-barra"><i id="barra-compte" style="width:${100 - s.msci - s.btc - s.eth}%"></i></div><output id="out-compte">${100 - s.msci - s.btc - s.eth} %</output></div>
		${ll('msci', 'MSCI World')}${ll('btc', 'Bitcoin')}${ll('eth', 'Ethereum')}
		<label class="m-ll" for="sim-anys"><span><b>Anys</b><small>fins que necessites els diners</small></span><input id="sim-anys" type="range" min="1" max="15" value="${s.anys ?? c.objectiu.anys}" data-sim="anys"><output id="out-anys">${s.anys ?? c.objectiu.anys}</output></label>
		<label class="m-ll" for="sim-aportacio"><span><b>Cada mes</b><small>el que hi afegeixes</small></span><input id="sim-aportacio" type="range" min="0" max="2000" step="50" value="${s.aportacio ?? c.aportacio}" data-sim="aportacio"><output id="out-aportacio">${eur(s.aportacio ?? c.aportacio)}</output></label>
		<div id="sim-resultat" class="m-resultat">${resultatSim()}</div>
	</section>`
			: '';
	return `<header class="cap">
		<span class="sobre">Mercat</span>
		<h1>Els teus diners</h1>
		<p>Com està el mercat i què podria passar amb els teus estalvis. Reshi analitza i explica; la decisió és teva.</p>
	</header>
	${situacio}${actius}${simulador}${vistaInvertir()}`;
}

// moure un lliscador: només es refà el resultat, perquè el dit no perdi el lliscador
document.addEventListener('input', (ev) => {
	const inv = ev.target.dataset?.inv;
	if (inv) {
		estat.inv[inv] = Number(ev.target.value);
		document.getElementById(`out-inv-${inv}`).textContent = inv === 'minim' ? `${estat.inv[inv]} %` : eur(estat.inv[inv]);
		document.getElementById('inv-si-baixa').innerHTML = resultatSiBaixa();
		return;
	}
	const k = ev.target.dataset?.sim;
	if (!k) return;
	const s = estat.sim;
	let v = Number(ev.target.value);
	if (['msci', 'btc', 'eth'].includes(k)) {
		v = Math.min(v, 100 - (s.msci + s.btc + s.eth - s[k]));
		ev.target.value = v;
	}
	s[k] = v;
	guardat.posar('reshi-sim', s);
	const out = document.getElementById(`out-${k}`);
	if (out) out.textContent = k === 'aportacio' ? eur(v) : k === 'anys' ? String(v) : `${v} %`;
	const compte = 100 - s.msci - s.btc - s.eth;
	document.getElementById('out-compte').textContent = `${compte} %`;
	document.getElementById('barra-compte').style.width = `${compte}%`;
	document.getElementById('sim-resultat').innerHTML = resultatSim();
});

function vistaVitrina() {
	const v = estat.dades.vitrina;
	return `
	<header class="cap">
		<span class="sobre">Vitrina</span>
		<h1>El que he fet</h1>
		<p>Els projectes dels quals estic orgullós: apps per a la colla, per a la família i els treballs de la carrera.</p>
	</header>
	${estat.projectes ? '' : formCodi('Què has fet a cada projecte', 'Posa el codi per entrar a cada projecte: què has fet, les decisions i el que falta.')}
	<div class="vitrina">${v
		.map(
			(p) => `<article class="trofeu">
		<button type="button" class="trofeu-obrir" data-projecte="${p.id}" ${estat.projectes?.[p.id] ? '' : 'disabled'} aria-label="Obrir ${esc(p.titol)}">
			<span class="medalla">${icona(p.icona, 30)}</span>
			<span class="placa">${esc(PLACA[p.estat] ?? p.estat)}</span>
			<h2>${esc(p.titol)}</h2>
			<p>${esc(p.resum)}</p>
		</button>
		${p.web ? `<a href="${esc(p.web)}" target="_blank" rel="noopener">Obrir la web ${icona('fletxa', 14)}</a>` : ''}
	</article>`,
		)
		.join('')}</div>`;
}

// --- la fitxa d'un projecte: el mateix que la pàgina de projecte de Reshi, llegit de la nota del brain ---
// el text de la nota: [[enllaços]] d'Obsidian com a text (o botó, si porten a un altre projecte de la vitrina),
// **negretes** i `codi`
const textNota = (t) => {
	const ids = new Set(estat.dades.vitrina.map((p) => p.id));
	return esc(t)
		.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, nom, alias) =>
			ids.has(nom.trim()) && estat.projectes?.[nom.trim()] ? `<button type="button" class="enllac" data-projecte="${nom.trim()}">${alias ?? nom}</button>` : `<em>${alias ?? nom}</em>`,
		)
		.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
		.replace(/`([^`]+)`/g, '<code>$1</code>');
};
// les línies d'una secció: "- " són punts (seguits, una llista), "> " una cita, la resta paràgrafs
const cosNota = (linies) => {
	let html = '';
	let punts = [];
	let cita = [];
	const tancar = () => {
		if (punts.length) html += `<ul>${punts.map((x) => `<li>${textNota(x)}</li>`).join('')}</ul>`;
		if (cita.length) html += `<blockquote>${textNota(cita.join(' '))}</blockquote>`; // les línies seguides de "> ", una sola cita
		punts = [];
		cita = [];
	};
	for (const l of linies) {
		const tipus = !l ? '' : l.startsWith('- ') || l.startsWith('* ') ? 'punt' : l.startsWith('>') ? 'cita' : 'p';
		if ((tipus !== 'punt' && punts.length) || (tipus !== 'cita' && cita.length)) tancar();
		if (tipus === 'punt') punts.push(l.slice(2));
		else if (tipus === 'cita') cita.push(l.replace(/^>\s?/, ''));
		else if (tipus === 'p') html += `<p>${textNota(l)}</p>`;
	}
	tancar();
	return html;
};

function vistaProjecte() {
	const p = estat.projectes[estat.projecte];
	const v = estat.dades.vitrina.find((x) => x.id === estat.projecte);
	return `<div class="fitxa" role="dialog" aria-modal="true" aria-label="${esc(p.titol)}">
	<div class="fitxa-barra"><button type="button" class="rodo" data-tancar aria-label="Tornar a la vitrina">${icona('enrere', 18)}</button></div>
	<div class="fitxa-cos">
		<header class="fitxa-cap">
			<span class="medalla">${icona(v?.icona ?? 'espurna', 30)}</span>
			<div><span class="placa">${esc(PLACA[p.estat] ?? p.estat)}</span><h1>${esc(p.titol)}</h1>${p.actualitzat ? `<small>Tocat el ${esc(p.actualitzat.split('-').reverse().join('/'))}</small>` : ''}</div>
		</header>
		<p class="fitxa-resum">${textNota(p.resum)}</p>
		${v?.web ? `<a class="fitxa-web" href="${esc(v.web)}" target="_blank" rel="noopener">Obrir la web ${icona('fletxa', 14)}</a>` : ''}
		${
			p.pendents?.length
				? `<section class="fitxa-pendents"><h2 class="etiqueta">${icona('cadenat', 12)} Què falta</h2><ol>${p.pendents.map((x) => `<li>${textNota(x)}</li>`).join('')}</ol></section>`
				: ''
		}
		${(p.seccions ?? [])
			.filter((x) => x.linies.some(Boolean))
			.map((x) => `<section class="fitxa-seccio">${x.titol ? `<h2>${esc(x.titol)}</h2>` : ''}${cosNota(x.linies)}</section>`)
			.join('')}
	</div>
</div>`;
}

function vistaLector() {
	const llista = targetesVisibles();
	return `<div class="lector" role="dialog" aria-modal="true" aria-label="Notícies">
	<div class="lector-barra">
		<button type="button" class="rodo" data-tancar aria-label="Tancar">${icona('tancar', 18)}</button>
		<span class="lector-compte" id="compte">${estat.lector + 1} / ${llista.length}</span>
		<button type="button" class="rodo pas" data-pas="-1" aria-label="Notícia anterior">${icona('enrere', 18)}</button>
		<button type="button" class="rodo pas" data-pas="1" aria-label="Notícia següent">${icona('endavant', 18)}</button>
		<span class="lector-punts">${llista.map((_, i) => `<i class="${i === estat.lector ? 'ara' : ''}"></i>`).join('')}</span>
	</div>
	<div class="lector-pistes" id="pistes">${llista
		.map((t) => {
			const vot = estat.vots[t.id] ?? 0;
			const perTu = estat.personal?.[t.id];
			return `<article class="pagina" data-id="${t.id}">
		${foto(t, 'pagina-foto')}
		<div class="pagina-cos">
			${etiqueta(t.tema, t.nova)}
			<h2>${esc(t.titol)}</h2>
			${xifra(t, 'xifra gran')}
			<p class="entradeta">${esc(t.frase)}</p>
			<section><h3>Què passa</h3><p>${esc(t.que_passa)}</p></section>
			${
				perTu
					? `<section class="per-tu"><h3>Per què t’importa</h3><p>${esc(perTu)}</p></section>`
					: `<section class="per-tu tancat"><h3>${icona('cadenat', 12)} Per què t’importa</h3><p>Posa el codi a la portada per veure-ho.</p></section>`
			}
			<section><h3>Què pot canviar</h3><p>${esc(t.que_canvia)}</p></section>
			${
				t.toca?.length
					? `<section class="que-et-fa"><h3>Què li fa al que tens o mires</h3><ul>${t.toca.map((x) => `<li>${pastilla(x)}<p>${esc(x.per_que)}</p></li>`).join('')}</ul></section>`
					: ''
			}
			<footer class="fonts">${t.fonts.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nom)} ${icona('fletxa', 12)}</a>`).join('')}</footer>
		</div>
		<div class="vots">
			<button type="button" data-vot="1" data-id="${t.id}" aria-pressed="${vot === 1}">${icona('amunt', 18)} M’interessa</button>
			<button type="button" data-vot="-1" data-id="${t.id}" aria-pressed="${vot === -1}">${icona('avall', 18)} Em sobra</button>
		</div>
	</article>`;
		})
		.join('')}</div>
</div>`;
}

function pintar() {
	const app = document.getElementById('app');
	if (estat.error && !estat.dades) {
		app.innerHTML = `<main class="pantalla"><p class="buit">${esc(estat.error)}</p></main>`;
		return;
	}
	if (!estat.dades) {
		app.innerHTML = `<main class="pantalla"><p class="buit">Carregant…</p></main>`;
		return;
	}
	app.innerHTML = `
	<div class="marca"><img src="icona-192.png" alt=""><b>RESHI</b>${estat.personal ? `<span class="obert" title="La part personal està oberta">${icona('obert', 13)}</span>` : ''}</div>
	<main class="pantalla">${estat.vista === 'noticies' ? vistaNoticies() : estat.vista === 'mercat' ? vistaMercat() : vistaVitrina()}</main>
	<nav class="pestanyes" aria-label="Seccions">
		<button type="button" data-vista="noticies" aria-pressed="${estat.vista === 'noticies'}">${icona('noticies', 20)}<span>Notícies</span>${estat.dades && noves() ? `<i class="pastilla">${noves()}</i>` : ''}</button>
		<button type="button" data-vista="mercat" aria-pressed="${estat.vista === 'mercat'}">${icona('mercat', 20)}<span>Mercat</span></button>
		<button type="button" data-vista="vitrina" aria-pressed="${estat.vista === 'vitrina'}">${icona('vitrina', 20)}<span>Vitrina</span></button>
	</nav>
	${estat.lector !== null ? vistaLector() : ''}
	${estat.projecte && estat.projectes?.[estat.projecte] ? vistaProjecte() : ''}`;
	document.body.classList.toggle('llegint', estat.lector !== null || !!estat.projecte);
	if (estat.lector !== null) {
		const pistes = document.getElementById('pistes');
		pistes.scrollLeft = estat.lector * pistes.clientWidth;
		pistes.addEventListener('scroll', () => {
			const i = Math.round(pistes.scrollLeft / pistes.clientWidth);
			if (i === estat.lector) return;
			estat.lector = i;
			llegir(targetesVisibles()[i].id);
			document.getElementById('compte').textContent = `${i + 1} / ${targetesVisibles().length}`;
			document.querySelectorAll('.lector-punts i').forEach((p, j) => p.classList.toggle('ara', j === i));
		});
	}
}

function obrirLector(i) {
	estat.lector = i;
	llegir(targetesVisibles()[i].id);
	history.pushState({lector: true}, ''); // el botó d'enrere del mòbil tanca el lector en lloc de sortir de l'app
	pintar();
}
function tancarLector() {
	if (estat.lector === null) return;
	estat.lector = null;
	refreshLlegides(); // les que acaba de llegir baixen a "Ja llegides"
	pintar();
}
window.addEventListener('popstate', () => {
	if (estat.projecte) {
		estat.projecte = null;
		pintar();
	} else tancarLector();
});

document.addEventListener('click', (ev) => {
	const b = ev.target.closest('button');
	if (!b) return;
	if (b.dataset.vista) {
		estat.vista = b.dataset.vista;
		refreshLlegides();
		pintar();
		window.scrollTo(0, 0);
	} else if (b.dataset.anarNoticia) {
		estat.vista = 'noticies';
		estat.filtre = 'totes';
		refreshLlegides();
		const i = targetesVisibles().findIndex((t) => t.id === b.dataset.anarNoticia);
		pintar();
		if (i >= 0) obrirLector(i);
	} else if (b.hasAttribute('data-llegir-totes')) {
		for (const t of estat.dades.edicio.targetes) estat.vistes.add(t.id);
		desarVistes();
		refreshLlegides();
		pintar();
	} else if (b.dataset.projecte) {
		const obert = !!estat.projecte;
		estat.projecte = b.dataset.projecte;
		if (!obert) history.pushState({projecte: true}, ''); // el botó d'enrere torna a la vitrina
		pintar();
		document.querySelector('.fitxa')?.scrollTo(0, 0);
	} else if (b.dataset.invActiu) {
		const [camp, id] = b.dataset.invActiu.split(':');
		estat.inv[camp] = id;
		if (camp === 'siBaixa') estat.inv.minim = ACTIUS_INV.find((a) => a.id === id).minim;
		pintar();
	} else if (b.dataset.invAnys) {
		estat.inv.anys = Number(b.dataset.invAnys);
		pintar();
	} else if (b.dataset.finestra !== undefined) {
		estat.sim.finestra = Number(b.dataset.finestra);
		guardat.posar('reshi-sim', estat.sim);
		pintar();
	} else if (b.dataset.filtre) {
		estat.filtre = b.dataset.filtre;
		pintar();
	} else if (b.dataset.obrir !== undefined) {
		obrirLector(Number(b.dataset.obrir));
	} else if (b.dataset.pas) {
		const pistes = document.getElementById('pistes');
		pistes.scrollBy({left: Number(b.dataset.pas) * pistes.clientWidth, behavior: 'smooth'});
	} else if (b.hasAttribute('data-tancar')) {
		history.back();
	} else if (b.hasAttribute('data-copiar-vots')) {
		const text = textVots();
		navigator.clipboard
			.writeText(text)
			.then(() => (b.textContent = 'Copiats! Enganxa’ls al xat'))
			.catch(() => {
				b.insertAdjacentHTML('afterend', `<textarea readonly rows="6">${esc(text)}</textarea>`);
				b.nextElementSibling.select();
			});
	} else if (b.dataset.vot) {
		const v = Number(b.dataset.vot);
		const id = b.dataset.id;
		if (estat.vots[id] === v) delete estat.vots[id];
		else estat.vots[id] = v;
		guardat.posar('reshi-vots', estat.vots);
		llegir(id);
		b.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(estat.vots[id] === Number(x.dataset.vot))));
	}
});

document.addEventListener('submit', async (ev) => {
	if (ev.target.id !== 'form-codi') return;
	ev.preventDefault();
	const codi = new FormData(ev.target).get('codi') ?? '';
	try {
		aplicar(await obrir(codi));
		estat.error = null;
		guardat.posar('reshi-codi', codi);
	} catch {
		estat.error = 'Aquest codi no obre res. Mira’l a Reshi, a l’ordinador.';
	}
	pintar();
});

document.addEventListener('keydown', (ev) => {
	if (estat.lector === null) return;
	const pistes = document.getElementById('pistes');
	if (ev.key === 'Escape') history.back();
	if (ev.key === 'ArrowRight') pistes.scrollBy({left: pistes.clientWidth, behavior: 'smooth'});
	if (ev.key === 'ArrowLeft') pistes.scrollBy({left: -pistes.clientWidth, behavior: 'smooth'});
});

async function arrencar() {
	pintar();
	try {
		const [dades, privat] = await Promise.all([fetch('dades.json', {cache: 'no-cache'}).then((r) => r.json()), fetch('privat.json', {cache: 'no-cache'}).then((r) => r.json())]);
		estat.dades = dades;
		estat.privat = privat;
		refreshLlegides();
		const codi = guardat.llegir('reshi-codi', null);
		if (codi) aplicar(await obrir(codi).catch(() => null)); // si el codi ha canviat, es torna a demanar
	} catch {
		estat.error = 'No he pogut carregar les notícies. Torna-ho a provar quan tinguis connexió.';
	}
	pintar();
}
arrencar();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
