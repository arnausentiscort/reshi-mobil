// Reshi al mòbil: les Notícies, el Mercat i la Vitrina. Sense llibreries: dades.json té l'edició pública, el mercat de
// la setmana (preus, anàlisi, la cartera de prova i les apostes) i la vitrina; privat.json, xifrat, el "per què
// t'importa" de cada notícia i les notes dels projectes. El codi es posa un cop i el mòbil el recorda. Els vots, de
// moment, es guarden en aquest mòbil.
import {COLOR_RESERVA, COLORS_PARTS, colorVariacio, squarify} from './grafics.js';
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

const estat = {
	dades: null,
	vista: 'noticies',
	filtre: 'totes',
	personal: null,
	privat: null,
	vots: guardat.llegir('reshi-vots', {}),
	lector: null,
	error: null,
	vistes: new Set(guardat.llegir('reshi-vistes', [])), // les que ja ha llegit (aquí o a l'ordinador)
	projecte: null, // el projecte de la vitrina obert
	lectorIds: null, // quan el lector s'obre des del Mercat: les notícies de mercat, en aquest ordre
	llegidesAbans: new Set(), // les llegides quan es va pintar la llista: l'ordre es fa amb aquestes perquè res salti mentre llegeix
};
const desarVistes = () => guardat.posar('reshi-vistes', [...estat.vistes]);
const llegir = (id) => {
	if (estat.vistes.has(id)) return;
	estat.vistes.add(id);
	desarVistes();
};
const refreshLlegides = () => (estat.llegidesAbans = new Set(estat.vistes));
// el que surt del privat.json: el "per què t'importa", les notes dels projectes i les llegides a l'ordinador
const aplicar = (obert) => {
	estat.personal = obert?.noticies ?? obert;
	estat.projectes = obert?.projectes ?? null; // la nota de cada projecte de la vitrina (què ha fet, què falta)
	estat.diners = obert?.diners ?? null; // els seus diners de debò
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
	Number(estat.llegidesAbans.has(a.id)) - Number(estat.llegidesAbans.has(b.id)) || (b.nova ?? '').localeCompare(a.nova ?? '') || b.punts - a.punts;
const noves = () => meves().filter((t) => !estat.vistes.has(t.id)).length;
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
	${
		e.targetes.length - meves().length
			? `<button type="button" class="cap-mercat" data-vista="mercat">${icona('mercat', 14)} ${e.targetes.length - meves().length} notícies de mercat: són al Mercat, al costat dels preus</button>`
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
const linia = (serie, puja) => {
	const min = Math.min(...serie);
	const max = Math.max(...serie);
	const pts = serie.map((v, i) => `${((i / (serie.length - 1)) * 100).toFixed(2)},${(30 - ((v - min) / (max - min || 1)) * 26 - 2).toFixed(2)}`).join(' ');
	return `<svg class="m-linia ${puja ? 'puja' : 'baixa'}" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,30 ${pts} 100,30"/><polyline points="${pts}" vector-effect="non-scaling-stroke"/></svg>`;
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
	const altres = estat.dades.edicio.targetes.filter((t) => TEMES_MERCAT.includes(t.tema) && !delsMotius.includes(t.id)).map((t) => t.id);
	return [...delsMotius, ...altres].filter((id) => estat.dades.edicio.targetes.some((t) => t.id === id));
};
const filaNoticia = (t) => `<button type="button" class="m-noticia" data-noticia-mercat="${t.id}">
		${foto(t, 'fila-foto')}<span class="fila-text">${etiqueta(t.tema, t.nova)}<b>${esc(t.titol)}</b>${xifra(t)}</span>
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
			(a) => `<article class="m-actiu">
		<header><b>${esc(a.nom)}</b><span class="m-setmana ${a.canvis.setmana > 0 ? 'puja' : a.canvis.setmana < 0 ? 'baixa' : ''}">${a.canvis.setmana >= 0 ? '↗' : '↘'} ${pct(a.canvis.setmana)}</span></header>
		<span class="m-preu">${preu(a)}</span>
		${linia(a.serie, a.canvis.mes >= 0)}
		${s?.actius?.[a.id] ? `<p>${esc(s.actius[a.id])}</p>` : ''}
		<small class="m-mes">Un mes: ${pct(a.canvis.mes)}</small>
	</article>`,
		)
		.join('')}
		${m.tipus_bce !== undefined ? `<article class="m-actiu m-bce"><header><b>Tipus del BCE</b></header><span class="m-preu">${m.tipus_bce.toLocaleString('ca-ES', {minimumFractionDigits: 2})} %</span>${s?.actius?.compte ? `<p>${esc(s.actius.compte)}</p>` : ''}</article>` : ''}
	</div>
	<p class="m-peu">Preus del ${dataBarra(m.actualitzat.slice(0, 10))} a les ${m.actualitzat.slice(11)}.</p>`;

	const lligades = new Set((s?.causes ?? []).map((x) => x.noticia));
	const altres = estat.dades.edicio.targetes.filter((t) => TEMES_MERCAT.includes(t.tema) && !lligades.has(t.id));
	const perQue = s?.causes?.length
		? `<section class="m-bloc">
		<h2 class="m-titol">Per què està així</h2>
		<ol class="m-causes">${s.causes
			.map((x, i) => {
				const n = noticia(x.noticia);
				return `<li><span class="m-num">${i + 1}</span><div><h3>${esc(x.titol)}</h3><p>${esc(x.text)}</p>${n ? filaNoticia(n) : ''}</div></li>`;
			})
			.join('')}</ol>
		${altres.length ? `<h3 class="etiqueta">${icona('noticies', 12)} Altres notícies de mercat</h3><div class="m-altres">${altres.map(filaNoticia).join('')}</div>` : ''}
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
				return `<li><span class="m-data"><small>${DIES_CURTS[d.getDay()]}</small><b>${d.getDate()}</b><small>${MESOS[d.getMonth()]}</small></span>
			<div><h3>${esc(x.titol)}</h3>
			${
				pr
					? `<a class="m-aposta" href="${esc(pr.url)}" target="_blank" rel="noopener"><span class="m-aposta-barra"><i style="width:${Math.round(pr.probabilitat * 100)}%"></i></span>
				<span><b>${Math.round(pr.probabilitat * 100)} %</b> aposta ${esc(x.polymarket.text)}</span>
				<small>Polymarket · ${diners(pr.volum)} apostats${pr.volum < 300000 ? ' · hi aposta poca gent: fiable a mitges' : ''}</small></a>`
					: ''
			}
			<p><b>Si passa:</b> ${esc(x.si)}</p><p><b>Si no:</b> ${esc(x.si_no)}</p></div></li>`;
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
	${comEsta}${dinersMeus()}${perQue}${dinsMsci(estat.dades.msci, m.actius.find((x) => x.id === 'msci')?.canvis.setmana)}${cartera}${apostes}${futur}
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
			${etiqueta(t.tema, t.nova)}
			<h2>${esc(t.titol)}</h2>
			${xifra(t, 'xifra gran')}
			<p class="entradeta">${esc(t.frase)}</p>
			<section class="explica"><h3>Què passa</h3>${(Array.isArray(t.que_passa) ? t.que_passa : [t.que_passa]).map((x) => `<p>${esc(x)}</p>`).join('')}</section>
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
			llegir(llistaLector()[i].id);
			document.getElementById('compte').textContent = `${i + 1} / ${llistaLector().length}`;
			document.querySelectorAll('.lector-punts i').forEach((p, j) => p.classList.toggle('ara', j === i));
		});
	}
}

function obrirLector(i) {
	estat.lector = i;
	llegir(llistaLector()[i].id);
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
