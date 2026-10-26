// Reshi al mòbil: les Notícies (amb la part personal xifrada) i la Vitrina. Sense llibreries: dades.json té l'edició
// pública i la vitrina, privat.json el "per què t'importa" de cada notícia, xifrat. El codi es posa un cop i el mòbil el
// recorda. Els vots, de moment, es guarden en aquest mòbil.
import {ICONES} from './icones.js';

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

const estat = {dades: null, vista: 'noticies', filtre: 'totes', personal: null, privat: null, vots: guardat.llegir('reshi-vots', {}), lector: null, error: null};

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
// les urgents d'entre setmana ("nova": el dia que van entrar) van primer, les més noves davant; després, per importància
const ordre = (a, b) => (b.nova ?? '').localeCompare(a.nova ?? '') || b.punts - a.punts;

const foto = (t, classe) =>
	t.imatge
		? `<span class="${classe}" data-tema="${t.tema}"><img src="${esc(t.imatge)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">${icona(TEMES[t.tema].icona, 28)}</span>`
		: `<span class="${classe}" data-tema="${t.tema}">${icona(TEMES[t.tema].icona, 28)}</span>`;

// la xifra que resumeix la notícia: grossa, en daurat
const xifra = (t, classe = 'xifra') => (t.xifra ? `<span class="${classe}"><b>${esc(t.xifra.valor)}</b><span>${esc(t.xifra.que)}</span></span>` : '');

const etiqueta = (tema, nova) =>
	`<span class="etiqueta" data-tema="${tema}">${icona(TEMES[tema].icona, 12)} ${TEMES[tema].nom}${nova ? `<em class="nou">Nou · ${esc(dataCurta(nova))}</em>` : ''}</span>`;

function vistaNoticies() {
	const e = estat.dades.edicio;
	const avui = new Date().toISOString().slice(0, 10);
	const llista = targetesVisibles();
	const [primera, ...resta] = llista;
	const agenda = e.agenda.filter((a) => a.data >= avui);
	return `
	<header class="cap">
		<span class="sobre">${esc(dataLlarga(e.data))}</span>
		<h1>${esc(e.titol)}</h1>
		<p>${esc(e.intro)}</p>
	</header>
	${
		estat.personal
			? ''
			: `<form class="cadenat" id="form-codi">
		<span class="cadenat-icona">${icona('cadenat', 18)}</span>
		<label for="codi"><b>La part que va per tu</b><span>Posa el codi i cada notícia et dirà per què t’importa. El mòbil el recordarà.</span></label>
		<div class="cadenat-fila">
			<input id="codi" name="codi" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX" maxlength="12">
			<button type="submit">Obrir</button>
		</div>
		${estat.error ? `<p class="cadenat-error">${esc(estat.error)}</p>` : ''}
	</form>`
	}
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
		<span class="portada-text">${etiqueta(primera.tema, primera.nova)}<h2>${esc(primera.titol)}</h2>${xifra(primera)}</span>
	</button>`
			: ''
	}
	<ul class="llista">${resta
		.map(
			(t, i) => `<li><button type="button" class="fila ${estat.vots[t.id] === -1 ? 'sobra' : ''}" data-obrir="${i + 1}">
		<span class="fila-text">${etiqueta(t.tema, t.nova)}<b>${esc(t.titol)}</b>${xifra(t)}</span>
		${foto(t, 'fila-foto')}
	</button></li>`,
		)
		.join('')}</ul>
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

function vistaVitrina() {
	const v = estat.dades.vitrina;
	return `
	<header class="cap">
		<span class="sobre">Vitrina</span>
		<h1>El que he fet</h1>
		<p>Els projectes dels quals estic orgullós: apps per a la colla, per a la família i els treballs de la carrera.</p>
	</header>
	<div class="vitrina">${v
		.map(
			(p) => `<article class="trofeu">
		<span class="medalla">${p.foto ? `<img src="portadas/${esc(p.foto)}" alt="">` : icona(p.icona, 30)}</span>
		<span class="placa">${esc(PLACA[p.estat] ?? p.estat)}</span>
		<h2>${esc(p.titol)}</h2>
		<p>${esc(p.resum)}</p>
		${p.web ? `<a href="${esc(p.web)}" target="_blank" rel="noopener">Obrir ${icona('fletxa', 14)}</a>` : ''}
	</article>`,
		)
		.join('')}</div>`;
}

function vistaLector() {
	const llista = targetesVisibles();
	return `<div class="lector" role="dialog" aria-modal="true" aria-label="Notícies">
	<div class="lector-barra">
		<button type="button" class="rodo" data-tancar aria-label="Tancar">${icona('tancar', 18)}</button>
		<span class="lector-compte" id="compte">${estat.lector + 1} / ${llista.length}</span>
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
	<main class="pantalla">${estat.vista === 'noticies' ? vistaNoticies() : vistaVitrina()}</main>
	<nav class="pestanyes" aria-label="Seccions">
		<button type="button" data-vista="noticies" aria-pressed="${estat.vista === 'noticies'}">${icona('noticies', 20)}<span>Notícies</span></button>
		<button type="button" data-vista="vitrina" aria-pressed="${estat.vista === 'vitrina'}">${icona('vitrina', 20)}<span>Vitrina</span></button>
	</nav>
	${estat.lector !== null ? vistaLector() : ''}`;
	document.body.classList.toggle('llegint', estat.lector !== null);
	if (estat.lector !== null) {
		const pistes = document.getElementById('pistes');
		pistes.scrollLeft = estat.lector * pistes.clientWidth;
		pistes.addEventListener('scroll', () => {
			const i = Math.round(pistes.scrollLeft / pistes.clientWidth);
			if (i === estat.lector) return;
			estat.lector = i;
			document.getElementById('compte').textContent = `${i + 1} / ${targetesVisibles().length}`;
			document.querySelectorAll('.lector-punts i').forEach((p, j) => p.classList.toggle('ara', j === i));
		});
	}
}

function obrirLector(i) {
	estat.lector = i;
	history.pushState({lector: true}, ''); // el botó d'enrere del mòbil tanca el lector en lloc de sortir de l'app
	pintar();
}
function tancarLector() {
	if (estat.lector === null) return;
	estat.lector = null;
	pintar();
}
window.addEventListener('popstate', tancarLector);

document.addEventListener('click', (ev) => {
	const b = ev.target.closest('button');
	if (!b) return;
	if (b.dataset.vista) {
		estat.vista = b.dataset.vista;
		pintar();
		window.scrollTo(0, 0);
	} else if (b.dataset.filtre) {
		estat.filtre = b.dataset.filtre;
		pintar();
	} else if (b.dataset.obrir !== undefined) {
		obrirLector(Number(b.dataset.obrir));
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
		b.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(estat.vots[id] === Number(x.dataset.vot))));
	}
});

document.addEventListener('submit', async (ev) => {
	if (ev.target.id !== 'form-codi') return;
	ev.preventDefault();
	const codi = new FormData(ev.target).get('codi') ?? '';
	try {
		estat.personal = await obrir(codi);
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
		const codi = guardat.llegir('reshi-codi', null);
		if (codi) estat.personal = await obrir(codi).catch(() => null); // el codi ha canviat: es torna a demanar
	} catch {
		estat.error = 'No he pogut carregar les notícies. Torna-ho a provar quan tinguis connexió.';
	}
	pintar();
}
arrencar();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
