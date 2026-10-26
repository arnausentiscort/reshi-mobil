// La guia de "Començar a invertir": què cal saber abans de posar diners en un MSCI World o en cripto, a Espanya.
// Informació general amb les fonts, comprovada a l'octubre del 2026: els preus i les condicions canvien, i abans de fer
// res cal mirar-ho a la web de cada lloc. No diu què ha de fer l'Arnau: li explica les opcions.

export const COMPROVAT = 'octubre del 2026';

export const GUIA = [
	{
		titol: 'Primer, el matalàs',
		xifra: '3-6 mesos',
		text: 'El que se sol recomanar és tenir guardats de 3 a 6 mesos de despeses en un compte que no baixi mai, abans d’invertir res. Així, si un dia et cal diners, no has de vendre just quan el mercat ha caigut.',
		fonts: [],
	},
	{
		titol: 'Un MSCI World: dues maneres de comprar-lo',
		xifra: '0,12-0,20 %',
		text: 'És el que costa l’any un fons MSCI World barat (el «TER»). Hi ha dues maneres de tenir-lo. Com a ETF, per exemple a Trade Republic: un «pla d’inversió» compra cada mes el que diguis sense comissió, i una compra puntual costa 1 €. O com a fons indexat (MyInvestor, Indexa...): la gràcia és que pots passar els diners d’un fons a un altre sense pagar impostos (el «traspàs»), i amb un ETF no.',
		fonts: [
			{nom: 'Rankia: Trade Republic', url: 'https://www.rankia.com/blog/mejores-brokers/5153157-trade-republic-opiniones-comisiones-regulacion-plataforma-analisis'},
			{nom: 'justETF: Trade Republic', url: 'https://www.justetf.com/es/comparacion/por-que-trade-republic.html'},
			{nom: 'ETF o fons indexat', url: 'https://calculafinanzas.es/guias/etf-vs-fondos-indexados-espana-2026'},
		],
	},
	{
		titol: 'Cripto: on es compra i què costa',
		xifra: '1 €',
		text: 'És el que cobra Trade Republic per cada compra o venda de cripto, més la diferència de preu entre comprar i vendre (l’«spread»). Revolut X cobra un 0,09 % en compres immediates. Bitpanda, al voltant de l’1-1,5 %. Recorda: el bitcoin ha caigut més d’un 70 % dues vegades, i l’ethereum més d’un 85 %. Molta gent hi posa només una part petita del que inverteix.',
		fonts: [
			{nom: 'Finect: on comprar cripto', url: 'https://www.finect.com/usuario/avillanuevae/articulos/mejores-brokers-invertir-criptomonedas'},
			{nom: 'Trade Republic o Revolut', url: 'https://www.rankia.com/blog/mejores-brokers/6583827-trade-republic-vs-revolut'},
		],
	},
	{
		titol: 'Impostos: només quan vens i guanyes',
		xifra: '19 %',
		text: 'Mentre no vens, no pagues res. Quan vens amb guanys, Hisenda se’n queda el 19 % dels primers 6.000 € de guany, el 21 % fins a 50.000 € i més a partir d’aquí. Amb cripto, igual. Trade Republic ja fa aquesta feina per tu a Espanya. Si tens més de 50.000 € en cripto en plataformes de fora, s’ha de declarar (model 721).',
		fonts: [
			{nom: 'Trams de l’estalvi 2026', url: 'https://guiafiscal.es/irpf/tramos-irpf-2026/'},
			{nom: 'Cripto a la renda', url: 'https://taxdown.es/criptomonedas-declaracion-renta'},
		],
	},
	{
		titol: 'Tot de cop o cada mes',
		xifra: 'cada mes',
		text: 'Posar-ho tot de cop sol guanyar més vegades, perquè el mercat acostuma a pujar. Repartir-ho en uns quants mesos protegeix d’entrar just abans d’una caiguda. Més avall tens què hauria passat amb els teus diners de les dues maneres. A més, cada mes hi pots afegir una part del que estalvies amb un pla automàtic.',
		fonts: [],
	},
];
