// Reshi al mòbil: les Notícies, el Mercat i la Vitrina. Sense llibreries: dades.json té l'edició pública, el mercat de
// la setmana (preus, anàlisi, la cartera de prova i les apostes) i la vitrina; privat.json, xifrat, el "per què
// t'importa" de cada notícia, les notes dels projectes i l'activitat (passos i gimnàs). El codi es posa un cop i el mòbil
// el recorda. Els passos arriben amb una drecera d'iOS que obre aquesta web amb #passos=8420&dia=2026-11-02 (i el
// gimnàs, amb #gimnas=1): es desen aquí i van a Reshi per la bústia.
import {COLOR_RESERVA, COLORS_PARTS, colorVariacio, fetsDe, marquesSobre, perActiu, squarify} from './grafics.js';
import {ICONES} from './icones.js';

const TEMES = {
	ciencia: {nom: 'Ciència i espai', icona: 'telescopi'},
	crear: {nom: 'Per crear', icona: 'vareta'},
	reus: {nom: 'Reus i el Camp', icona: 'ciutat'},
	politica: {nom: 'Política', icona: 'politica'},
	mercat: {nom: 'Mercat', icona: 'mercat'},
	cripto: {nom: 'Cripto', icona: 'cripto'},
	conflictes: {nom: 'Món', icona: 'conflictes'},
	tecnologia: {nom: 'Tecnologia', icona: 'tecnologia'},
	gadgets: {nom: 'Gadgets', icona: 'mobil'},
	jocs: {nom: 'Jocs', icona: 'jocs'},
	ofertes: {nom: 'Ofertes', icona: 'ofertes'},
	eina: {nom: 'Eina de la setmana', icona: 'eina'},
};
const FILTRES = [
	{id: 'totes', nom: 'Totes', temes: null},
	{id: 'ciencia', nom: 'Ciència i espai', temes: ['ciencia']},
	{id: 'crear', nom: 'Per crear', temes: ['crear', 'eina']},
	{id: 'reus', nom: 'Reus', temes: ['reus']},
	{id: 'tecnologia', nom: 'Tecnologia', temes: ['tecnologia', 'gadgets']},
	{id: 'politica', nom: 'Política', temes: ['politica']},
	{id: 'mon', nom: 'Món', temes: ['conflictes']},
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

// el mode clar o fosc (el botó del sol): es posa a <html data-mode> (index.html ja el posa abans de pintar) i el mòbil el recorda
const modeClar = () => document.documentElement.dataset.mode === 'clar';
const posarMode = (m) => {
	document.documentElement.dataset.mode = m;
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', m === 'clar' ? '#f5f3ee' : '#121212');
	guardat.posar('reshi-mode', m);
};
posarMode(guardat.llegir('reshi-mode', 'fosc'));

const estat = {
	dades: null,
	vista: 'avui', // la pestanya oberta: avui, activitat, noticies, mercat o vitrina
	mesAct: 0, // a l'Activitat, el mes dels quadrets (0 = aquest, -1 = el passat...)
	filtre: 'totes',
	filtreToca: null, // al Mercat: només les notícies que toquen això (msci, btc...)
	personal: null,
	privat: null,
	vots: guardat.llegir('reshi-vots', {}),
	votsReshi: {}, // els que ja té Reshi (del privat.json): no cal tornar-los a enviar
	vistesReshi: new Set(), // les llegides que ja té Reshi
	notes: guardat.llegir('reshi-notes', []), // les notes per a Reshi que encara no han arribat
	bustia: '', // com ha anat l'últim enviament
	lector: null,
	error: null,
	vistes: new Set(guardat.llegir('reshi-vistes', [])), // les que ja ha llegit (aquí o a l'ordinador)
	projecte: null, // el projecte de la vitrina obert
	lectorIds: null, // quan el lector s'obre des del Mercat: les notícies de mercat, en aquest ordre
	llegidesAbans: new Set(), // les llegides quan es va pintar la llista: l'ordre es fa amb aquestes perquè res salti mentre llegeix
	activitat: guardat.llegir('reshi-activitat', []), // els passos i el gimnàs que encara no han arribat a Reshi
	activitatReshi: null, // el que ja té Reshi (del privat.json): dies, objectius i partits
	desat: null, // l'avís de dalt quan una drecera acaba de desar alguna cosa
	coses: guardat.llegir('reshi-coses', []), // els canvis a la llista que encara no han arribat a Reshi
	cosesReshi: null, // la llista que té Reshi (del privat.json)
	filtreLlista: 'tot', // tot, meu, regals o l'id d'un projecte
	editantCosa: null,
	carta: false, // la carta de regals oberta
};
const desarVistes = () => guardat.posar('reshi-vistes', [...estat.vistes]);
const llegir = (id) => {
	if (estat.vistes.has(id)) return;
	estat.vistes.add(id);
	desarVistes();
	enviarAviat();
};
const refreshLlegides = () => (estat.llegidesAbans = new Set(estat.vistes));
// el que surt del privat.json: el "per què t'importa", les notes dels projectes i les llegides a l'ordinador
const aplicar = (obert) => {
	estat.personal = obert?.noticies ?? obert;
	estat.projectes = obert?.projectes ?? null; // la nota de cada projecte de la vitrina (què ha fet, què falta)
	estat.diners = obert?.diners ?? null; // els seus diners de debò
	for (const id of obert?.vistes ?? []) estat.vistes.add(id); // les que ja va llegir a l'ordinador
	// els vots que ja té Reshi: es marquen aquí també (i una votada és una llegida)
	estat.votsReshi = obert?.vots ?? {};
	estat.vistesReshi = new Set(obert?.vistes ?? []);
	for (const [id, v] of Object.entries(estat.votsReshi)) {
		if (!(id in estat.vots)) estat.vots[id] = v;
		estat.vistes.add(id);
	}
	for (const [id, v] of Object.entries(estat.vots)) if (v) estat.vistes.add(id);
	guardat.posar('reshi-vots', estat.vots);
	// les notes que Reshi ja té surten de la cua
	const rebudes = new Set(obert?.rebudes ?? []);
	estat.notes = estat.notes.filter((n) => !rebudes.has(n.id));
	guardat.posar('reshi-notes', estat.notes);
	// i els passos i el gimnàs que Reshi ja té, també
	estat.activitatReshi = obert?.activitat ?? null;
	const jaHi = estat.activitatReshi?.dies ?? {};
	estat.activitat = estat.activitat.filter(
		(a) =>
			(a.passos != null && jaHi[a.dia]?.passos !== a.passos) ||
			(a.gimnas != null && !!jaHi[a.dia]?.gimnas !== a.gimnas) ||
			(a.pantalla && Object.entries(a.pantalla).some(([k, v]) => (jaHi[a.dia]?.pantalla?.[k] ?? -1) < v)),
	);
	guardat.posar('reshi-activitat', estat.activitat);
	// i de la llista, els canvis que Reshi ja té (o en té un de més nou)
	estat.cosesReshi = obert?.coses ?? null;
	const teReshi = new Map([...(estat.cosesReshi?.coses ?? []), ...(estat.cosesReshi?.esborrades ?? [])].map((c) => [c.id, c.quan ?? '']));
	estat.coses = estat.coses.filter((c) => !teReshi.has(c.id) || teReshi.get(c.id) < c.quan);
	guardat.posar('reshi-coses', estat.coses);
	desarVistes();
	enviarAviat(0);
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

// les de mercat i cripto viuen al Mercat, al costat dels preus; a Notícies, la resta
const TEMES_MERCAT = ['mercat', 'cripto'];
const meves = () => estat.dades.edicio.targetes.filter((t) => !TEMES_MERCAT.includes(t.tema));
const targetesVisibles = () => {
	const temes = FILTRES.find((f) => f.id === estat.filtre)?.temes;
	return meves()
		.sort(ordre)
		.filter((t) => !temes || temes.includes(t.tema));
};
// el que passa el lector: les de Notícies o, si s'ha obert des del Mercat, les de mercat
const llistaLector = () => (estat.lectorIds ? estat.lectorIds.map((id) => estat.dades.edicio.targetes.find((t) => t.id === id)).filter(Boolean) : targetesVisibles());
// les ja llegides al final; les urgents d'entre setmana ("nova") primer, les més noves davant; després, per importància
const ordre = (a, b) =>
	Number(estat.llegidesAbans.has(clau(a))) - Number(estat.llegidesAbans.has(clau(b))) ||
	(b.actualitzada ?? b.nova ?? '').localeCompare(a.actualitzada ?? a.nova ?? '') ||
	b.punts - a.punts;
const noves = () => meves().filter((t) => !estat.vistes.has(clau(t))).length;
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
const etiqueta = (tema, nova, actualitzada) =>
	`<span class="etiqueta" data-tema="${tema}">${icona(TEMES[tema].icona, 12)} ${TEMES[tema].nom}${
		actualitzada ? `<em class="nou actualitzada">Actualitzada · ${esc(dataCurta(actualitzada))}</em>` : nova ? `<em class="nou">Nou · ${esc(dataCurta(nova))}</em>` : ''
	}</span>`;
// el que es desa com a llegit: l'id, o l'id i la data de l'última actualització (així una actualitzada torna a ser nova)
const clau = (t) => t.clau ?? t.id;
const abans = (t) => (t.titol_abans ? `<small class="abans">Abans: ${esc(t.titol_abans)}</small>` : '');
const haPassat = (t) =>
	t.actualitzacions?.length
		? `<section class="ha-passat"><h3>Què ha passat</h3>${[...t.actualitzacions]
				.reverse()
				.map((a) => `<div><b>${esc(dataCurta(a.data))} · ${esc(a.titol)}</b>${(Array.isArray(a.text) ? a.text : [a.text]).map((x) => `<p>${esc(x)}</p>`).join('')}</div>`)
				.join('')}</section>`
		: '';

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
	const fila = (t, i) => `<li><button type="button" class="fila ${estat.vots[t.id] === -1 ? 'sobra' : ''} ${estat.vistes.has(clau(t)) ? 'vista' : ''}" data-obrir="${i}">
		<span class="fila-text">${etiqueta(t.tema, t.nova, t.actualitzada)}<b>${esc(t.titol)}</b>${abans(t)}${xifra(t)}${toques(t)}</span>
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
		<span class="portada-text">${etiqueta(primera.tema, primera.nova, primera.actualitzada)}<h2>${esc(primera.titol)}</h2>${abans(primera)}${xifra(primera)}${toques(primera)}</span>
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
	${
		e.targetes.length - meves().length
			? `<button type="button" class="cap-mercat" data-vista="mercat">${icona('mercat', 14)} ${e.targetes.length - meves().length} notícies de mercat: són al Mercat, al costat dels preus</button>`
			: ''
	}
	`;
}

// --- la bústia: els vots, les llegides i les notes arriben sols a Reshi (bustia.py), xifrats amb el codi, per ntfy.sh
// (un servei de missatges sense comptes). ntfy.sh els guarda 12 hores: el que Reshi encara no té es torna a enviar si fa
// més d'11 hores que es va enviar.
const NTFY = 'https://ntfy.sh/';
const TORNAR = 11 * 3600 * 1000;
const enviats = guardat.llegir('reshi-enviats', {}); // "v:id:vot", "l:id", "n:id", "a:id", "c:id:quan" -> quan es va enviar
const fresc = (k) => Date.now() - (enviats[k] ?? 0) < TORNAR;
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const b64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
let bustia = null;
async function obrirBustia() {
	const codi = guardat.llegir('reshi-codi', null);
	if (!codi || !estat.personal) return null;
	if (bustia?.codi === codi) return bustia;
	const c = normalitzat(codi);
	const tema = `reshi-${hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`reshi-bustia:${c}`))).slice(0, 32)}`;
	const sal = crypto.getRandomValues(new Uint8Array(16));
	const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(c), 'PBKDF2', false, ['deriveKey']);
	const iteracions = estat.privat?.iteracions ?? 250000;
	const clau = await crypto.subtle.deriveKey({name: 'PBKDF2', salt: sal, iterations: iteracions, hash: 'SHA-256'}, base, {name: 'AES-GCM', length: 256}, false, ['encrypt']);
	return (bustia = {codi, tema, sal: b64(sal), clau});
}
// el que Reshi encara no té i no s'ha enviat fa poc
function perEnviar() {
	const vots = {};
	for (const [id, v] of Object.entries(estat.vots)) if ((estat.votsReshi[id] ?? 0) !== v && !fresc(`v:${id}:${v}`)) vots[id] = v;
	const vistes = [...estat.vistes].filter((id) => !estat.vistesReshi.has(id) && !fresc(`l:${id}`)).slice(0, 80);
	const notes = estat.notes.filter((n) => !fresc(`n:${n.id}`));
	const activitat = estat.activitat.filter((a) => !fresc(`a:${a.id}`));
	const coses = estat.coses.filter((c) => !fresc(`c:${c.id}:${c.quan}`));
	return {vots, vistes, notes, activitat, coses};
}
let enviant = false;
async function enviar() {
	const p = perEnviar();
	if (enviant || (!Object.keys(p.vots).length && !p.vistes.length && !p.notes.length && !p.activitat.length && !p.coses.length)) return;
	const b = await obrirBustia().catch(() => null);
	if (!b) return;
	enviant = true;
	try {
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const xifrat = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, b.clau, new TextEncoder().encode(JSON.stringify(p)));
		const r = await fetch(NTFY + b.tema, {method: 'POST', body: JSON.stringify({sal: b.sal, iv: b64(iv), dades: b64(xifrat)})});
		if (!r.ok) throw new Error(r.status);
		const ara = Date.now();
		for (const [id, v] of Object.entries(p.vots)) enviats[`v:${id}:${v}`] = ara;
		for (const id of p.vistes) enviats[`l:${id}`] = ara;
		for (const n of p.notes) enviats[`n:${n.id}`] = ara;
		for (const a of p.activitat) enviats[`a:${a.id}`] = ara;
		for (const c of p.coses) enviats[`c:${c.id}:${c.quan}`] = ara;
		for (const [k, t] of Object.entries(enviats)) if (ara - t > 3 * 86400000) delete enviats[k];
		guardat.posar('reshi-enviats', enviats);
		estat.bustia = p.notes.length ? 'Enviat a Reshi.' : '';
		if (p.activitat.length && estat.desat) estat.desat.enviat = true;
	} catch {
		estat.bustia = 'No s’ha pogut enviar: ho tornaré a provar quan tinguis connexió.';
	} finally {
		enviant = false;
	}
	const caixa = document.getElementById('bustia-estat');
	if (caixa) caixa.textContent = estat.bustia;
	const avis = document.getElementById('desat');
	if (avis) avis.outerHTML = avisDesat();
}
let rellotge = null;
const enviarAviat = (ms = 2000) => {
	clearTimeout(rellotge);
	rellotge = setTimeout(enviar, ms);
};
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && enviar());
window.addEventListener('online', () => enviarAviat(0));

// --- Activitat: els passos de cada dia i el gimnàs (el mateix que la pàgina Activitat de Reshi, en petit) ---
const OBJECTIUS = {passos: 10000, gimnas: 2, pantalla: 60};
const diaDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const avui = () => diaDe(new Date());
const mil = (x) => Math.round(x).toLocaleString('ca-ES');
// el que escriu la drecera: "8420", "8420.6", "8420,6" o "8.420" (depèn de l'idioma de l'iPhone)
const llegirPassos = (t) => {
	const s = String(t ?? '').replace(/\s/g, '');
	const n = /^\d{1,3}([.,]\d{3})+$/.test(s) ? Number(s.replace(/[.,]/g, '')) : Number(s.replace(',', '.'));
	return s && Number.isFinite(n) && n >= 0 && n <= 200000 ? Math.round(n) : null;
};
// un apunt nou: el del mateix dia que encara no ha arribat es junta amb aquest (el nou mana) i es torna a enviar
function apuntar(a) {
	const abans = estat.activitat.find((x) => x.dia === a.dia);
	estat.activitat = [...estat.activitat.filter((x) => x.dia !== a.dia), {...abans, ...a, id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`}];
	guardat.posar('reshi-activitat', estat.activitat);
	enviarAviat(0);
}
// el temps de pantalla: el registre que escriuen les automatitzacions de l'iPhone, una línia per cada cop que s'obre o es
// tanca una app ("xarxes obre 2026-11-02 21:05:33"). Es junta cada obrir amb el tancar que ve després i surten els minuts
// de cada dia a les xarxes i als jocs. Una sessió de més de 4 hores és que s'ha perdut un tancar: no compta.
const PANTALLA = ['xarxes', 'jocs'];
function minutsPantalla(registre) {
	const fets = String(registre ?? '')
		.split(/[\r\n]+/)
		.map((l) => l.trim().split(/\s+/))
		.filter((x) => x.length >= 4 && PANTALLA.includes(x[0]) && /^(obre|tanca)$/.test(x[1]))
		.map(([cat, que, d, h]) => ({cat, que, t: new Date(`${d}T${h}`)}))
		.filter((x) => !Number.isNaN(x.t.getTime()))
		.sort((a, b) => a.t - b.t);
	const obert = {};
	const dies = {};
	for (const f of fets) {
		if (f.que === 'obre') {
			obert[f.cat] ??= f.t;
		} else if (obert[f.cat]) {
			const min = (f.t - obert[f.cat]) / 60000;
			if (min > 0 && min < 240) {
				const d = diaDe(obert[f.cat]);
				dies[d] = {xarxes: 0, jocs: 0, ...dies[d]};
				dies[d][f.cat] += min;
			}
			delete obert[f.cat];
		}
	}
	for (const d of Object.values(dies)) for (const k of PANTALLA) d[k] = Math.round(d[k]);
	return dies;
}
const temps = (min) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`);

// les dreceres: #passos=8420&dia=2026-11-02 (i &pantalla=<el registre>), #gimnas=1&dia=2026-11-02 o #historial=<un dia
// per línia>. Es desa, s'esborra de l'adreça i es diu
function delFragment() {
	const p = new URLSearchParams(location.hash.slice(1));
	if (!p.has('passos') && !p.has('gimnas') && !p.has('pantalla') && !p.has('historial')) return;
	history.replaceState(null, '', location.pathname + location.search);
	// l'historial de passos (una drecera d'un sol cop): una línia per dia, "2026-10-03 8420"
	if (p.has('historial')) {
		let n = 0;
		for (const l of p.get('historial').split(/[\r\n]+/)) {
			const [d, x] = l.trim().split(/\s+/);
			const passos = llegirPassos(x);
			if (/^20\d\d-\d\d-\d\d$/.test(d ?? '') && passos != null) {
				apuntar({dia: d, passos});
				n++;
			}
		}
		estat.desat = {text: n ? `Desat: els passos de ${n} ${n === 1 ? 'dia' : 'dies'}` : 'L’historial no portava cap dia', enviat: false};
		if (!p.has('passos') && !p.has('gimnas') && !p.has('pantalla')) return;
	}
	const dia = /^20\d\d-\d\d-\d\d$/.test(p.get('dia') ?? '') ? p.get('dia') : avui();
	const a = {dia};
	const passos = p.has('passos') ? llegirPassos(p.get('passos')) : null;
	if (passos != null) a.passos = passos;
	if (p.has('gimnas')) a.gimnas = p.get('gimnas') !== '0';
	const pantalla = minutsPantalla(p.get('pantalla'));
	for (const [d, minuts] of Object.entries(pantalla)) {
		if (d === dia) a.pantalla = minuts;
		else apuntar({dia: d, pantalla: minuts});
	}
	if (a.passos == null && a.gimnas == null && !a.pantalla && !Object.keys(pantalla).length) return;
	if (a.passos != null || a.gimnas != null || a.pantalla) apuntar(a);
	const delDia = pantalla[dia];
	const que = [
		a.passos != null ? `${mil(a.passos)} passos` : '',
		a.gimnas ? 'gimnàs fet' : a.gimnas === false ? 'gimnàs tret' : '',
		delDia ? `${temps(delDia.xarxes + delDia.jocs)} de pantalla` : '',
	]
		.filter(Boolean)
		.join(' i ');
	estat.desat = {text: `Desat: ${que || 'temps de pantalla'}${a.dia === avui() ? '' : ` (${dataCurta(a.dia)})`}`, enviat: false};
}
window.addEventListener('hashchange', () => {
	delFragment();
	pintar();
});
const avisDesat = () =>
	estat.desat
		? `<p class="desat" id="desat" role="status">${icona('fet', 16)}<span><b>${esc(estat.desat.text)}</b><small>${
				estat.desat.enviat ? 'Ja és de camí a Reshi.' : guardat.llegir('reshi-codi', null) ? 'L’envio a Reshi…' : 'Posa el codi a sota perquè arribi a Reshi.'
			}</small></span></p>`
		: '';
// els dies (el que té Reshi i, a sobre, el que encara és aquí), els objectius i els partits
function dadesActivitat() {
	const r = estat.activitatReshi;
	const dies = structuredClone(r?.dies ?? {});
	for (const a of estat.activitat) dies[a.dia] = {...dies[a.dia], ...(a.passos != null && {passos: a.passos}), ...(a.gimnas != null && {gimnas: a.gimnas}), ...(a.pantalla && {pantalla: a.pantalla})};
	return {dies, objectius: {...OBJECTIUS, ...r?.objectius}, partits: new Set((r?.partits ?? []).map((x) => x.data))};
}
// el temps de pantalla de l'últim dia que n'hi ha (avui o ahir): xarxes i jocs, contra el límit
function pantallaFitxa(dies, limit) {
	const ara = new Date();
	const quin = [avui(), diaDe(new Date(ara.getFullYear(), ara.getMonth(), ara.getDate() - 1))].find((d) => dies[d]?.pantalla);
	if (!quin) return '';
	const {xarxes = 0, jocs = 0} = dies[quin].pantalla;
	const total = xarxes + jocs;
	const max = Math.max(limit, total);
	return `<div class="act-pantalla ${total > limit ? 'passat' : ''}">
		<span class="act-pantalla-cap"><small>Pantalla ${quin === avui() ? 'avui' : 'ahir'}</small><b>${temps(total)}</b><small>${total > limit ? `${temps(total - limit)} més del límit` : `límit ${temps(limit)}`}</small></span>
		<span class="act-pantalla-barra" role="img" aria-label="Xarxes ${temps(xarxes)}, jocs ${temps(jocs)}"><i class="xarxes" style="width:${(xarxes / max) * 100}%"></i><i class="jocs" style="width:${(jocs / max) * 100}%"></i><em style="left:${(limit / max) * 100}%"></em></span>
		<span class="act-pantalla-llegenda"><span><i class="xarxes"></i>Xarxes ${temps(xarxes)}</span><span><i class="jocs"></i>Jocs ${temps(jocs)}</span></span>
	</div>`;
}
// --- les pestanyes Avui i Activitat: el resum de l'Arnau i la seva activitat sencera ---
const sumarDies = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dilluns = (d) => sumarDies(d, -((d.getDay() + 6) % 7));
const setmanaDe = (d) => [...Array(7)].map((_, i) => diaDe(sumarDies(dilluns(d), i)));
const ahir = () => diaDe(sumarDies(new Date(), -1));
// els passos que toca ensenyar: els d'avui si ja hi són; si no (la drecera va a les 23:00), els d'ahir
const passosRecents = (dies) => {
	const d = dies[avui()]?.passos != null ? avui() : ahir();
	return {d, quan: d === avui() ? 'Avui' : 'Ahir', passos: dies[d]?.passos};
};
const totalPantalla = (p) => (p ? (p.xarxes ?? 0) + (p.jocs ?? 0) : null);
const mitjana = (llista) => (llista.length ? llista.reduce((t, x) => t + x, 0) / llista.length : null);
const milers = (x) => `${(x / 1000).toLocaleString('ca-ES', {maximumFractionDigits: x >= 10000 ? 0 : 1})}k`;
// setmanes seguides complint l'objectiu de gimnàs; la d'ara, si encara no l'ha complert, no trenca la ratxa
function ratxaGimnas(dies, objectiu) {
	const primer = Object.keys(dies).sort()[0];
	if (!primer) return 0;
	let ratxa = 0;
	for (let d = dilluns(new Date()), ara = true; diaDe(sumarDies(d, 6)) >= primer; d = sumarDies(d, -7), ara = false) {
		if (setmanaDe(d).filter((x) => dies[x]?.gimnas).length >= objectiu) ratxa++;
		else if (!ara) break;
	}
	return ratxa;
}

// el cor de l'activitat: l'anell dels passos, el botó del gimnàs i el temps de pantalla
function activitatGran({dies, objectius}) {
	const {quan, passos} = passosRecents(dies);
	const pc = passos != null ? Math.min(1, passos / objectius.passos) : 0;
	const R = 52;
	const L = 2 * Math.PI * R;
	const gimnasAvui = !!dies[avui()]?.gimnas;
	return `<div class="act-cap gran">
			<div class="act-anell-gran">
				<svg class="act-anell" viewBox="0 0 120 120" role="img" aria-label="${Math.round(pc * 100)} % de l’objectiu"><circle cx="60" cy="60" r="${R}"/>${pc > 0 ? `<circle class="ple" cx="60" cy="60" r="${R}" stroke-dasharray="${(pc * L).toFixed(1)} ${L.toFixed(1)}"/>` : ''}</svg>
				<span><small>${quan}</small><b>${passos != null ? mil(passos) : '—'}</b><small>${passos != null ? `${Math.round(pc * 100)} % de ${mil(objectius.passos)}` : 'encara no han arribat'}</small></span>
			</div>
			<button type="button" class="act-gimnas gran" data-gimnas aria-pressed="${gimnasAvui}">${icona('pesa', 26)}<b>${gimnasAvui ? 'Gimnàs fet' : 'He anat al gimnàs'}</b><small>${gimnasAvui ? 'toca per treure-ho' : 'un toc i queda apuntat'}</small></button>
		</div>
		${pantallaFitxa(dies, objectius.pantalla)}`;
}
// la setmana en barres: passos (en daurat els dies de gimnàs, l'escut els partits)
function barresSetmana({dies, objectius, partits}, gran = false) {
	const setmana = setmanaDe(new Date());
	const max = Math.max(objectius.passos * 1.2, ...setmana.map((d) => dies[d]?.passos ?? 0));
	return `<ol class="act-setmana ${gran ? 'gran' : ''}">${setmana
		.map((d) => {
			const x = dies[d] ?? {};
			return `<li class="${x.gimnas ? 'gimnas' : ''} ${d === avui() ? 'avui' : ''} ${x.passos >= objectius.passos ? 'complert' : ''}">${gran ? `<b class="act-num">${x.passos != null ? milers(x.passos) : ''}</b>` : ''}<span class="act-barra">${gran ? `<em class="act-meta" style="bottom:${(objectius.passos / max) * 100}%"></em>` : ''}<i style="height:${x.passos ? Math.max(4, (x.passos / max) * 100) : 0}%"></i></span>
			<small>${DIES_CURTS[dia(d).getDay()].slice(0, 2)}</small>${partits.has(d) ? `<em class="act-partit" title="Partit del Real Tiesada">${icona('escut', 10)}</em>` : ''}</li>`;
		})
		.join('')}</ol>`;
}
// el temps de pantalla de la setmana: xarxes i jocs apilats, amb la ratlla del límit
function pantallaSetmana({dies, objectius}) {
	const setmana = setmanaDe(new Date());
	const limit = objectius.pantalla;
	const max = Math.max(limit * 1.3, ...setmana.map((d) => totalPantalla(dies[d]?.pantalla) ?? 0));
	const ara = mitjana(setmana.map((d) => totalPantalla(dies[d]?.pantalla)).filter((x) => x != null));
	const abans = mitjana(setmanaDe(sumarDies(new Date(), -7)).map((d) => totalPantalla(dies[d]?.pantalla)).filter((x) => x != null));
	if (ara == null && abans == null) return `<p class="act-peu">Encara no hi ha temps de pantalla: arribarà amb la drecera de la nit, quan les automatitzacions de les apps estiguin muntades.</p>`;
	return `<ol class="act-setmana gran pantalla">${setmana
		.map((d) => {
			const p = dies[d]?.pantalla;
			const t = totalPantalla(p);
			return `<li class="${d === avui() ? 'avui' : ''} ${t > limit ? 'passat' : ''}"><b class="act-num">${t != null ? (t >= 60 ? `${Math.floor(t / 60)}h${String(t % 60).padStart(2, '0')}` : `${t}′`) : ''}</b><span class="act-barra"><em class="act-meta" style="bottom:${(limit / max) * 100}%"></em><span class="act-pila" style="height:${t ? (t / max) * 100 : 0}%"><i class="jocs" style="flex-grow:${p?.jocs ?? 0}"></i><i class="xarxes" style="flex-grow:${p?.xarxes ?? 0}"></i></span></span><small>${DIES_CURTS[dia(d).getDay()].slice(0, 2)}</small></li>`;
		})
		.join('')}</ol>
		<p class="act-peu">${ara != null ? `<b>${temps(Math.round(ara))}</b> al dia de mitjana` : 'Aquesta setmana encara res'}${ara != null && abans != null ? ` · ${Math.abs(ara - abans) < 1 ? 'igual que' : `${temps(Math.round(Math.abs(ara - abans)))} ${ara < abans ? 'menys' : 'més'} que`} la setmana passada` : ''} · límit ${temps(limit)}</p>`;
}
// el mes en quadrets, com els de GitHub: més color, més passos; vora daurada, gimnàs; punt vermell, partit
const NOMS_MESOS = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
function mesQuadrets({dies, objectius, partits}) {
	const ara = new Date();
	const primer = new Date(ara.getFullYear(), ara.getMonth() + estat.mesAct, 1);
	const n = new Date(primer.getFullYear(), primer.getMonth() + 1, 0).getDate();
	const delMes = [...Array(n)].map((_, i) => diaDe(new Date(primer.getFullYear(), primer.getMonth(), i + 1)));
	const nivell = (p) => (p == null ? 'n0' : p >= objectius.passos ? 'n4' : p >= objectius.passos * 0.75 ? 'n3' : p >= objectius.passos * 0.5 ? 'n2' : 'n1');
	const m = mitjana(delMes.map((d) => dies[d]?.passos).filter((x) => x != null));
	const gimnasos = delMes.filter((d) => dies[d]?.gimnas).length;
	return `<div class="act-mes-cap"><button type="button" class="rodo-petit" data-mes="-1" aria-label="Mes anterior">${icona('enrere', 16)}</button><b>${NOMS_MESOS[primer.getMonth()]}${primer.getFullYear() !== ara.getFullYear() ? ` ${primer.getFullYear()}` : ''}</b><button type="button" class="rodo-petit" data-mes="1" ${estat.mesAct >= 0 ? 'disabled' : ''} aria-label="Mes següent">${icona('endavant', 16)}</button></div>
		<div class="act-quadrets">${['dl', 'dt', 'dc', 'dj', 'dv', 'ds', 'dg'].map((x) => `<small>${x}</small>`).join('')}${'<span></span>'.repeat((primer.getDay() + 6) % 7)}${delMes
			.map((d) => `<span class="q ${nivell(dies[d]?.passos)} ${dies[d]?.gimnas ? 'gimnas' : ''} ${d === avui() ? 'avui' : ''} ${d > avui() ? 'futur' : ''}">${Number(d.slice(8))}${partits.has(d) ? '<i></i>' : ''}</span>`)
			.join('')}</div>
		<p class="act-peu">${m != null ? `<b>${mil(m)}</b> passos al dia de mitjana` : 'Aquest mes no hi ha passos'} · <b>${gimnasos}</b> ${gimnasos === 1 ? 'dia' : 'dies'} de gimnàs</p>`;
}

// Avui: el resum de l'Arnau. L'activitat al davant, i després com van les notícies i els diners, i la nota per a Reshi
function vistaAvui() {
	const h = new Date().getHours();
	const salutacio = h < 6 ? 'Bona nit' : h < 14 ? 'Bon dia' : h < 21 ? 'Bona tarda' : 'Bona nit';
	if (!estat.personal)
		return `<header class="cap"><span class="sobre">${esc(dataLlarga(avui()))}</span><h1>${salutacio}, Arnau</h1></header>
	${formCodi('La teva part', 'Posa el codi per veure els teus passos, el gimnàs, el temps de pantalla i els diners. El mòbil el recordarà.')}`;
	const a = dadesActivitat();
	const {quan, passos} = passosRecents(a.dies);
	const pantalla = totalPantalla(a.dies[avui()]?.pantalla ?? a.dies[ahir()]?.pantalla);
	const frase = [passos != null ? `${quan.toLowerCase()} has fet ${mil(passos)} passos` : '', pantalla != null ? `${temps(pantalla)} de xarxes i jocs` : ''].filter(Boolean).join(' i ');
	const gimnasos = setmanaDe(new Date()).filter((d) => a.dies[d]?.gimnas).length;
	const n = noves();
	const msci = estat.dades.mercat?.actius?.find((x) => x.id === 'msci');
	return `<header class="cap"><span class="sobre">${esc(dataLlarga(avui()))}</span><h1>${salutacio}, Arnau</h1>${frase ? `<p>${esc(frase[0].toUpperCase() + frase.slice(1))}.</p>` : ''}</header>
	<section class="activitat">${activitatGran(a)}${barresSetmana(a)}
		<p class="act-peu"><b>${gimnasos} de ${a.objectius.gimnas}</b> dies de gimnàs aquesta setmana</p>
		<button type="button" class="act-mes-boto" data-vista="activitat">Tota l’activitat ${icona('endavant', 16)}</button>
	</section>
	<div class="resum-fitxes">
		<button type="button" data-vista="noticies">${icona('noticies', 20)}<b>${n ? `${n} ${n === 1 ? 'nova' : 'noves'}` : 'Al dia'}</b><small>Notícies</small></button>
		<button type="button" data-vista="mercat">${icona('mercat', 20)}<b>${estat.diners ? eur(estat.diners.total) : msci ? pct(msci.canvis.setmana) : '—'}</b><small>${estat.diners ? 'Els teus diners' : 'El MSCI World, la setmana'}</small></button>
		<button type="button" data-vista="llista">${icona('llista', 20)}<b>${dadesCoses().coses.filter((c) => c.estat !== 'comprada').length}</b><small>Coses per comprar</small></button>
		<button type="button" data-vista="vitrina">${icona('vitrina', 20)}<b>Vitrina</b><small>El que has fet</small></button>
	</div>
	${votsPerPassar()}`;
}

// Activitat sencera: avui, el gimnàs i la ratxa, la setmana de passos i de pantalla, i el mes en quadrets
function vistaActivitat() {
	const cap = `<header class="cap"><span class="sobre">Activitat</span><h1>La teva setmana</h1><p>Els passos arriben sols cada nit, el gimnàs amb un toc i el temps de pantalla de les xarxes i els jocs.</p></header>`;
	if (!estat.personal) return `${cap}${formCodi('La teva activitat', 'Posa el codi per veure-la.')}`;
	const a = dadesActivitat();
	const gimnasos = setmanaDe(new Date()).filter((d) => a.dies[d]?.gimnas).length;
	const ratxa = ratxaGimnas(a.dies, a.objectius.gimnas);
	return `${cap}
	<section class="activitat">${activitatGran(a)}</section>
	<div class="resum-fitxes xifres">
		<div>${icona('pesa', 18)}<b>${gimnasos}/${a.objectius.gimnas}</b><small>Gimnàs aquesta setmana</small></div>
		<div>${icona('espurna', 18)}<b>${ratxa}</b><small>${ratxa === 1 ? 'Setmana de ratxa' : 'Setmanes de ratxa'}</small></div>
	</div>
	<section class="activitat"><h2 class="etiqueta">${icona('peus', 12)} Passos d’aquesta setmana</h2>${barresSetmana(a, true)}<p class="act-peu">La ratlla és l’objectiu (${mil(a.objectius.passos)}). En daurat, els dies de gimnàs; l’escut, els partits del Real Tiesada.</p></section>
	<section class="activitat"><h2 class="etiqueta">${icona('mobil', 12)} Temps de pantalla</h2>${pantallaSetmana(a)}<p class="act-llegenda"><span><i class="xarxes"></i>Xarxes</span><span><i class="jocs"></i>Jocs</span></p></section>
	<section class="activitat"><h2 class="etiqueta">${icona('calendari', 12)} El mes</h2>${mesQuadrets(a)}</section>`;
}

// --- La llista de coses: el que vol comprar per a cada projecte, el que necessita ell i la carta de regals (la mateixa
// llista que a Reshi). El que s'afegeix o es canvia aquí va a una cua i arriba a Reshi per la bústia; de cada cosa mana el
// canvi més nou ("quan").
const araISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19);
const preuEur = (x) => `${x.toLocaleString('ca-ES', {minimumFractionDigits: x % 1 ? 2 : 0, maximumFractionDigits: 2})} €`;
function canviarCosa(c) {
	const abans = estat.coses.find((x) => x.id === c.id);
	estat.coses = [...estat.coses.filter((x) => x.id !== c.id), {...abans, ...c, quan: araISO()}];
	guardat.posar('reshi-coses', estat.coses);
	enviarAviat(0);
}
// les de Reshi i, a sobre, els canvis que encara són aquí
function dadesCoses() {
	const r = estat.cosesReshi;
	const per = new Map((r?.coses ?? []).map((c) => [c.id, {...c}]));
	for (const c of estat.coses) {
		const ja = per.get(c.id);
		if (!ja || (ja.quan ?? '') <= c.quan) per.set(c.id, {...ja, ...c, ...(c.estat === 'comprada' && ja?.estat !== 'comprada' && {comprada: c.quan.slice(0, 10)})});
	}
	const noms = new Map((r?.projectes ?? []).map((p) => [p.id, p.titol]));
	const coses = [...per.values()].filter((c) => !c.esborrada && c.nom).map((c) => ({...c, projecte_nom: noms.get(c.projecte) ?? c.projecte_nom}));
	coses.sort((a, b) => (b.creada ?? b.quan ?? '').localeCompare(a.creada ?? a.quan ?? ''));
	return {coses, projectes: r?.projectes ?? []};
}
const formCosa = (c, projectes) => `<form class="ll-form ${c ? 'editant' : ''}" id="${c ? 'form-cosa-edit' : 'form-cosa'}" ${c ? `data-id="${c.id}"` : ''}>
		<div class="ll-fila"><input name="nom" value="${esc(c?.nom ?? '')}" placeholder="Què vols? (p. ex. imants de 6 mm)" required maxlength="300" autocomplete="off"><button type="submit">${c ? 'Desar' : 'Afegir'}</button></div>
		<details ${c ? 'open' : ''}><summary>Preu, projecte, regal…</summary>
			<div class="ll-mes">
				<input name="preu" value="${c?.preu != null ? String(c.preu).replace('.', ',') : ''}" placeholder="Preu €" inputmode="decimal">
				<select name="projecte"><option value="">Per a mi</option>${projectes.map((p) => `<option value="${esc(p.id)}" ${c?.projecte === p.id ? 'selected' : ''}>${esc(p.titol)}</option>`).join('')}</select>
				<input name="enllac" value="${esc(c?.enllac ?? '')}" placeholder="Enllaç (opcional)" inputmode="url">
				<label class="ll-regal"><input type="checkbox" name="regal" ${c?.regal ? 'checked' : ''}>${icona('regal', 15)} És un regal que vull</label>
				${c ? `<button type="button" class="ll-cancel" data-editar="">Cancel·lar</button>` : ''}
			</div>
		</details>
	</form>`;
function vistaLlista() {
	const cap = `<header class="cap"><span class="sobre">Llista</span><h1>El que vols</h1><p>Per a cada projecte, el que necessites tu i la carta de regals. Quan una cosa es compra, compta a les despeses del projecte.</p></header>`;
	if (!estat.personal) return `${cap}${formCodi('La teva llista', 'Posa el codi per veure-la i afegir-hi coses.')}`;
	const {coses, projectes} = dadesCoses();
	const f = estat.filtreLlista;
	const dins = f === 'meu' ? coses.filter((c) => !c.projecte && !c.regal) : f === 'regals' ? coses.filter((c) => c.regal) : f !== 'tot' ? coses.filter((c) => c.projecte === f) : coses;
	const vull = dins.filter((c) => c.estat !== 'comprada');
	const comprades = dins.filter((c) => c.estat === 'comprada').sort((a, b) => (b.comprada ?? '').localeCompare(a.comprada ?? ''));
	const regals = coses.filter((c) => c.regal && c.estat !== 'comprada');
	const suma = (l) => l.reduce((t, c) => t + (c.preu ?? 0), 0);
	const filtres = [
		['tot', 'Tot', coses.filter((c) => c.estat !== 'comprada').length],
		['meu', 'Per a mi', coses.filter((c) => !c.projecte && !c.regal && c.estat !== 'comprada').length],
		['regals', 'Regals', regals.length],
		...projectes.filter((p) => coses.some((c) => c.projecte === p.id)).map((p) => [p.id, p.titol, coses.filter((c) => c.projecte === p.id && c.estat !== 'comprada').length]),
	];
	const fila = (c) =>
		estat.editantCosa === c.id
			? `<li class="ll-cosa editant">${formCosa(c, projectes)}</li>`
			: `<li class="ll-cosa ${c.estat === 'comprada' ? 'comprada' : ''}">
			<button type="button" class="ll-check" data-comprar="${c.id}" aria-pressed="${c.estat === 'comprada'}" aria-label="${c.estat === 'comprada' ? 'Tornar a «la vull»' : 'Marcar comprada'}">${c.estat === 'comprada' ? icona('fet', 14) : ''}</button>
			<button type="button" class="ll-text" data-editar="${c.id}"><b>${esc(c.nom)}</b><small>${c.regal ? `<span class="ll-xip regal">${icona('regal', 11)} Regal</span>` : ''}${c.projecte_nom ? `<span class="ll-xip">${esc(c.projecte_nom)}</span>` : ''}${!c.projecte && !c.regal ? '<span class="ll-xip meu">Per a mi</span>' : ''}</small></button>
			${c.enllac && /^https:\/\//.test(c.enllac) ? `<a class="ll-icona" href="${esc(c.enllac)}" target="_blank" rel="noopener" aria-label="Obrir l’enllaç">${icona('fletxa', 15)}</a>` : ''}
			<span class="ll-preu">${c.preu != null ? preuEur(c.preu) : ''}</span>
			<button type="button" class="ll-icona" data-esborrar="${c.id}" aria-label="Esborrar ${esc(c.nom)}">${icona('paperera', 15)}</button>
		</li>`;
	return `${cap}
	<section class="activitat">${formCosa(null, projectes)}</section>
	<nav class="filtres" aria-label="Filtres de la llista">${filtres.map(([id, nom, n]) => `<button type="button" data-filtre-llista="${esc(id)}" aria-pressed="${f === id}">${esc(nom)} <small>${n}</small></button>`).join('')}</nav>
	${regals.length ? `<button type="button" class="act-mes-boto" data-carta>${icona('regal', 16)} Carta de regals (${regals.length})</button>` : ''}
	<p class="ll-xifres"><span><b>${vull.length}</b> per comprar${suma(vull) ? ` · ${preuEur(suma(vull))}` : ''}</span><span>Gastat: <b>${preuEur(suma(comprades))}</b></span></p>
	${vull.length ? `<ul class="ll-llista">${vull.map(fila).join('')}</ul>` : '<p class="buit">Res per comprar aquí.</p>'}
	${comprades.length ? `<details class="ll-comprades"><summary>${icona('fet', 13)} ${comprades.length} ${comprades.length === 1 ? 'comprada' : 'comprades'}</summary><ul class="ll-llista">${comprades.map(fila).join('')}</ul></details>` : ''}`;
}
// la carta de regals: un full net, sense res de l'app, per fer-ne una captura
function vistaCarta() {
	const regals = dadesCoses().coses.filter((c) => c.regal && c.estat !== 'comprada');
	return `<div class="ll-carta" role="dialog" aria-modal="true" aria-label="Carta de regals">
		<button type="button" class="rodo" data-tancar-carta aria-label="Tancar">${icona('tancar', 18)}</button>
		<div class="ll-carta-paper">${icona('regal', 30)}<h1>La meva carta de regals</h1><p>Arnau</p>
			<ol>${regals.map((c) => `<li><b>${esc(c.nom)}</b>${c.preu != null ? `<span>${preuEur(c.preu)}</span>` : ''}${c.enllac ? `<small>${esc(c.enllac.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</small>` : ''}</li>`).join('')}</ol>
		</div>
	</div>`;
}
const llegirFormCosa = (form) => {
	const d = new FormData(form);
	const preu = String(d.get('preu') ?? '').trim().replace(',', '.');
	return {
		nom: String(d.get('nom') ?? '').trim(),
		preu: preu && Number.isFinite(Number(preu)) ? Number(preu) : null,
		projecte: String(d.get('projecte') ?? '') || null,
		enllac: String(d.get('enllac') ?? '').trim() || null,
		regal: d.get('regal') === 'on',
	};
};

// el formulari per enviar una nota a Reshi (una idea, un tema que vol seguir, una compra...): només amb el codi posat
function votsPerPassar() {
	if (!estat.personal) return '';
	const cua = estat.notes.length;
	return `<form class="passar" id="form-nota">
		<p><b>Envia una nota a Reshi.</b> Una idea, un tema que vols que segueixi, el que sigui: hi arriba sol. Els vots i les llegides també hi arriben sols.</p>
		<textarea name="text" rows="3" maxlength="2000" placeholder="Escriu aquí…" required></textarea>
		<button type="submit">Enviar a Reshi</button>
		<p class="bustia-estat" id="bustia-estat" aria-live="polite">${esc(estat.bustia || (cua ? `${cua} ${cua === 1 ? 'nota encara no ha arribat' : 'notes encara no han arribat'} a Reshi.` : ''))}</p>
	</form>`;
}

// --- Mercat: com està la setmana, per què, la cartera de prova de Reshi i què pot passar (el mateix que a Reshi) ---
const eur = (x) => `${Math.round(x).toLocaleString('ca-ES')} €`;
const pct = (x) => {
	const r = Math.round(x * 10) / 10; // si no s'ha mogut, "0 %", no "−0 %"
	return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toLocaleString('ca-ES', {maximumFractionDigits: 1})} %`;
};
const preu = (a) =>
	a.id === 'eurusd'
		? a.preu.toLocaleString('ca-ES', {minimumFractionDigits: 3, maximumFractionDigits: 3})
		: `${a.preu.toLocaleString('ca-ES', {maximumFractionDigits: a.preu > 1000 ? 0 : 2})} ${a.moneda === 'EUR' ? '€' : '$'}`;
// l'últim mes; a sobre, un punt el dia que va sortir cada notícia que hi toca (amb el número si n'hi ha més d'una)
const linia = (serie, puja, marques = []) => {
	const min = Math.min(...serie);
	const max = Math.max(...serie);
	const pts = serie.map((v, i) => `${((i / (serie.length - 1)) * 100).toFixed(2)},${(30 - ((v - min) / (max - min || 1)) * 26 - 2).toFixed(2)}`).join(' ');
	return `<div class="m-grafic"><svg class="m-linia ${puja ? 'puja' : 'baixa'}" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,30 ${pts} 100,30"/><polyline points="${pts}" vector-effect="non-scaling-stroke"/></svg>${marques
		.map(
			(x) =>
				`<button type="button" class="m-marca ${x.efecte} ${x.fets.length > 1 ? 'moltes' : ''}" style="left:${x.x}%;top:${(x.y / 30) * 100}%" data-noticia-cartera="${x.fets[0].id}" aria-label="${x.fets.length} notícies del ${dataBarra(x.data)}" title="${esc(x.fets.map((f) => f.titol).join(' · '))}">${x.fets.length > 1 ? x.fets.length : ''}</button>`,
		)
		.join('')}</div>`;
};
const dataBarra = (s) => s.split('-').reverse().join('/');
const diners = (x) => (x >= 1e6 ? `${Math.round(x / 1e6).toLocaleString('ca-ES')} M$` : `${Math.round(x / 1e3).toLocaleString('ca-ES')} mil $`);

// un termòmetre de por: el de les cripto va de 0 a 100; el VIX (borsa) sol estar a 20, a 30 hi ha por i a 40, pànic
function termo(nom, t, tipus) {
	const pos = tipus === 'cripto' ? t.valor : Math.min(100, Math.max(0, 50 - (t.valor - 20) * 2.5));
	const etiqueta = pos < 25 ? 'Molta por' : pos < 45 ? 'Por' : pos < 55 ? 'Neutral' : pos < 75 ? 'Confiança' : 'Eufòria';
	return `<div class="m-termo"><span>${nom}</span><b>${etiqueta}</b><div class="m-termo-barra"><i style="left:${pos}%"></i></div>
		<small>${tipus === 'cripto' ? `${t.valor} de 100` : `VIX ${t.valor.toLocaleString('ca-ES')}`}${t.fa_setmana != null ? ` · fa una setmana, ${t.fa_setmana.toLocaleString('ca-ES')}` : ''}</small></div>`;
}

// les notícies de mercat, en l'ordre de les causes i després la resta: el lector les passa des d'aquí
const idsMercat = () => {
	const s = estat.dades.setmana;
	const delsMotius = (s?.causes ?? []).map((x) => x.noticia).filter(Boolean);
	const altres = estat.dades.edicio.targetes
		.filter((t) => !delsMotius.includes(t.id) && (TEMES_MERCAT.includes(t.tema) || t.toca?.some((x) => MERCAT_TOCA.includes(x.actiu))))
		.map((t) => t.id);
	return [...delsMotius, ...altres].filter((id) => estat.dades.edicio.targetes.some((t) => t.id === id));
};
const filaNoticia = (t) => `<button type="button" class="m-noticia" data-noticia-mercat="${t.id}">
		${foto(t, 'fila-foto')}<span class="fila-text">${etiqueta(t.tema, t.nova, t.actualitzada)}<b>${esc(t.titol)}</b>${xifra(t)}</span>
	</button>`;

// on són els diners: una barra repartida i la llegenda amb els euros (el mateix que a Reshi)
function repartiment(parts) {
	const total = parts.reduce((t, x) => t + x.valor, 0);
	const pc = (v) => Math.round((v / total) * 100);
	return `<div class="m-rep">
		<h3 class="etiqueta">On són els diners</h3>
		<div class="m-rep-barra" role="img" aria-label="${parts.map((x) => `${esc(x.nom)} ${pc(x.valor)} %`).join(', ')}">${parts.map((x) => `<i style="flex-grow:${x.valor};background:${x.color}" title="${esc(x.nom)}: ${eur(x.valor)}"></i>`).join('')}</div>
		<ul class="m-rep-llegenda">${parts.map((x) => `<li><i style="background:${x.color}"></i><span>${esc(x.nom)}</span><b>${pc(x.valor)} %</b><small>${eur(x.valor)}</small></li>`).join('')}</ul>
	</div>`;
}

// dins del MSCI World: el mapa de rectangles (mida = pes al fons, color = la setmana), qui l'ha mogut, sectors i països
function dinsMsci(d, setmanaFons) {
	if (!d) return '';
	const W = 760;
	const H = 400;
	const rects = squarify(d.top.map((e) => ({...e, valor: e.pes})), 0, 0, W, H);
	const ord = [...d.top].filter((e) => e.aporta != null).sort((a, b) => a.aporta - b.aporta);
	const max = Math.max(...ord.map((e) => Math.abs(e.aporta)), 0.01);
	const barres = (llista, titol) => `<div class="m-barres"><h3 class="etiqueta">${titol}</h3><ul>${llista
		.map(([nom, pes]) => `<li><span>${esc(nom)}</span><span class="m-barra-fons"><i style="width:${(pes / llista[0][1]) * 100}%"></i></span><b>${pes.toLocaleString('ca-ES', {maximumFractionDigits: 1})} %</b></li>`)
		.join('')}</ul></div>`;
	return `<section class="m-bloc">
		<h2 class="m-titol">Dins del MSCI World <small>${d.empreses.toLocaleString('ca-ES')} empreses; aquestes ${d.top.length} en són el ${d.pes_top.toLocaleString('ca-ES')} %</small></h2>
		<div class="m-msci">
			<div class="m-mapa">
				<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Les empreses que més pesen al MSCI World i què han fet aquesta setmana">${rects
					.map(
						(r) => `<g><title>${esc(r.nom)}: ${r.pes.toLocaleString('ca-ES')} % del fons · aquesta setmana ${r.setmana != null ? pct(r.setmana) : '—'}</title>
					<rect x="${r.x + 1}" y="${r.y + 1}" width="${Math.max(0, r.w - 2)}" height="${Math.max(0, r.h - 2)}" rx="8" fill="${colorVariacio(r.setmana)}"/>
					${
						r.w > 80 && r.h > 50
							? `<text x="${r.x + 10}" y="${r.y + 26}" class="m-mapa-nom">${esc(r.nom)}</text><text x="${r.x + 10}" y="${r.y + 50}" class="m-mapa-pct">${r.setmana != null ? pct(r.setmana) : ''}</text>${r.h > 90 ? `<text x="${r.x + 10}" y="${r.y + r.h - 12}" class="m-mapa-pes">${r.pes.toLocaleString('ca-ES')} % del fons</text>` : ''}`
							: ''
					}</g>`,
					)
					.join('')}</svg>
				<p class="m-peu">La mida és el que pesa cada empresa al fons; el color, què ha fet aquesta setmana (verd puja, vermell baixa; més intens, més moviment).${setmanaFons != null ? ` El fons sencer: ${pct(setmanaFons)}.` : ''} Pesos de la fitxa de MSCI del ${dataBarra(d.data)}.</p>
			</div>
			<div class="m-qui">
				<h3 class="etiqueta">Qui ha mogut el fons aquesta setmana</h3>
				<ul>${ord
					.map(
						(e) => `<li><span>${esc(e.nom)}</span><span class="m-qui-eix"><i class="${e.aporta >= 0 ? 'puja' : 'baixa'}" style="width:${(Math.abs(e.aporta) / max) * 50}%;${e.aporta >= 0 ? 'left' : 'right'}:50%"></i></span><b class="${e.aporta >= 0 ? 'puja' : 'baixa'}">${pct(e.setmana)}</b></li>`,
					)
					.join('')}</ul>
				<p class="m-peu">La barra és quant ha empès el fons: el que ha fet l’empresa per com hi pesa.</p>
			</div>
			<div class="m-dos-barres">${barres(d.sectors, 'Per sectors')}${barres(d.paisos, 'Per països')}</div>
		</div>
	</section>`;
}

// els seus diners de debò: el compte i el pla, amb les compres estimades fins que n'hi ha la real
function dinersMeus() {
	const d = estat.diners;
	if (!d) return estat.personal ? '' : formCodi('Els teus diners', 'Posa el codi per veure el que tens de debò al compte i invertit.');
	const invertit = d.inversions.reduce((t, i) => t + i.valor, 0);
	const aportat = d.inversions.reduce((t, i) => t + i.aportat, 0);
	const guany = invertit - aportat - d.inversions.reduce((t, i) => t + i.saveback, 0);
	return `<section class="m-bloc">
		<h2 class="m-titol">Els meus diners <small>el que tens de debò a ${esc(d.compte.nom)}</small></h2>
		<div class="m-cartera m-dues m-meus">
			<div class="m-col">
				<div class="m-cartera-xifres">
					<div><span>Tot plegat</span><b>${eur(d.total)}</b><small>al compte i invertit</small></div>
					<div><span>Al compte</span><b>${eur(d.compte.saldo_ara)}</b><small>al ${d.compte.interes.toLocaleString('ca-ES')} %: uns ${eur(d.compte.interessos_any)} l’any nets</small></div>
					<div><span>Invertit</span><b>${eur(invertit)}</b><small class="${!aportat ? '' : guany >= 0 ? 'puja' : 'baixa'}">${aportat ? `${signeDiners(guany)} sobre el que hi has posat` : 'encara no ha començat'}</small></div>
				</div>
				${invertit > 0 ? repartiment([...d.inversions.filter((i) => i.valor > 0).map((i, k) => ({nom: i.nom, valor: i.valor, color: COLORS_PARTS[k % COLORS_PARTS.length]})), {nom: 'Al compte', valor: d.compte.saldo_ara, color: COLOR_RESERVA}]) : ''}
				<p class="m-costos">El saldo és el del ${dataBarra(d.compte.data)}, menys el que en treu el pla i més els interessos (ja sense el 19 % d’Hisenda). La nòmina que hi entra no la sé: dis-m’ho i el poso al dia.</p>
			</div>
			<ul class="m-posicions">${d.inversions
				.map(
					(i) => `<li><header><b>${esc(i.nom)}</b><span>${eur(i.import)} cada dia ${i.dia}</span><em class="m-proxima">Pròxima: ${dataBarra(i.proxima)}</em></header>
				${
					i.compres.length
						? `<p>Hi has posat <b>${eur(i.aportat)}</b>${i.saveback ? ` (més ${eur(i.saveback)} de Saveback)` : ''} · ara valen <b>${eur(i.valor)}</b>; si les vengués avui, en quedarien ${eur(i.net)}.</p>
				<div class="m-taula"><table class="m-compres"><thead><tr><th>Dia</th><th>Import</th><th>Preu</th><th>Part.</th><th></th></tr></thead><tbody>${[...i.compres]
					.reverse()
					.map(
						(x) => `<tr><td>${dataBarra(x.data)}</td><td>${eur(x.import)}</td><td>${x.preu.toLocaleString('ca-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td><td>${x.participacions.toLocaleString('ca-ES', {maximumFractionDigits: 3})}</td><td><em class="m-etiq ${x.saveback ? '' : x.estimada ? 'estimada' : 'real'}">${x.saveback ? 'Saveback' : x.estimada ? 'estimada' : 'real'}</em></td></tr>`,
					)
					.join('')}</tbody></table></div>`
						: `<p>El pla comença el <b>${dataBarra(i.inici)}</b>: ${eur(i.import)} cada mes, sense comissió. ISIN ${esc(i.isin)}. També hi va a parar l’1 % del Saveback de la targeta.</p>`
				}</li>`,
				)
				.join('')}</ul>
		</div>
	</section>`;
}
const signeDiners = (x) => `${x >= 0 ? '+' : '−'}${eur(Math.abs(x))}`;

// el Mercat, més net: una fila amb què li toca a cada cosa que té o mira (en triar-ne una, només queden les notícies
// d'aquella cosa), les causes de la setmana en targetes grans amb foto, i la llibreta d'encerts plegada en una línia.
// Que el fons i el compte són seus només es diu amb el codi posat (és el que hi ha a la part xifrada).
const ES_TEU = {msci: 'el teu pla', compte: 'el teu compte'};
const MERCAT_TOCA = ['msci', 'btc', 'eth', 'compte'];
const tocaA = (t, actiu) => !actiu || !!t.toca?.some((x) => x.actiu === actiu);
function queEtToca() {
	const grups = perActiu(estat.dades.edicio.targetes);
	if (!grups.length) return '';
	const d = estat.diners;
	const te = new Set(d ? ['compte', ...(d.inversions.length ? ['msci'] : [])] : []);
	return `<div class="m-que-toca" role="group" aria-label="Què li toca a cada cosa">${grups
		.map((g) => {
			const sentit = g.bo > g.dolent ? 'bo' : g.dolent > g.bo ? 'dolent' : 'depen';
			const text = [g.dolent ? `${g.dolent} en contra` : '', g.bo ? `${g.bo} a favor` : '', g.depen ? `${g.depen} depèn` : ''].filter(Boolean).join(' · ');
			return `<button type="button" class="m-toca-xip ${sentit} ${estat.filtreToca === g.actiu ? 'triat' : ''} ${te.has(g.actiu) ? 'meu' : ''}" data-filtre-toca="${g.actiu}" aria-pressed="${estat.filtreToca === g.actiu}">
			<span><b>${esc(NOMS_TOCA[g.actiu])}</b>${te.has(g.actiu) ? `<small>${ES_TEU[g.actiu]}</small>` : ''}</span>
			<span class="m-balanc-barra" aria-hidden="true">${g.bo ? `<i class="bo" style="flex-grow:${g.bo}"></i>` : ''}${g.depen ? `<i class="depen" style="flex-grow:${g.depen}"></i>` : ''}${g.dolent ? `<i class="dolent" style="flex-grow:${g.dolent}"></i>` : ''}</span>
			<em>${text}</em></button>`;
		})
		.join('')}</div>`;
}

const ESTAT_LLIBRETA = {encert: '✓', error: '✗', quiet: '–', pendent: '…'};
function laLlibreta() {
	const l = estat.dades.llibreta;
	if (!l?.fets.length) return '';
	const mirats = l.encerts + l.errors;
	const primera = l.fets.filter((x) => x.estat === 'pendent').sort((a, b) => a.mira.localeCompare(b.mira))[0];
	return `<details class="m-llibreta">
		<summary><span class="m-llibreta-marcador">${mirats ? `${l.encerts}/${mirats}` : '—'}</span>
			<span><b>Llibreta d’encerts</b><small>${mirats ? `${Math.round((l.encerts / mirats) * 100)} % d’encerts (a cara o creu, un 50 %)` : 'Encara no se n’ha pogut mirar cap'}${primera ? ` · ${l.pendents} per mirar, la primera el ${dataBarra(primera.mira)}` : ''}</small></span>
			<i class="m-llibreta-fletxa">⌄</i></summary>
		<ul class="m-llibreta-llista">${l.fets
			.map(
				(x) => `<li class="${x.estat}"><b class="m-llibreta-estat">${ESTAT_LLIBRETA[x.estat]}</b>
			<span><b>${esc(x.titol)}</b><small>${esc(NOMS_TOCA[x.actiu])}: deia <em class="m-que ${x.efecte}">${esc(x.que)}</em> · ${dataBarra(x.data)}</small></span>
			<em class="m-llibreta-canvi ${x.canvi == null ? '' : x.canvi >= 0 ? 'puja' : 'baixa'}">${x.canvi != null ? pct(x.canvi) : `es mira el ${dataBarra(x.mira)}`}</em></li>`,
			)
			.join('')}</ul>
		<p class="m-peu">Compara el preu del dia que va sortir la notícia amb el d’${l.dies} dies després. Un encert no vol dir que la notícia en fos la causa: serveix per veure si la manera d’explicar-ho té sentit.</p>
	</details>`;
}

function vistaMercat() {
	const m = estat.dades.mercat;
	const s = estat.dades.setmana;
	const c = estat.dades.cartera_prova;
	if (!m) return '<p class="buit">Encara no hi ha dades del mercat.</p>';
	const noticia = (id) => estat.dades.edicio.targetes.find((t) => t.id === id);
	const comEsta = `<section class="m-resum">
		<span class="etiqueta">${icona('mercat', 12)} Aquesta setmana${s?.to ? `<em>${esc(s.to)}</em>` : ''}</span>
		<p>${esc(s?.resum ?? 'Encara no hi ha l’anàlisi d’aquesta setmana.')}</p>
	</section>
	${m.termometres ? `<div class="m-termos">${m.termometres.borsa ? termo('Borsa', m.termometres.borsa, 'borsa') : ''}${m.termometres.cripto ? termo('Cripto', m.termometres.cripto, 'cripto') : ''}</div>` : ''}
	<div class="m-actius">${m.actius
		.map(
			(a) => `<article class="m-actiu ${a.canvis.setmana >= 0 ? 'puja' : 'baixa'}">
		<header><b>${esc(a.nom)}</b><span class="m-setmana ${a.canvis.setmana > 0 ? 'puja' : a.canvis.setmana < 0 ? 'baixa' : ''}">${a.canvis.setmana >= 0 ? '↗' : '↘'} ${pct(a.canvis.setmana)}</span></header>
		<span class="m-preu">${preu(a)}</span>
		${linia(a.serie, a.canvis.mes >= 0, marquesSobre(a.serie, a.dates, fetsDe(estat.dades.edicio.targetes, a.id, estat.dades.edicio.data)))}
		${s?.actius?.[a.id] ? `<p>${esc(s.actius[a.id])}</p>` : ''}
		<small class="m-mes">Un mes: ${pct(a.canvis.mes)}</small>
	</article>`,
		)
		.join('')}
		${m.tipus_bce !== undefined ? `<article class="m-actiu m-bce"><header><b>Tipus del BCE</b></header><span class="m-preu">${m.tipus_bce.toLocaleString('ca-ES', {minimumFractionDigits: 2})} %</span>${s?.actius?.compte ? `<p>${esc(s.actius.compte)}</p>` : ''}</article>` : ''}
	</div>
	<p class="m-peu">Preus del ${dataBarra(m.actualitzat.slice(0, 10))} a les ${m.actualitzat.slice(11)}.</p>`;

	const f = estat.filtreToca;
	const lligades = new Set((s?.causes ?? []).map((x) => x.noticia));
	const altres = estat.dades.edicio.targetes.filter((t) => !lligades.has(t.id) && (TEMES_MERCAT.includes(t.tema) || t.toca?.some((x) => MERCAT_TOCA.includes(x.actiu))) && tocaA(t, f));
	const causes = (s?.causes ?? []).map((x, i) => ({x, i, n: noticia(x.noticia)})).filter(({n}) => !f || (n && tocaA(n, f)));
	const perQue = s?.causes?.length
		? `<section class="m-bloc">
		<h2 class="m-titol">Per què està així</h2>
		${queEtToca()}
		<div class="m-causes-grans">${causes
			.map(
				({x, i, n}) => `<button type="button" class="m-causa ${n?.imatge ? 'amb-foto' : ''} ${n && estat.vistes.has(clau(n)) ? 'vista' : ''}" ${n ? `data-noticia-mercat="${n.id}"` : 'disabled'}>
			${n?.imatge ? `<img src="${esc(n.imatge)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
			<span class="m-causa-cos"><span class="m-num">${i + 1}</span><h3>${esc(x.titol)}</h3>
			${n?.xifra ? `<span class="m-causa-xifra"><b>${esc(n.xifra.valor)}</b><small>${esc(n.xifra.que)}</small></span>` : ''}
			<p>${esc(x.text)}</p>
			${n?.toca?.length ? `<span class="toques">${n.toca.filter((y) => MERCAT_TOCA.includes(y.actiu) || y.actiu === f).map((y) => pastilla(y, {petit: true})).join('')}</span>` : ''}</span>
		</button>`,
			)
			.join('')}</div>
		${altres.length ? `<h3 class="etiqueta">${icona('noticies', 12)} També aquesta setmana</h3><div class="m-altres">${altres.map(filaNoticia).join('')}</div>` : ''}
		${f && !causes.length && !altres.length ? `<p class="m-peu">Aquesta setmana no hi ha cap notícia de mercat que toqui ${esc(NOMS_TOCA[f])}.</p>` : ''}
	</section>`
		: '';

	const signe = (x) => `${x >= 0 ? '+' : '−'}${eur(Math.abs(x))}`;
	const cartera = c
		? `<section class="m-bloc">
		<h2 class="m-titol">Reshi Capital <small>10.000 € ficticis que gestiono jo, amb comissions i impostos de debò</small></h2>
		<div class="m-cartera m-dues">
			<div class="m-col">
			<div class="m-cartera-xifres">
				<div><span>Val ara</span><b>${eur(c.valor)}</b><small class="${c.valor >= c.capital ? 'puja' : 'baixa'}">${signe(c.valor - c.capital)} des del ${dataBarra(c.inici)}</small></div>
				<div><span>Si ho vengués tot avui</span><b class="${c.net >= c.capital ? 'puja' : 'baixa'}">${eur(c.net)}</b><small>després de comissions i impostos</small></div>
				${
					c.comparar.valor != null
						? `<div><span>Contra ${esc(c.comparar.nom)}</span><b class="${c.valor >= c.comparar.valor ? 'puja' : 'baixa'}">${signe(c.valor - c.comparar.valor)}</b><small>${c.valor >= c.comparar.valor ? 'de moment ho faig millor que el fons sol' : 'de moment el fons sol ho faria millor'}</small></div>`
						: ''
				}
			</div>
			${repartiment([
				...c.posicions.filter((x) => x.estat === 'oberta').map((x, i) => ({nom: x.nom, valor: x.valor, color: COLORS_PARTS[i % COLORS_PARTS.length]})),
				{nom: 'Reserva', valor: c.liquiditat.valor, color: COLOR_RESERVA},
			])}
			</div>
			<ul class="m-posicions">${c.posicions
				.filter((x) => x.estat === 'oberta')
				.map(
					(x) => `<li><header><b>${esc(x.nom)}</b><span>${eur(x.import)} → <strong>${eur(x.valor)}</strong></span><em class="${x.valor >= x.import ? 'puja' : 'baixa'}">${pct((x.valor / x.import - 1) * 100)}</em></header>
				<p>${esc(x.per_que)}</p><p class="m-vigilem">Què vigilo: ${esc(x.vigilem)}${x.net != null ? ` · Si la vengués avui, en quedarien ${eur(x.net)}.` : ''}</p></li>`,
				)
				.join('')}
				<li><header><b>Reserva al compte</b><span>${eur(c.liquiditat.import)} → <strong>${eur(c.liquiditat.valor)}</strong></span><em class="puja">${c.liquiditat.interes} % l’any</em></header><p>${esc(c.liquiditat.per_que)}</p></li>
			</ul>
			<p class="m-costos">${esc(c.costos.explica)}</p>
			<h3 class="etiqueta">Què he fet</h3>
			<ol class="m-moviments">${[...c.moviments]
				.reverse()
				.map((x) => `<li><b>${dataBarra(x.data)}</b> ${esc(x.text)}</li>`)
				.join('')}</ol>
		</div>
	</section>`
		: '';

	const ap = estat.dades.apostes;
	const preuDe = (x, moneda) => `${x.toLocaleString('ca-ES', {maximumFractionDigits: 2})} ${moneda === 'USD' ? '$' : '€'}`;
	const apostes = ap
		? `<section class="m-bloc">
		<h2 class="m-titol">Reshi Risc <small>1.000 € ficticis en jugades abans que passi alguna cosa: més risc, més emoció</small></h2>
		<div class="m-cartera">
			<div class="m-cartera-xifres">
				<div><span>Val ara</span><b>${eur(ap.valor)}</b><small class="${ap.valor >= ap.capital ? 'puja' : 'baixa'}">${signe(ap.valor - ap.capital)} des del ${dataBarra(ap.inici)}</small></div>
				<div><span>Si ho vengués tot avui</span><b class="${ap.net >= ap.capital ? 'puja' : 'baixa'}">${eur(ap.net)}</b><small>després de comissions i impostos</small></div>
				<div><span>Encerts</span><b>${ap.tancades ? `${ap.encerts} de ${ap.tancades}` : '—'}</b><small>${ap.tancades ? 'apostes tancades que han sortit bé' : 'encara no se n’ha tancat cap'}</small></div>
			</div>
			${repartiment([
				...ap.apostes.filter((x) => x.estat === 'oberta').map((x, i) => ({nom: x.nom, valor: x.valor ?? x.import, color: COLORS_PARTS[i % COLORS_PARTS.length]})),
				{nom: 'Reserva', valor: ap.reserva, color: COLOR_RESERVA},
			])}
			<ul class="m-apostes-llista">${ap.apostes
				.filter((x) => x.estat === 'oberta')
				.map(
					(x) => `<li>
				<header><b>${esc(x.nom)}</b><em class="${(x.valor ?? x.import) >= x.import ? 'puja' : 'baixa'}">${eur(x.import)} → ${eur(x.valor ?? x.import)}</em></header>
				<span class="m-esdeveniment">${icona('calendari', 12)} ${esc(x.esdeveniment)}</span>
				<div class="m-cami"><span class="m-cami-barra"><i style="left:${(x.cami ?? 0.5) * 100}%"></i></span>
					<span class="m-cami-etiquetes"><small class="baixa">${preuDe(x.stop, x.moneda)}</small><small>ara ${x.preu_ara ? preuDe(x.preu_ara, x.moneda) : '—'}</small><small class="puja">${preuDe(x.objectiu, x.moneda)}</small></span>
					<span class="m-cami-etiquetes"><small>venc si baixa aquí</small><small>recullo guanys aquí</small></span></div>
				<p>${esc(x.tesi)}</p>
				<p class="m-vigilem">Entrada a ${preuDe(x.preu, x.moneda)} el ${dataBarra(x.data)} ·${x.net != null ? ` si la vengués avui, en quedarien ${eur(x.net)} ·` : ''} ${x.dies >= 0 ? `queden ${x.dies} dies` : `límit ${dataBarra(x.limit)}`}</p>
			</li>`,
				)
				.join('')}</ul>
			<p class="m-costos">${esc(ap.costos.explica)}</p>
			${
				ap.apostes.some((x) => x.estat === 'tancada')
					? `<h3 class="etiqueta">Tancades</h3><ol class="m-moviments">${ap.apostes
							.filter((x) => x.estat === 'tancada')
							.map((x) => `<li><b class="${x.encert ? 'puja' : 'baixa'}">${x.encert ? '✓' : '✗'}</b> ${esc(x.nom)}: ${eur(x.import)} → ${eur(x.valor_sortida ?? x.import)}. ${esc(x.llico ?? '')}</li>`)
							.join('')}</ol>`
					: ''
			}
			<h3 class="etiqueta">Què he fet</h3>
			<ol class="m-moviments">${[...ap.historial]
				.reverse()
				.map((x) => `<li><b>${dataBarra(x.data)}</b> ${esc(x.text)}</li>`)
				.join('')}</ol>
		</div>
	</section>`
		: '';

	const futur = s?.que_pot_passar?.length
		? `<section class="m-bloc">
		<h2 class="m-titol">Què pot passar</h2>
		<ol class="m-futur">${s.que_pot_passar
			.map((x) => {
				const d = dia(x.data);
				const pr = x.polymarket?.ara;
				const fet = x.resultat
					? `<div class="m-resultat"><b>${x.resultat.com_esperat ? 'Ha passat el que s’esperava' : 'Sorpresa'}</b><p>${esc(x.resultat.text)}</p></div>`
					: '';
				return `<li class="${fet ? 'passat' : ''}"><span class="m-data"><small>${DIES_CURTS[d.getDay()]}</small><b>${d.getDate()}</b><small>${MESOS[d.getMonth()]}</small></span>
			<div><h3>${esc(x.titol)}</h3>${fet}
			${
				pr && !fet
					? `<a class="m-aposta" href="${esc(pr.url)}" target="_blank" rel="noopener"><span class="m-aposta-barra"><i style="width:${Math.round(pr.probabilitat * 100)}%"></i></span>
				<span><b>${Math.round(pr.probabilitat * 100)} %</b> aposta ${esc(x.polymarket.text)}</span>
				<small>Polymarket · ${diners(pr.volum)} apostats${pr.volum < 300000 ? ' · hi aposta poca gent: fiable a mitges' : ''}</small></a>`
					: ''
			}
			${fet ? '' : `<p><b>Si passa:</b> ${esc(x.si)}</p><p><b>Si no:</b> ${esc(x.si_no)}</p>`}</div></li>`;
			})
			.join('')}</ol>
		${
			s.apostes?.some((x) => x.ara)
				? `<ul class="m-apostes">${s.apostes
						.filter((x) => x.ara)
						.map((x) => `<li><a href="${esc(x.ara.url)}" target="_blank" rel="noopener"><b>${Math.round(x.ara.probabilitat * 100)} %</b> aposta ${esc(x.text)} <small>· ${diners(x.ara.volum)}</small></a></li>`)
						.join('')}</ul>`
				: ''
		}
		<p class="m-peu">Les probabilitats són el que hi aposta la gent amb diners de debò a Polymarket, no una previsió del Claude. Com més diners hi ha apostats, més s’hi pot confiar.</p>
	</section>`
		: '';

	return `<header class="cap">
		<span class="sobre">Mercat${s?.data ? ` · setmana del ${dataBarra(s.data)}` : ''}</span>
		<h1>Com està el mercat</h1>
	</header>
	${comEsta}${dinersMeus()}${perQue}${laLlibreta()}${dinsMsci(estat.dades.msci, m.actius.find((x) => x.id === 'msci')?.canvis.setmana)}${cartera}${apostes}${futur}
	<p class="m-peu">L’anàlisi es renova cada diumenge. Reshi analitza i explica: no és un assessor financer.</p>`;
}

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
			(p) => {
				// el que té web obre la web directament; la nota del projecte (amb el codi) queda en un botó petit
				const cos = `<span class="medalla">${icona(p.icona, 30)}</span>
			<span class="placa">${esc(PLACA[p.estat] ?? p.estat)}</span>
			<h2>${esc(p.titol)}</h2>
			<p>${esc(p.resum)}</p>`;
				return p.web
					? `<article class="trofeu">
		<a class="trofeu-obrir" href="${esc(p.web)}" target="_blank" rel="noopener" aria-label="Obrir la web de ${esc(p.titol)}">${cos}<span class="trofeu-web">Obrir la web ${icona('fletxa', 14)}</span></a>
		${estat.projectes?.[p.id] ? `<button type="button" class="trofeu-nota" data-projecte="${p.id}">Què he fet</button>` : ''}
	</article>`
					: `<article class="trofeu">
		<button type="button" class="trofeu-obrir" data-projecte="${p.id}" ${estat.projectes?.[p.id] ? '' : 'disabled'} aria-label="Obrir ${esc(p.titol)}">${cos}</button>
	</article>`;
			},
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
	const llista = llistaLector();
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
			${etiqueta(t.tema, t.nova, t.actualitzada)}
			<h2>${esc(t.titol)}</h2>
			${abans(t)}
			${xifra(t, 'xifra gran')}
			<p class="entradeta">${esc(t.frase)}</p>
			${haPassat(t)}
			<section class="explica"><h3>${t.actualitzacions?.length ? 'D’on venia' : 'Què passa'}</h3>${(Array.isArray(t.que_passa) ? t.que_passa : [t.que_passa]).map((x) => `<p>${esc(x)}</p>`).join('')}</section>
			${t.dades?.length ? `<section><h3>Les dades</h3><dl class="dades">${t.dades.map((d) => `<div><dt>${esc(d.valor)}</dt><dd>${esc(d.que)}</dd></div>`).join('')}</dl></section>` : ''}
			${
				t.fotos?.length
					? `<div class="fotos">${t.fotos.map((f) => `<figure><img src="${esc(f.url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('figure').remove()"><figcaption>${esc(f.font)}</figcaption></figure>`).join('')}</div>`
					: ''
			}
			${
				!t.te_per_que
					? ''
					: perTu
						? `<section class="per-tu"><h3>Per què t’importa</h3><p>${esc(perTu)}</p></section>`
						: `<section class="per-tu tancat"><h3>${icona('cadenat', 12)} Per què t’importa</h3><p>Posa el codi a la portada per veure-ho.</p></section>`
			}
			${t.que_canvia ? `<section><h3>Què pot canviar</h3><p>${esc(t.que_canvia)}</p></section>` : ''}
			${
				t.toca?.length
					? `<section class="que-et-fa"><h3>Què li fa al que tens o mires</h3><ul>${t.toca.map((x) => `<li>${pastilla(x)}<p>${esc(x.per_que)}</p></li>`).join('')}</ul></section>`
					: ''
			}
			<footer class="fonts">${t.fonts.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nom)} ${icona('fletxa', 12)}</a>`).join('')}</footer>
		</div>
		<div class="vots">
			<button type="button" data-vot="1" data-id="${t.id}" data-clau="${clau(t)}" aria-pressed="${vot === 1}">${icona('amunt', 18)} M’interessa</button>
			<button type="button" data-vot="-1" data-id="${t.id}" data-clau="${clau(t)}" aria-pressed="${vot === -1}">${icona('avall', 18)} Em sobra</button>
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
	<div class="marca"><img src="icona-192.png" alt=""><b>RESHI</b><button type="button" class="mode" data-mode aria-label="${modeClar() ? 'Passar al mode fosc' : 'Passar al mode clar'}">${icona(modeClar() ? 'lluna' : 'sol', 16)}</button>${estat.personal ? `<span class="obert" title="La part personal està oberta">${icona('obert', 13)}</span>` : ''}</div>
	<main class="pantalla">${avisDesat()}${{avui: vistaAvui, activitat: vistaActivitat, llista: vistaLlista, noticies: vistaNoticies, mercat: vistaMercat, vitrina: vistaVitrina}[estat.vista]()}</main>
	<nav class="pestanyes" aria-label="Seccions">
		<button type="button" data-vista="avui" aria-pressed="${estat.vista === 'avui'}">${icona('espurna', 20)}<span>Avui</span></button>
		<button type="button" data-vista="activitat" aria-pressed="${estat.vista === 'activitat'}">${icona('peus', 20)}<span>Activitat</span></button>
		<button type="button" data-vista="llista" aria-pressed="${estat.vista === 'llista'}">${icona('llista', 20)}<span>Llista</span></button>
		<button type="button" data-vista="noticies" aria-pressed="${estat.vista === 'noticies'}">${icona('noticies', 20)}<span>Notícies</span>${estat.dades && noves() ? `<i class="pastilla">${noves()}</i>` : ''}</button>
		<button type="button" data-vista="mercat" aria-pressed="${estat.vista === 'mercat'}">${icona('mercat', 20)}<span>Mercat</span></button>
	</nav>
	${estat.lector !== null ? vistaLector() : ''}
	${estat.carta ? vistaCarta() : ''}
	${estat.projecte && estat.projectes?.[estat.projecte] ? vistaProjecte() : ''}`;
	document.body.classList.toggle('llegint', estat.lector !== null || !!estat.projecte);
	if (estat.lector !== null) {
		const pistes = document.getElementById('pistes');
		pistes.scrollLeft = estat.lector * pistes.clientWidth;
		pistes.addEventListener('scroll', () => {
			const i = Math.round(pistes.scrollLeft / pistes.clientWidth);
			if (i === estat.lector) return;
			estat.lector = i;
			llegir(clau(llistaLector()[i]));
			document.getElementById('compte').textContent = `${i + 1} / ${llistaLector().length}`;
			document.querySelectorAll('.lector-punts i').forEach((p, j) => p.classList.toggle('ara', j === i));
		});
	}
}

function obrirLector(i) {
	estat.lector = i;
	llegir(clau(llistaLector()[i]));
	history.pushState({lector: true}, ''); // el botó d'enrere del mòbil tanca el lector en lloc de sortir de l'app
	pintar();
}
function tancarLector() {
	if (estat.lector === null) return;
	estat.lector = null;
	estat.lectorIds = null;
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
	} else if (b.dataset.noticiaMercat) {
		// des del Mercat: el lector passa les notícies de mercat, començant per la clicada
		estat.lectorIds = idsMercat();
		obrirLector(Math.max(0, estat.lectorIds.indexOf(b.dataset.noticiaMercat)));
	} else if (b.dataset.noticiaCartera) {
		// des d'un punt d'una línia: el lector passa les notícies del Mercat, començant per la clicada
		estat.lectorIds = idsMercat();
		if (!estat.lectorIds.includes(b.dataset.noticiaCartera)) estat.lectorIds.unshift(b.dataset.noticiaCartera);
		obrirLector(Math.max(0, estat.lectorIds.indexOf(b.dataset.noticiaCartera)));
	} else if (b.dataset.comprar) {
		const c = dadesCoses().coses.find((x) => x.id === b.dataset.comprar);
		if (c) canviarCosa({id: c.id, estat: c.estat === 'comprada' ? 'vull' : 'comprada'});
		pintar();
	} else if (b.dataset.esborrar) {
		const c = dadesCoses().coses.find((x) => x.id === b.dataset.esborrar);
		if (c && confirm(`Esborrar «${c.nom}» de la llista?`)) canviarCosa({id: c.id, esborrada: true});
		pintar();
	} else if (b.dataset.editar !== undefined) {
		estat.editantCosa = b.dataset.editar || null;
		pintar();
	} else if (b.dataset.filtreLlista) {
		estat.filtreLlista = b.dataset.filtreLlista;
		pintar();
	} else if (b.hasAttribute('data-carta')) {
		estat.carta = true;
		pintar();
	} else if (b.hasAttribute('data-tancar-carta')) {
		estat.carta = false;
		pintar();
	} else if (b.dataset.mes) {
		estat.mesAct = Math.min(0, estat.mesAct + Number(b.dataset.mes));
		pintar();
	} else if (b.hasAttribute('data-mode')) {
		posarMode(modeClar() ? 'fosc' : 'clar');
		pintar();
	} else if (b.hasAttribute('data-gimnas')) {
		apuntar({dia: avui(), gimnas: !dadesActivitat().dies[avui()]?.gimnas});
		pintar();
	} else if (b.hasAttribute('data-llegir-totes')) {
		for (const t of estat.dades.edicio.targetes) estat.vistes.add(clau(t));
		desarVistes();
		refreshLlegides();
		pintar();
	} else if (b.dataset.projecte) {
		const obert = !!estat.projecte;
		estat.projecte = b.dataset.projecte;
		if (!obert) history.pushState({projecte: true}, ''); // el botó d'enrere torna a la vitrina
		pintar();
		document.querySelector('.fitxa')?.scrollTo(0, 0);
	} else if (b.dataset.filtreToca) {
		estat.filtreToca = estat.filtreToca === b.dataset.filtreToca ? null : b.dataset.filtreToca;
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
	} else if (b.dataset.vot) {
		const v = Number(b.dataset.vot);
		const id = b.dataset.id;
		// treure un vot és un 0 (no esborrar-lo): així Reshi també el treu
		estat.vots[id] = estat.vots[id] === v ? 0 : v;
		guardat.posar('reshi-vots', estat.vots);
		llegir(b.dataset.clau ?? id);
		enviarAviat();
		b.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(estat.vots[id] === Number(x.dataset.vot))));
	}
});

document.addEventListener('submit', (ev) => {
	if (ev.target.id !== 'form-cosa' && ev.target.id !== 'form-cosa-edit') return;
	ev.preventDefault();
	const c = llegirFormCosa(ev.target);
	if (!c.nom) return;
	if (ev.target.id === 'form-cosa') canviarCosa({...c, id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, estat: 'vull', creada: araISO()});
	else canviarCosa({...c, id: ev.target.dataset.id});
	estat.editantCosa = null;
	pintar();
	document.querySelector('#form-cosa input[name="nom"]')?.focus();
});

document.addEventListener('submit', (ev) => {
	if (ev.target.id !== 'form-nota') return;
	ev.preventDefault();
	const text = String(new FormData(ev.target).get('text') ?? '').trim();
	if (!text) return;
	const ara = new Date();
	estat.notes.push({id: `${ara.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, text, quan: ara.toISOString().slice(0, 16).replace('T', ' ')});
	guardat.posar('reshi-notes', estat.notes);
	ev.target.reset();
	estat.bustia = 'Enviant…';
	document.getElementById('bustia-estat').textContent = estat.bustia;
	enviar();
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

// la llum que segueix el ratolí per sobre de les targetes (a l'ordinador): només es diu on és el ratolí; el dibuix és a estil.css
const TARGETES = '.m-actiu, .m-termo, .m-cartera-xifres > div, .m-resum, .m-futur > li, .m-cartera, .m-mapa, .m-qui, .m-dos-barres, .portada, .m-causes > li';
document.addEventListener(
	'pointermove',
	(ev) => {
		const el = ev.target.closest?.(TARGETES);
		if (!el) return;
		const r = el.getBoundingClientRect();
		el.style.setProperty('--x', `${ev.clientX - r.left}px`);
		el.style.setProperty('--y', `${ev.clientY - r.top}px`);
	},
	{passive: true},
);

document.addEventListener('keydown', (ev) => {
	if (estat.lector === null) return;
	const pistes = document.getElementById('pistes');
	if (ev.key === 'Escape') history.back();
	if (ev.key === 'ArrowRight') pistes.scrollBy({left: pistes.clientWidth, behavior: 'smooth'});
	if (ev.key === 'ArrowLeft') pistes.scrollBy({left: -pistes.clientWidth, behavior: 'smooth'});
});

async function arrencar() {
	delFragment(); // si l'ha obert una drecera (passos o gimnàs)
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
