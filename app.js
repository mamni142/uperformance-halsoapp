/* Uperformance – hälsoappen (prototyp, exempeldata). Svenska namn.
   01 hjälp · 02 lagring och exempeldata · 03 kroppen (3D) · 04 skärmbyten · 05 intro och välkommen · 06 frågorna
   · 07 nivåvalet · 08 skapar profil · 09 hem: Idag · 10 Kropp · 11 Screening · 12 Jag · 13 arken · 14 händelser · 15 start */
(() => {
  'use strict';
  /* ---- 01 hjälp ---- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ik = (n, k = '') => `<svg class="${k}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const klamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lugn = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vanta = (ms) => new Promise((r) => setTimeout(r, lugn ? Math.min(ms, 60) : ms));
  const idag = () => new Date();
  const dagStr = (d) => d.toISOString().slice(0, 10);
  const dagar = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
  const fmt = (n, dec = 0) => Number(n).toLocaleString('sv-SE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const VECKODAG = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];
  const datumText = () => idag().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
  const halsning = () => { const h = idag().getHours(); return h < 10 ? 'God morgon' : h < 17 ? 'Hej' : 'God kväll'; };
  const app = $('#app'), skarmLager = $('#skarm'), flikrad = $('#flikrad');
  // Temat: samma app med Uperformances eller längdlandslagets presentation (?tema=landslaget). Egen data per tema.
  const TEMA = new URLSearchParams(location.search).get('tema') === 'landslaget' ? 'landslaget' : 'uperformance', LANDS = TEMA === 'landslaget';
  document.documentElement.dataset.tema = TEMA; document.body.dataset.tema = TEMA;
  if (LANDS) document.title = 'Längdlandslaget – Hälsoappen · koncept av Uperformance';
  const MATCH = LANDS ? 'Tävling' : 'Match';
  // Landslagets bakgrund bakom introt, välkommen och frågorna: norrsken, stjärnor, fjäll i två djup, snöfall och skidspår som ritas med en guldprick.
  if (LANDS) {
    const bg = document.createElement('div'); bg.className = 'ls-bg'; bg.setAttribute('aria-hidden', 'true');
    const fjall = (h, top, n) => { const p = Array.from({ length: n + 1 }, (_, i) => [i * 800 / n, i % 2 ? top + 58 + ((i * 13) % 3) * 8 : top + ((i * 37) % 5) * 7]); let d = `M0 ${h} L0 ${p[0][1]}`; for (let i = 0; i < n; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; d += ` Q${p[i][0].toFixed(0)} ${p[i][1].toFixed(0)} ${mx.toFixed(0)} ${my.toFixed(0)}`; } return d + ` L800 ${p[n][1]} L800 ${h} Z`; };
    const stj = Array.from({ length: 34 }, (_, i) => `<i style="--x:${(i * 53) % 100}%;--y:${(i * 29) % 46}%;--s:${(.6 + (i % 4) * .35).toFixed(2)};--d:${(-(i * .7) % 5).toFixed(2)}s"></i>`).join('');
    const sno = Array.from({ length: 48 }, (_, i) => `<b style="--x:${(i * 41 + 7) % 100}%;--s:${(1.2 + (i % 4) * .9).toFixed(1)}px;--t:${(7 + (i % 5) * 2.2).toFixed(1)}s;--d:${(-(i * .61)).toFixed(2)}s;--v:${((i % 7) - 3) * 9}px;--o:${(.35 + (i % 3) * .2).toFixed(2)}"></b>`).join('');
    bg.innerHTML = `<div class="ls-bg-ns"><i></i><i></i><i></i><i></i></div><div class="ls-bg-stj">${stj}</div><span class="ls-bg-glod"></span>
      <svg class="ls-bg-fjall ls-bg-fjarran" viewBox="0 0 800 200" preserveAspectRatio="none"><path d="${fjall(200, 40, 10)}"/><path transform="translate(800 0)" d="${fjall(200, 40, 10)}"/></svg>
      <svg class="ls-bg-fjall ls-bg-nara" viewBox="0 0 800 200" preserveAspectRatio="none"><path d="${fjall(200, 80, 6)}"/><path transform="translate(800 0)" d="${fjall(200, 80, 6)}"/></svg>
      <svg class="ls-bg-spar" viewBox="0 0 400 120" preserveAspectRatio="none"><path class="ls-spar-a" pathLength="1" d="M-10 110 C80 96 150 70 220 64 C290 58 340 34 410 20"/><path class="ls-spar-b" pathLength="1" d="M-10 118 C80 104 150 78 220 72 C290 66 340 42 410 28"/></svg>
      <span class="ls-bg-akare"><i></i></span><div class="ls-bg-sno">${sno}</div>`;
    app.insertBefore(bg, skarmLager);
  }

  /* ---- 02 lagring och exempeldata ---- */
  const NYCKEL = LANDS ? 'up-halsa-landslaget-v1' : 'up-halsa-v1';
  const nytt = () => ({ version: 1, profil: null, svar: { namn: '', fodd: 1992, kon: '', pass: '', ont: [], mal: [] }, checkin: [], pass: [], skador: [], dela: { team: true, medicin: true } });
  let st = (() => { try { const s = JSON.parse(localStorage.getItem(NYCKEL)); return s && s.version === 1 ? s : nytt(); } catch (err) { return nytt(); } })();
  const spara = () => { try { localStorage.setItem(NYCKEL, JSON.stringify(st)); } catch (err) { /* privat läge */ } };
  const niva = () => st.profil?.niva || document.body.dataset.niva || 'elit';
  const elit = () => niva() === 'elit';
  const alder = () => idag().getFullYear() - (st.profil?.fodd || st.svar.fodd || 1992);
  const alderGrupp = () => { const a = alder(); const l = Math.floor(a / 10) * 10; return `${l}–${l + 9} år`; };
  const konText = () => ({ kvinna: 'kvinnor', man: 'män' }[st.profil?.kon] || 'alla');

  // Exempeldata skapas när profilen skapas: fyra veckors pass och check-ins (märkt exempel i gränssnittet).
  function exempeldata(p) {
    const pass = [], checkin = [];
    const typer = LANDS ? (p.niva === 'elit' ? ['Klassiskt', 'Styrka', 'Skate', 'Intervaller', 'Rullskidor', 'Återhämtning'] : ['Klassiskt', 'Skate', 'Löpning', 'Styrka', 'Klassiskt'])
      : p.niva === 'elit' ? ['Lagträning', 'Styrka', 'Lagträning', 'Löpning', 'Match', 'Återhämtning'] : ['Promenad', 'Löpning', 'Styrka', 'Cykel', 'Promenad'];
    let fro = 7;
    for (let d = 27; d >= 1; d--) {
      const dag = dagar(-d), vd = dag.getDay();
      const tranar = p.niva === 'elit' ? vd !== 1 : [1, 3, 6].includes(vd) || (p.pass === '5+' && vd === 5);
      if (tranar) {
        const typ = p.niva === 'elit' && vd === 6 ? MATCH : typer[(d * 3) % typer.length];
        const min = typ === MATCH ? 95 : typ === 'Återhämtning' ? 35 : 45 + ((d * 7) % 5) * 10;
        const rpe = typ === MATCH ? 8 : typ === 'Återhämtning' ? 3 : 4 + ((d * 5) % 4);
        pass.push({ datum: dagStr(dag), typ, min, rpe: Math.min(9, rpe + (d < 7 ? 1 : 0)) });
      }
      fro = klamp(fro + ((d * 13) % 5) - 2, 5, 9);
      checkin.push({ datum: dagStr(dag), somn: klamp(fro, 3, 10), energi: klamp(fro - 1 + (d % 2), 3, 10), omhet: klamp(10 - fro + (d % 3), 1, 8), stress: klamp(4 + (d % 4), 1, 8), humor: klamp(fro, 4, 10) });
    }
    const skador = [];
    if (p.niva === 'elit') {
      const ont = (p.ont || []).filter((z) => z.niva >= 4)[0];
      if (ont) skador.push({ region: ont.id, start: dagStr(dagar(-9)), typ: 'Belastning', aterfall: false });
    }
    return { pass, checkin, skador };
  }

  /* ---- 03 kroppen (3D) ---- */
  const REGION_NAMN = { huvud: 'Huvud', nacke: 'Nacke', 'axel-v': 'Vänster axel', 'axel-h': 'Höger axel', brost: 'Bröst', 'ovre-rygg': 'Övre rygg', landrygg: 'Ländrygg', mage: 'Mage',
    'armbage-v': 'Vänster armbåge', 'armbage-h': 'Höger armbåge', 'handled-v': 'Vänster handled', 'handled-h': 'Höger handled', 'hoft-v': 'Vänster höft', 'hoft-h': 'Höger höft',
    'ljumske-v': 'Vänster ljumske', 'ljumske-h': 'Höger ljumske', 'lar-v': 'Vänster lår (fram)', 'lar-h': 'Höger lår (fram)', 'baklar-v': 'Vänster baksida lår', 'baklar-h': 'Höger baksida lår',
    'kna-v': 'Vänster knä', 'kna-h': 'Höger knä', 'vad-v': 'Vänster vad', 'vad-h': 'Höger vad', 'fotled-v': 'Vänster fotled', 'fotled-h': 'Höger fotled' };
  const regionNamn = (id) => (window.UPKropp?.REGIONER?.find((r) => r.id === id)?.namn) || REGION_NAMN[id] || id;
  const scen = $('#kropp-scen');
  let kropp = null, kroppReserv = false, kroppForm = '';
  const onskadForm = () => ((st.profil?.kon || st.svar.kon) === 'kvinna' ? 'kvinna' : 'man');
  // Byter kroppsform (efter frågan om kön) – nätet byggs i bakgrunden innan kroppen syns igen.
  function kroppForm$() { if (!kropp || kroppForm === onskadForm()) return; const p = scen.parentElement; try { kropp.forstor?.(); } catch (err) {} kropp = null; scen.innerHTML = ''; kroppStart(); if (p !== app) kroppZoner(); }
  let kroppVantar = false;
  function kroppStart() {
    if (kropp || kroppReserv) return;
    // kropp.js kan laddas som modul (three.js + modell): vänta på händelsen upkropp, reserv efter 9 s
    if (!window.UPKropp && !kroppVantar) {
      kroppVantar = true;
      const klar = () => { clearTimeout(t); kroppVantar = false; kroppStart(); if (scen.parentElement !== app) { kroppZoner(); kropp?.satLage?.(niva()); } };
      const t = setTimeout(() => { removeEventListener('upkropp', klar); kroppVantar = false; kroppReserv = true; ritaReserv(); }, 9000);
      addEventListener('upkropp', klar, { once: true }); return;
    }
    if (kroppVantar) return;
    try {
      if (window.UPKropp?.montera) {
        kroppForm = onskadForm();
        kropp = window.UPKropp.montera(scen, { lage: niva(), kropp: kroppForm, interaktiv: true, autoVrid: true, etiketter: true });
        kropp.onVal?.((id, p) => kroppVald(id, p));
        return;
      }
    } catch (err) { console.warn('3D-kroppen kunde inte startas', err); }
    kroppReserv = true; ritaReserv();
  }
  // Reserv utan WebGL: en stilren silhuett i SVG med samma zoner.
  const RESERV_PUNKT = { huvud: [50, 14], nacke: [50, 27], 'axel-v': [68, 36], 'axel-h': [32, 36], brost: [50, 45], 'ovre-rygg': [50, 42], landrygg: [50, 78], mage: [50, 66],
    'armbage-v': [76, 64], 'armbage-h': [24, 64], 'handled-v': [80, 90], 'handled-h': [20, 90], 'hoft-v': [61, 88], 'hoft-h': [39, 88], 'ljumske-v': [56, 98], 'ljumske-h': [44, 98],
    'lar-v': [59, 115], 'lar-h': [41, 115], 'baklar-v': [59, 120], 'baklar-h': [41, 120], 'kna-v': [58, 142], 'kna-h': [42, 142], 'vad-v': [58, 165], 'vad-h': [42, 165], 'fotled-v': [58, 190], 'fotled-h': [42, 190] };
  function ritaReserv() {
    const zoner = (aktivaZoner()).map((z) => { const p = RESERV_PUNKT[z.id]; return p ? `<circle class="zon" cx="${p[0]}" cy="${p[1]}" r="${3 + z.niva * .5}"/>` : ''; }).join('');
    scen.innerHTML = `<div class="kropp-reserv"><svg viewBox="0 0 100 205" data-reserv><g class="silhuett"><circle cx="50" cy="14" r="10"/><path d="M42 26h16l2 6 14 4c3 1 5 4 5 7l3 46c0 3-4 3-5 0l-5-40-2 22-1 20 4 50 1 40c0 3-6 3-7 0l-6-58-2-30-2 30-6 58c-1 3-7 3-7 0l1-40 4-50-1-20-2-22-5 40c-1 3-5 3-5 0l3-46c0-3 2-6 5-7l14-4z"/></g>${zoner}</svg></div>`;
    const svg = $('[data-reserv]', scen);
    svg.addEventListener('click', (ev) => {
      const r = svg.getBoundingClientRect(); const x = (ev.clientX - r.left) / r.width * 100, y = (ev.clientY - r.top) / r.height * 205;
      let bast = null, d0 = 1e9; for (const [id, p] of Object.entries(RESERV_PUNKT)) { if (/ovre-rygg|baklar/.test(id)) continue; const d = Math.hypot(p[0] - x, p[1] - y); if (d < d0) { d0 = d; bast = id; } }
      kroppVald(d0 < 16 ? bast : null, { x: ev.clientX - r.left, y: ev.clientY - r.top });
    });
  }
  function aktivaZoner() {
    if (st.profil) return st.profil.ont || [];
    return st.svar.ont || [];
  }
  function kroppZoner() { const z = flik === 'kropp' && kroppLage === 'test' && st.profil ? baslinjeZoner() : flik === 'kropp' && kroppLage === 'med' ? [] : aktivaZoner().map((x) => ({ id: x.id, niva: x.niva }));
    if (kropp?.satZoner) kropp.satZoner(z); else if (kroppReserv) ritaReserv(); }
  // Flyttar kroppen in i vyns plats (samma WebGL-kontext – inget laddas om).
  function kroppTill(skarmEl) {
    const plats = skarmEl && $('[data-kropp-plats]', skarmEl);
    if (plats) {
      kroppStart();
      plats.appendChild(scen); scen.hidden = false;
      kropp?.fortsatt?.(); kroppZoner();
      kropp?.satLage?.(niva());
    } else {
      kropp?.pausa?.(); scen.hidden = true; app.appendChild(scen);
    }
  }
  let kroppValFn = null; // vyn som visas bestämmer vad ett tryck gör
  function kroppVald(id, p) { if (kroppValFn) kroppValFn(id, p); }

  /* ---- 04 skärmbyten ---- */
  let nu = null, flik = null;
  let senasteByte = 0;
  function visa(html, { in: inn = 'fram', ut = null, klass = '', flikar = false, efter, kvar = 440 } = {}) {
    if (!flikar) delete document.body.dataset.sida; // snön faller bara på Idag
    const gammal = $('.skarm:not([data-ut])', skarmLager);
    const ny = document.createElement('div');
    ny.className = `skarm ${klass}${flikar ? ' med-flikrad' : ''}`;
    ny.innerHTML = html; ny.dataset.in = inn; if (inn === 'tona' && gammal && !lugn) ny.dataset.efter = '';
    if (gammal) { gammal.dataset.ut = ut || inn; setTimeout(() => gammal.remove(), lugn ? 0 : kvar); }
    skarmLager.appendChild(ny);
    if (inn === 'mjuk' && gammal) ny.scrollTop = gammal.scrollTop; // samma flik: stå kvar där man var
    // Spökklick: klicket som följer ett tryck (pekskärm) får inte landa i den nya vyn. Den tar emot tryck först när den har landat.
    ny.dataset.laser = ''; senasteByte = performance.now(); setTimeout(() => ny.removeAttribute('data-laser'), lugn ? 0 : 420);
    // data-in står kvar: tas den bort byter elementen animationsregel och entrén spelas en gång till (såg ut som en omladdning)
    flikrad.hidden = !flikar;
    kroppValFn = null;
    kroppTill(ny);
    forbered(ny);
    efter && efter(ny);
    const kompakt = $('#kompakt'); app.removeAttribute('data-rullad');
    if (flikar) { const h = $('.hem-topp h1', ny), namn = h ? h.textContent : ($(`[data-flik="${flik}"] span`, flikrad)?.textContent || ''); kompakt.innerHTML = `<span>${e(namn)}</span>`; ny.addEventListener('scroll', () => app.toggleAttribute('data-rullad', ny.scrollTop > 56), { passive: true }); }
    nu = ny; return ny;
  }
  // Ringar, räknare, reglage och segment i en ny vy.
  function forbered(el) {
    $$('[data-ring]', el).forEach((r) => { const c = $('.bage', r); const R = +c.getAttribute('r'); const L = 2 * Math.PI * R; c.style.strokeDasharray = L; c.style.strokeDashoffset = L;
      requestAnimationFrame(() => requestAnimationFrame(() => { c.style.strokeDashoffset = L * (1 - klamp(+r.dataset.ring, 0, 100) / 100); })); });
    $$('[data-trio] .trio-bage', el).forEach((c) => { const L = 2 * Math.PI * +c.getAttribute('r'); c.style.strokeDasharray = L; c.style.strokeDashoffset = L;
      requestAnimationFrame(() => requestAnimationFrame(() => { c.style.strokeDashoffset = L * (1 - Math.max(.02, +c.dataset.v / 100)); })); });
    $$('[data-rakna]', el).forEach((n) => rakna(n, +n.dataset.rakna, +(n.dataset.dec || 0)));
    $$('input[type=range]', el).forEach(reglageFarg);
    $$('.segment', el).forEach(segmentMarkor);
  }
  function rakna(n, till, dec = 0) {
    if (lugn) { n.textContent = fmt(till, dec); return; }
    const t0 = performance.now(), dur = 1100;
    const steg = (t) => { const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 3); n.textContent = fmt(till * k, dec); if (p < 1) requestAnimationFrame(steg); };
    requestAnimationFrame(steg);
  }
  function reglageFarg(r) { const p = (r.value - r.min) / (r.max - r.min) * 100; r.style.setProperty('--p', `${p}%`); }
  function segmentMarkor(seg) {
    const m = $('.segment-markor', seg), knappar = $$('button', seg), i = knappar.findIndex((b) => b.getAttribute('aria-pressed') === 'true');
    if (!m) return; if (i < 0) { m.style.opacity = 0; return; }
    m.style.opacity = 1; m.style.transform = `translateX(calc(${i * 100}% + ${i * 4}px))`;
  }
  // Toasten: ett glaspiller med bock. Ny text medan den syns → den studsar om (data-visas tas bort en bildruta).
  function toast(text) {
    const t = $('#toast'), var_ = t.hasAttribute('data-visas');
    t.innerHTML = `<span class="toast-ikon">${ik('bock')}</span><span>${e(text)}</span>`;
    clearTimeout(toast.t); delete t.dataset.visas;
    const visa_ = () => { t.dataset.visas = ''; };
    if (var_) requestAnimationFrame(() => requestAnimationFrame(visa_)); else { void t.offsetWidth; visa_(); }
    toast.t = setTimeout(() => delete t.dataset.visas, 2600);
  }
  // Firandet (ersätter konfettin): en mjuk ljuspuls – två ringar som vidgas och tolv tunna ljusstrålar som lyser upp och tonar bort.
  function konfetti(x = '50%', y = '40%') {
    if (lugn) return; const k = document.createElement('div'); k.className = 'puls-fest'; k.style.left = x; k.style.top = y;
    k.innerHTML = `<i class="pf-ring"></i><i class="pf-ring pf-ring2"></i><i class="pf-karna"></i>${Array.from({ length: 12 }, (_, i) => `<b style="--a:${i * 30}deg;--d:${(i % 3) * 40}ms"></b>`).join('')}`;
    app.appendChild(k); setTimeout(() => k.remove(), 1400);
  }

  // Temabytet som en rund våg från punkten man tryckte på.
  function bytNiva(ny, x, y) {
    const satt = () => { document.body.dataset.niva = ny; $('meta[name=theme-color]').content = ny === 'elit' ? '#0b1520' : '#f6f4ef'; kropp?.satLage?.(ny); };
    if (document.body.dataset.niva === ny) return;
    if (document.startViewTransition && !lugn) {
      document.documentElement.style.setProperty('--vx', `${x}px`); document.documentElement.style.setProperty('--vy', `${y}px`);
      const vt = document.startViewTransition(satt);
      // ett nytt byte mitt i det förra hoppar över det gamla – det är väntat, inget fel
      [vt.ready, vt.finished, vt.updateCallbackDone].forEach((p) => p?.catch(() => {}));
    } else satt();
  }

  /* ---- 05 intro och välkommen ---- */
  function splash() {
    document.body.dataset.niva = 'elit';
    // Partiklar som sakta stiger (bara transform/opacitet), ett norrsken som andas och loggan i fyra takter.
    const partiklar = Array.from({ length: 26 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--y:${(i * 53) % 100}%;--s:${.6 + ((i * 7) % 5) / 4};--d:${-(i * .43).toFixed(2)}s;--t:${7 + (i % 5)}s"></i>`).join('');
    const el = visa(`<div class="intro-norrsken" aria-hidden="true"><i></i><i></i><i></i></div><div class="intro-partiklar" aria-hidden="true">${partiklar}</div><div class="intro-golv" aria-hidden="true"></div>
      <div class="splash-mark">
        <span class="splash-puls"></span><span class="splash-puls" style="animation-delay:1.85s"></span><span class="splash-halo"></span>
        <span class="komet" aria-hidden="true"></span>
        <svg viewBox="0 0 396 396"><path class="splash-spar" d="M198,10c103.9,0,188,84,188,187.5s-84.1,187.5-188,187.5S10,301,10,197.5,94.1,10,198,10Z"/><path class="splash-ring" d="M198,10c103.9,0,188,84,188,187.5s-84.1,187.5-188,187.5S10,301,10,197.5,94.1,10,198,10Z"/>
        ${LANDS ? '<path class="splash-u ls-flinga" d="M198 110v176M122 154l152 88M122 242l152-88M198 110l-18 18M198 110l18 18M198 286l-18-18M198 286l18-18M122 154l25 4M122 154l9 23M274 242l-25-4M274 242l-9-23M122 242l9-23M122 242l25-4M274 154l-9 23M274 154l-25 4"/>' : ''}<path class="splash-u${LANDS ? ' ls-dold' : ''}" d="M177.5,127.8v88.6c0,7.3,1.6,13,4.7,17.3,3.3,4.1,8.4,6.2,15.5,6.2s12.4-2.1,15.8-6.2c3.4-4.3,5.1-10.1,5.1-17.3v-88.6h49.1v88.6c0,14.9-3.1,27.8-9.3,38.4-6.2,10.5-14.7,18.4-25.5,23.8-10.8,5.3-22.9,8-36.2,8s-25.2-2.7-35.5-8c-10.2-5.3-18.2-13.2-24-23.8-5.8-10.5-8.7-23.3-8.7-38.4v-88.6h49.1-.1Z"/></svg>
      </div>
      <div class="splash-ord">${LANDS ? '<b class="ls-ordmarke" aria-label="Längdlandslaget">Längdlandslaget</b>' : '<svg viewBox="440 140 840 120" class="ordmarke" aria-label="Uperformance"><use href="#logo" width="1274.2" height="395"/></svg>'}<p>${(LANDS ? 'Koncept av Uperformance' : 'Hälsa med elitstandard').split('').map((t, i) => `<span style="--k:${i}">${t === ' ' ? '&nbsp;' : t}</span>`).join('')}</p></div>
      <div class="intro-laddar" aria-hidden="true"><i></i></div>`, { in: 'tona', klass: 'splash' });
    kroppStart(); // nätet byggs medan loggan ritas
    introTakt(el);
  }
  // Introts takt (ms från att loggan visas, stilarna i css/intro.css avsnitt 12): loggan är färdig 2,8 s → välkommen läggs
  // färdig under loggan (inklippt till noll – kroppen hinner få sin storlek och ritas utan att något hackar i vågen)
  // → 3,15 s, eller när kroppen är ritad (högst 3,9 s): märket drar ihop sig och välkommen öppnar sig som en rund våg ur
  // logotypens ring. Ett tryck var som helst under loggan hoppar direkt till vågen. Minskad rörelse: lugn tvärtoning.
  function introTakt(el) {
    const T = lugn ? { minst: 1200, mest: 1200 } : { fore: 2600, minst: 3150, mest: 3900 };
    const tider = [], efter = (ms, fn) => tider.push(setTimeout(fn, ms));
    const efterBild = (fn, n) => requestAnimationFrame(() => (n > 1 ? efterBild(fn, n - 1) : fn()));
    let vk = null, oppnad = false, obs = null;
    const fore = () => { if (vk || st.profil || lugn || !el.isConnected) return; vk = valkommen({ fore: true }); };
    const oppna = () => {
      if (oppnad || !el.isConnected) return; oppnad = true;
      tider.forEach(clearTimeout); obs?.disconnect(); app.removeEventListener('pointerdown', hoppa, true);
      if (lugn) { el.dataset.oppnar = 'lugn'; setTimeout(() => (st.profil ? hem('idag', { in: 'tona' }) : valkommen()), 380); return; }
      el.dataset.oppnar = 'vag';
      if (st.profil) { setTimeout(() => hem('idag', { in: 'avslojning', kvar: 1300 }), 260); return; }
      // hoppade man fram innan välkommen låg färdig: lägg den nu och låt den tunga första bilden passera innan vågen går
      if (vk) introVag(el, vk); else { fore(); efterBild(() => introVag(el, vk), 2); }
    };
    // kroppens första bild är tung (storlek + första ritningen): vänta två bilder och en kort stund innan vågen går
    const klarSnart = () => efterBild(() => efter(140, oppna), 2);
    const hoppa = () => oppna();
    app.addEventListener('pointerdown', hoppa, true);
    if (T.fore) efter(T.fore, fore);
    efter(T.minst, () => {
      if (st.profil || kroppReserv || scen.hasAttribute('data-kr-klar')) return oppna();
      obs = new MutationObserver(() => { if (scen.hasAttribute('data-kr-klar')) { obs.disconnect(); klarSnart(); } });
      obs.observe(scen, { attributes: true, attributeFilter: ['data-kr-klar'] });
      efter(T.mest - T.minst, oppna);
    });
  }
  // Vågen: välkommen klipps upp från ringens radie till hela skärmen, och en ljuskant (.intro-vag) följer klippets kant exakt
  // (samma tid och kurva – radien och skalan växer lika). Splashen tonar bort under och tas bort när vågen har landat.
  function introVag(el, vk) {
    const b = skarmLager.getBoundingClientRect(), R = Math.ceil(Math.hypot(b.width / 2, b.height / 2) + 48);
    const r0 = 66.5 * (($('.splash-mark', el)?.offsetWidth) || 140) / 140; // logotypens ring: r 188 av 396 i märket
    const ring = document.createElement('div'); ring.className = 'intro-vag'; ring.setAttribute('aria-hidden', 'true');
    for (const x of [vk, ring]) { x.style.setProperty('--vag-r', `${R}px`); x.style.setProperty('--vag-r0', `${r0.toFixed(1)}px`); x.style.setProperty('--vag-s0', (r0 / R).toFixed(4)); }
    skarmLager.appendChild(ring);
    vk.dataset.avsloj = 'oppen';
    setTimeout(() => { ring.remove(); el.remove(); if (vk.isConnected) vk.dataset.vagKlar = ''; }, 1400);
  }
  function valkommen({ fore = false } = {}) {
    document.body.dataset.niva = 'elit';
    return visa(`<div class="valkommen-topp in" style="--i:0">${LANDS ? '<span class="marke ls-marke"><b>LÄNGDLANDSLAGET</b><small>Koncept av Uperformance</small></span>' : '<span class="marke"><svg viewBox="0 0 1274.2 395" aria-label="Uperformance"><use href="#logo"/></svg></span>'}<span class="exempel">${LANDS ? 'Koncept' : 'Prototyp'}</span></div>
      <div class="valkommen-kropp"><div class="bana" aria-hidden="true"></div>
        <span class="bana-chip" style="--i:0">${ik('rorlighet')}Rörlighet</span><span class="bana-chip" style="--i:1">${ik('hantel')}Styrka</span>
        <span class="bana-chip" style="--i:2">${ik('balans')}Balans</span><span class="bana-chip" style="--i:3">${ik('hjarta')}Kondition</span>
        <div data-kropp-plats></div></div>
      <div class="valkommen-text"><h1 class="in" style="--i:1">${LANDS ? 'Hela säsongen. <span class="skimmer">En app.</span>' : 'Hälsa med <span class="skimmer">elitstandard.</span>'}</h1>
        <p class="in" style="--i:2">${LANDS ? 'Kroppen, passen, vallan och loppen – för längdlandslaget. Ett koncept av Uperformance med exempeldata.' : 'Din kropp, dina värden och nästa steg – i en app. Testtillfället blir en ögonblicksbild, appen gör det till ett program.'}</p></div>
      <div class="valkommen-fot in" style="--i:3"><button class="knapp knapp-primar knapp-bred" data-g="borja">Skapa din profil ${ik('pil')}</button>
        <span class="liten">5 frågor · ungefär en minut</span></div>`, { in: fore ? 'avslojning' : 'tona', kvar: fore ? 60000 : 1300, klass: 'valkommen',
      // fore: läggs under loggan och väntar inklippt (data-avsloj = vantar) tills introVag öppnar den; splashen tas bort av introVag
      efter: (ny) => { kroppValFn = () => {}; if (fore) ny.dataset.avsloj = 'vantar'; else if (lugn && $('.splash', skarmLager)) ny.dataset.avsloj = 'lugn'; } });
  }

  /* ---- 06 frågorna ---- */
  const MAL = [['ma', 'Må bättre i vardagen', 'sol'], ['skador', 'Förebygga skador', 'skold'], ['prestera', 'Prestera bättre', 'blixt'], ['tillbaka', 'Komma tillbaka efter skada', 'uppdatera'], ['orka', 'Orka mer på jobbet', 'batteri']];
  const PASS = [['salan', 'Sällan', 'Mindre än ett pass i veckan', 'mane'], ['1-2', '1–2 pass', 'Promenader, gym eller en runda', 'sko'], ['3-4', '3–4 pass', 'Regelbunden träning', 'hantel'], ['5+', '5 pass eller fler', 'Tränar nästan varje dag', 'blixt']];
  function fraga(n, riktning = 'fram') {
    const s = st.svar;
    const topp = `<div class="fraga-topp in" style="--i:0"><button class="ikonknapp" data-g="fraga-bak" aria-label="Tillbaka">${ik('bak')}</button>
      <div class="steg-rad" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<i ${i <= n ? 'data-klar' : ''} ${i === n ? 'data-nu' : ''}></i>`).join('')}</div><span class="steg-tal">${n}/5</span></div>`;
    const fortsatt = !!$('.fraga-skarm:not([data-ut])', skarmLager); // frågan efter en fråga: toppen och knappen står still, bara innehållet byts
    let inre = '', klar = false;
    if (n === 1) {
      inre = `<span class="ogon in" style="--i:1">Profil</span><h2 class="in" style="--i:2">Vad ska vi kalla dig?</h2><p class="under in" style="--i:3">Ditt förnamn räcker.</p>
        <div class="fraga-svar in" style="--i:4"><input class="textfalt" id="namn" autocomplete="given-name" autocapitalize="words" maxlength="24" placeholder="Förnamn" value="${e(s.namn)}"></div>
        <p class="fraga-not in" style="--i:5">${ik('las')}Svaren sparas bara på den här enheten.</p>`;
      klar = s.namn.trim().length > 0;
    } else if (n === 2) {
      const ar = []; for (let y = idag().getFullYear() - 14; y >= 1940; y--) ar.push(y);
      inre = `<span class="ogon in" style="--i:1">Normvärden</span><h2 class="in" style="--i:2">När är du född?</h2><p class="under in" style="--i:3">Vi jämför dina värden med normvärden för din ålder och ditt kön.</p>
        <div class="fraga-svar stapel-luft"><div class="hjul in" style="--i:4"><div class="hjul-lista" data-hjul tabindex="0" aria-label="Födelseår">${ar.map((y) => `<button type="button" data-ar="${y}" tabindex="-1">${y}</button>`).join('')}</div><span class="hjul-etikett" data-hjul-alder></span></div>
        <div class="segment in" style="--i:5" role="group" aria-label="Kön"><span class="segment-markor"></span>${[['kvinna', 'Kvinna'], ['man', 'Man'], ['annat', 'Vill inte ange']].map(([v, t]) => `<button type="button" data-g="kon" data-v="${v}" aria-pressed="${s.kon === v}">${t}</button>`).join('')}</div></div>`;
      klar = !!s.kon;
    } else if (n === 3) {
      inre = `<span class="ogon in" style="--i:1">Vardag</span><h2 class="in" style="--i:2">Hur rör du dig en vanlig vecka?</h2><p class="under in" style="--i:3">Allt räknas – promenader, gym, matcher.</p>
        <div class="fraga-svar val-lista">${PASS.map(([v, t, u, i], k) => `<button type="button" class="val in" style="--i:${k + 4}" data-g="pass" data-v="${v}" aria-pressed="${s.pass === v}"><span class="ikonruta">${ik(i)}</span><span><b>${t}</b><small>${u}</small></span><span class="bock">${ik('bock')}</span></button>`).join('')}</div>`;
      klar = !!s.pass;
    } else if (n === 4) {
      inre = `<span class="ogon in" style="--i:1">Kroppen</span><h2 class="in" style="--i:2">Har du ont någonstans?</h2><p class="under in" style="--i:3">Tryck på kroppen där det känns. Dra för att vrida den.</p>
        <div class="fraga-kropp in" style="--i:3"><div data-kropp-plats></div><span class="tryck-tips"><i></i>Tryck där du har ont</span></div>
        <div class="ont-lista" data-ont-lista>${ontChips()}</div>`;
      klar = true;
    } else if (n === 5) {
      inre = `<span class="ogon in" style="--i:1">Mål</span><h2 class="in" style="--i:2">Vad vill du uppnå?</h2><p class="under in" style="--i:3">Välj upp till två – vi lägger upp appen efter det.</p>
        <div class="fraga-svar val-lista">${MAL.map(([v, t, i], k) => `<button type="button" class="val in" style="--i:${k + 4}" data-g="mal" data-v="${v}" aria-pressed="${s.mal.includes(v)}"><span class="ikonruta">${ik(i)}</span><span><b>${t}</b></span><span class="bock">${ik('bock')}</span></button>`).join('')}</div>`;
      klar = s.mal.length > 0;
    }
    const nasta = n === 4 ? (s.ont.length ? 'Klart – nästa' : 'Jag har inte ont') : n === 5 ? 'Fortsätt' : 'Nästa';
    const el = visa(`<div class="fraga" data-fraga="${n}">${topp}${inre}</div>
      <div class="fraga-fot"><button class="knapp knapp-primar knapp-bred" data-g="fraga-nasta" ${klar ? '' : 'disabled'}>${nasta} ${ik('pil')}</button></div>`, { in: riktning, klass: `fraga-skarm${fortsatt ? ' fraga-fortsatt' : ''}` });
    if (n === 1) { const f = $('#namn', el); setTimeout(() => f.focus({ preventScroll: true }), 450); f.addEventListener('input', () => { s.namn = f.value; $('[data-g="fraga-nasta"]', el).disabled = !f.value.trim(); }); f.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && f.value.trim()) gaFraga(2); }); }
    if (n === 2) hjul(el);
    if (n === 4) kroppValFn = (id) => { if (id) ontArk(id, { fraga: true }); };
  }
  function ontChips() {
    return st.svar.ont.map((z) => `<span class="ont-chip">${e(regionNamn(z.id))} <b>${z.niva}/10</b><button type="button" data-g="ont-bort" data-id="${z.id}" aria-label="Ta bort ${e(regionNamn(z.id))}">${ik('stang')}</button></span>`).join('');
  }
  function hjul(el) {
    const lista = $('[data-hjul]', el), alderEl = $('[data-hjul-alder]', el), knappar = $$('button', lista);
    const valj = (y, mjukt) => { const b = knappar.find((k) => +k.dataset.ar === y); if (!b) return; lista.scrollTo({ top: b.offsetTop - 84, behavior: mjukt ? 'smooth' : 'auto' }); };
    let t = null;
    const las = () => { const mitt = lista.scrollTop + 84 + 21; let bast = knappar[0]; for (const k of knappar) if (Math.abs(k.offsetTop + 21 - mitt) < Math.abs(bast.offsetTop + 21 - mitt)) bast = k;
      knappar.forEach((k) => k.toggleAttribute('data-vald', k === bast)); st.svar.fodd = +bast.dataset.ar; alderEl.textContent = `${idag().getFullYear() - st.svar.fodd} år`; };
    lista.addEventListener('scroll', () => { cancelAnimationFrame(t); t = requestAnimationFrame(las); }, { passive: true });
    lista.addEventListener('click', (ev) => { const b = ev.target.closest('[data-ar]'); if (b) valj(+b.dataset.ar, true); });
    lista.addEventListener('keydown', (ev) => { if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') { ev.preventDefault(); valj(st.svar.fodd + (ev.key === 'ArrowUp' ? 1 : -1), true); } });
    requestAnimationFrame(() => { valj(st.svar.fodd, false); las(); });
  }
  function gaFraga(n, riktning = 'fram') { spara(); kroppForm$(); if (n < 1) return valkommen(); if (n > 5) return nivaVal(); fraga(n, riktning); }
  const fragaNu = () => +($('[data-fraga]', nu)?.dataset.fraga || 1);

  /* ---- 07 nivåvalet ---- */
  function nivaVal(riktning = 'fram') {
    const v = st.svar.niva || '';
    const fortsatt = !!$('.fraga-skarm:not([data-ut])', skarmLager);
    const kort = (k, ikon, rubrik, ton, text, punkter, i) => `<button type="button" class="niva-kort niva-${k} in" style="--i:${i}" data-g="valj-niva" data-v="${k}" data-tilt aria-pressed="${v === k}"><span class="niva-glans"></span>
          <span class="niva-ikon">${ik(ikon)}</span><span class="niva-namn"><h3>${rubrik}</h3><small>${ton}</small></span><span class="niva-bock">${ik('bock')}</span>
          <p>${text}</p><ul>${punkter.map((p) => `<li>${p}</li>`).join('')}</ul></button>`;
    visa(`<div class="fraga niva-fraga"><div class="fraga-topp in" style="--i:0"><button class="ikonknapp" data-g="niva-bak" aria-label="Tillbaka">${ik('bak')}</button>
      <div class="steg-rad" aria-hidden="true">${[1, 2, 3, 4, 5].map(() => '<i data-klar></i>').join('')}</div><span class="steg-tal steg-klar" aria-hidden="true">${ik('bock')}</span></div>
      <span class="ogon in" style="--i:1">Sista steget</span><h2 class="in" style="--i:2">Hur tränar du, ${e((st.svar.namn.trim() || 'du').replace(/^./, (x) => x.toUpperCase()))}?</h2>
      <p class="under in" style="--i:3">Appen byter design och upplägg efter ditt val. Du kan ändra det när du vill.</p>
      <div class="niva-val" role="group" aria-label="Nivå">
        ${kort('motionar', 'sol', 'Motionär', 'Ljust och lugnt', 'Hälsa, vanor och rörelse i din takt – med tydliga råd när kroppen säger ifrån.', ['Dagsform', 'Veckans rörelse', 'Kroppskarta', 'Hälsokartläggning'], 4)}
        ${kort('elit', 'blixt', 'Elit', 'Instrumentpanel', 'Belastning, tillgänglighet, skaderegister och medicinsk kontroll – som i elitlaget.', ['Beredskap', 'Belastningskvot', 'Skaderegister', 'PCME'], 5)}
      </div></div>
      <div class="fraga-fot"><button class="knapp knapp-primar knapp-bred knapp-glitter" data-g="skapa" ${v ? '' : 'disabled'}><span class="kg-ram" aria-hidden="true"><i></i></span><span class="kg-svep" aria-hidden="true"></span>${Array.from({ length: 7 }, (_, i) => `<i class="kg-gnista" aria-hidden="true" style="--x:${[12, 26, 41, 58, 70, 84, 93][i]}%;--y:${[30, 72, 22, 78, 34, 66, 40][i]}%;--d:${(i * .43).toFixed(2)}s"></i>`).join('')}<span class="kg-text">Skapa min profil ${ik('gnista')}</span></button></div>`, { in: riktning, klass: `fraga-skarm${fortsatt ? ' fraga-fortsatt' : ''}` });
  }

  /* ---- 08 skapar profil ---- */
  const summa = () => { try { navigator.vibrate?.(8); } catch (err) { /* ingen vibration */ } };
  async function skapar() {
    const s = st.svar, p = { namn: s.namn.trim() || 'Du', fodd: s.fodd, kon: s.kon || 'annat', pass: s.pass || '1-2', ont: s.ont.slice(), mal: s.mal.slice(), niva: s.niva || 'motionar', skapad: dagStr(idag()) };
    const rader = [`Normvärden för ${idag().getFullYear() - p.fodd} år${p.kon === 'annat' ? '' : ` · ${p.kon === 'kvinna' ? 'kvinnor' : 'män'}`}`,
      p.ont.length ? `${p.ont.length} ${p.ont.length === 1 ? 'område' : 'områden'} på kroppskartan` : 'Kroppskartan – inga besvär',
      `Upplägg för ${p.niva === 'elit' ? 'elit' : 'motionär'}`, 'Din dagsform och veckans rörelse'];
    const el = visa(`<div class="skapar-kropp"><div data-kropp-plats></div></div>
      <div class="skapar-procent in" style="--i:0"><svg class="skapar-ring" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="sk-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a7d2ff"/><stop offset="1" stop-color="#7ee0c3"/></linearGradient></defs><circle class="sk-spar" cx="60" cy="60" r="50"/><circle class="sk-bage" cx="60" cy="60" r="50" pathLength="1" data-sk-bage/></svg><span class="skapar-tal"><b class="tal" data-procent>0</b><small>%</small></span></div><h2 class="in" style="--i:1">Vi skapar din profil</h2>
      <div class="skapar-matare in" style="--i:1" aria-hidden="true"><i></i></div>
      <ul class="skapar-lista">${rader.map((r, i) => `<li class="in" style="--i:${i + 2}"><span class="snurr"></span>${e(r)}</li>`).join('')}</ul>`, { in: 'tona', klass: 'skapar' });
    const skanning = kropp?.skanna ? kropp.skanna(3600) : vanta(3600);
    const li = $$('.skapar-lista li', el);
    const pr = $('[data-procent]', el), mat = $('.skapar-matare i', el), bage = $('[data-sk-bage]', el), satt = (v) => { pr.textContent = v; mat.style.transform = `scaleX(${v / 100})`; bage.style.strokeDashoffset = 1 - v / 100; };
    for (let i = 0; i < li.length; i++) { li[i].dataset.pagar = ''; const fran = Math.round(i / li.length * 100), till = Math.round((i + 1) / li.length * 100);
      for (let k = 1; k <= 8; k++) { await vanta(100); satt(Math.round(fran + (till - fran) * k / 8)); } delete li[i].dataset.pagar; li[i].dataset.klar = ''; summa(); }
    await skanning;
    st.profil = p; Object.assign(st, exempeldata(p)); spara();
    const mal = MAL.find(([v]) => p.mal.includes(v));
    $('h2', el).textContent = `Klart, ${p.namn.replace(/^./, (x) => x.toUpperCase())}!`;
    $('.skapar-lista', el).insertAdjacentHTML('beforebegin', `<div class="skapar-summa">${[p.niva === 'elit' ? 'Elit' : 'Motionär', `${idag().getFullYear() - p.fodd} år`, mal ? mal[1] : 'Allmän hälsa']
      .map((t, i) => `<span style="--i:${i}">${e(t)}</span>`).join('')}</div>`);
    el.dataset.klar = ''; summa();
    const pr0 = $('.skapar-procent', el).getBoundingClientRect(); konfetti(`${pr0.left + pr0.width / 2}px`, `${pr0.top + pr0.height / 2}px`);
    await vanta(1700);
    hem('idag', { in: 'tona' });
    setTimeout(() => toast('Din profil är skapad'), 700);
  }

  /* ---- 09 hem: Idag ---- */
  const FLIKAR = ['idag', 'kropp', 'screening', 'jag'];
  let valkomnaVisad = false; // välkomstentrén (hälsningen glider upp, korten kommer fram) en gång per session
  function hem(f = 'idag', { in: inn, kvar } = {}) {
    const fore = FLIKAR.indexOf(flik), efter = FLIKAR.indexOf(f), samma = flik === f && !!nu; // samma flik ritas om mjukt – rubriken och väljarna står still
    flik = f;
    document.body.dataset.sida = f;
    if (st.profil && document.body.dataset.niva !== st.profil.niva) document.body.dataset.niva = st.profil.niva; // introt är alltid mörkt – appen följer profilen
    const html = { idag: vyIdag, kropp: vyKropp, screening: vyScreening, jag: vyJag }[f]();
    visa(html, { in: samma && (!inn || inn === 'tona' || inn === 'mjuk') ? 'mjuk' : inn || (fore < 0 ? 'tona' : efter > fore ? 'fram' : efter < fore ? 'bak' : 'tona'), kvar: kvar || 440, flikar: true, efter: (el) => {
      if (f === 'idag') { kroppValFn = (id) => { if (id) ontArk(id); }; if (!valkomnaVisad && !lugn) { valkomnaVisad = true; el.dataset.valkomna = ''; /* ligger kvar på skärmen – tas den bort startar kortens vanliga intoning om */ } paminnKoll(); const x = $('.lp-kort .lp-karta', el); if (x) fargaRunda(x, exempelRunda(loppNu())); } else gomNotis();
      if (f === 'kropp') kroppValFn = (id) => { if (!id) return; if (kroppLage === 'ont') ontArk(id); else if (kroppLage === 'test' && grupp(id)) gruppArk(grupp(id).k); };
    } });
    $$('[data-flik]', flikrad).forEach((b) => b.toggleAttribute('aria-current', b.dataset.flik === f) || b.setAttribute('aria-current', b.dataset.flik === f ? 'page' : 'false'));
    $$('[data-flik]', flikrad).forEach((b) => { if (b.dataset.flik === f) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    flikMarkor();
  }
  function flikMarkor() {
    const b = $(`[data-flik="${flik}"]`, flikrad), m = $('.flik-markor', flikrad); if (!b || !m) return;
    // Markören centreras under fliken (offsetLeft – samma kant som markörens left: 0). Första gången hoppar den dit,
    // sedan glider den och pillret sträcks i rörelsen (data-glider, bara när den faktiskt flyttar sig).
    // Flytande glasdroppe: glider med fjäder, sträcks i farten och dyker UNDER plusknappen när den byter sida (Web Animations).
    requestAnimationFrame(() => {
      if (flikrad.hidden || !b.offsetWidth) return;
      const x = Math.round(b.offsetLeft + b.offsetWidth / 2 - m.offsetWidth / 2), fore = m.dataset.x === undefined ? null : +m.dataset.x;
      if (fore === x) return;
      m.dataset.x = x;
      if (fore === null || lugn || !m.animate) { m.getAnimations?.().forEach((a) => a.cancel()); m.style.transform = `translateX(${x}px)`; return; }
      const plus = $('.flik-plus', flikrad), pm = plus.offsetLeft + plus.offsetWidth / 2 - m.offsetWidth / 2;
      const korsar = (fore - pm) * (x - pm) < 0, avst = Math.abs(x - fore), str = 1 + Math.min(.55, avst / 320);
      const mitt = (fore + x) / 2, nu0 = getComputedStyle(m).transform;
      m.getAnimations().forEach((a) => a.cancel());
      m.style.transform = `translateX(${x}px)`;
      m.animate([
        { transform: nu0 === 'none' ? `translateX(${fore}px)` : nu0, opacity: 1 },
        { offset: .45, transform: `translateX(${mitt}px) scale(${str}, ${korsar ? .7 : .9})`, opacity: korsar ? .55 : 1 },
        { offset: .8, transform: `translateX(${x + (x > fore ? 3 : -3)}px) scale(.96, 1.04)`, opacity: 1 },
        { transform: `translateX(${x}px) scale(1, 1)`, opacity: 1 },
      ], { duration: korsar ? 640 : 520, easing: 'cubic-bezier(.32, .72, 0, 1)' });
      m.toggleAttribute('data-under', korsar); clearTimeout(flikMarkor.t); flikMarkor.t = setTimeout(() => m.removeAttribute('data-under'), 700);
      b.animate([{ transform: 'scale(1)' }, { transform: 'scale(.92)', offset: .3 }, { transform: 'scale(1.04)', offset: .7 }, { transform: 'scale(1)' }], { duration: 480, easing: 'ease-out' });
    });
  }
  function topp(rubrik) {
    const p = st.profil;
    return `<div class="hem-topp in" style="--i:0"><div class="halsning"><span class="ios-datum">${ik(idag().getHours() >= 17 || idag().getHours() < 5 ? 'mane' : 'sol')}${e(datumText())}</span><h1 class="ios-titel"><span class="ios-titel-text">${rubrik}</span></h1></div>
      <button class="profilbild" data-g="flik" data-v="jag" aria-label="Din profil">${e((p?.namn || 'U')[0].toUpperCase())}</button></div>`;
  }
  function senasteCheckin() { return st.checkin[st.checkin.length - 1] || null; }
  function dagsform(c) { if (!c) return 0; return Math.round(((c.somn + c.energi + (11 - c.omhet) + (11 - c.stress) + c.humor) / 50) * 100); }
  function belastning() {
    const last = (fran, till) => st.pass.filter((p) => { const d = (idag() - new Date(p.datum)) / 864e5; return d >= fran && d < till; }).reduce((s, p) => s + p.min * p.rpe, 0);
    const akut = last(0, 7), kronisk = last(0, 28) / 4;
    return { akut, kronisk, kvot: kronisk ? akut / kronisk : 0 };
  }
  function veckaStaplar(fn, enhet) {
    const dagarna = Array.from({ length: 7 }, (_, i) => dagar(i - 6));
    const v = dagarna.map((d) => fn(dagStr(d))); const max = Math.max(...v, 1);
    return `<div class="staplar">${dagarna.map((d, i) => `<div ${i === 6 ? 'data-idag' : ''} ${v[i] > max * .85 && i !== 6 ? 'data-hog' : ''} title="${fmt(v[i])} ${enhet}"><span style="--h:${Math.max(4, v[i] / max * 100)}%;--i:${i}"></span><small>${VECKODAG[d.getDay()]}</small></div>`).join('')}</div>`;
  }
  // Sju dagar som i kalenderappen: idag markerad, prickar för pass och check-in.
  function veckoRemsa() {
    return `<div class="vecka in" style="--i:1" role="list" aria-label="Veckan">${Array.from({ length: 7 }, (_, i) => { const d = dagar(i - 3), ds = dagStr(d), arIdag = i === 3, fram = i > 3;
      const pass = st.pass.filter((x) => x.datum === ds), ci = st.checkin.some((x) => x.datum === ds);
      return `<button class="vecka-dag" role="listitem" data-g="dag" data-d="${ds}" ${arIdag ? 'data-idag aria-current="date"' : ''} ${fram ? 'data-fram' : ''} ${ci && !arIdag ? 'data-ci' : ''}>
        <small>${arIdag ? 'Idag' : VECKODAG[d.getDay()]}</small><b class="tal">${d.getDate()}</b><span class="vecka-prickar">${ci ? `<i data-t="ci" ${pass.length ? 'data-pass' : ''}></i>` : pass.length ? '<i data-t="pass"></i>' : '<i data-t="tom"></i>'}</span></button>`; }).join('')}</div>`;
  }
  function svit() { let n = 0; for (let i = 0; i < 60; i++) { const ds = dagStr(dagar(-i)); if (st.checkin.some((x) => x.datum === ds)) n++; else if (i > 0) break; } return n; }
  // Dagens fokus: enkla, förklarade regler (ingen AI, ingen diagnos).
  function fokus() {
    const c = senasteCheckin(), ont = (st.profil.ont || []).slice().sort((a, b) => b.niva - a.niva)[0];
    if (ont && ont.niva >= 6) return { ik: 'plaster', ton: 'rod', titel: `Ta hand om ${regionNamn(ont.id).toLowerCase()}`, text: `Du har markerat ${ont.niva}/10. Välj lättare belastning idag och följ hur det känns.`, knapp: 'Öppna kroppskartan', g: 'flik', v: 'kropp' };
    if (elit()) { const b = belastning(); if (b.kvot > 1.3) return { ik: 'trend', ton: 'gul', titel: 'Belastningen ökar snabbt', text: `Akut:kronisk ${fmt(b.kvot, 2)} – över den optimala zonen. Planera ett lättare pass eller återhämtning.`, knapp: 'Logga ett pass', g: 'pass-ny' }; }
    if (c && c.somn <= 5) return { ik: 'mane', ton: 'is', titel: 'Prioritera sömnen ikväll', text: 'Sömnen var låg i natt. Samma läggdags ikväll ger kroppen bäst chans att återhämta sig.', knapp: 'Gör check-in', g: 'checkin' };
    if (!elit()) { const v = Array.from({ length: 7 }, (_, i) => st.pass.filter((x) => x.datum === dagStr(dagar(i - 6))).reduce((s, x) => s + x.min, 0)).reduce((a, b) => a + b, 0);
      if (v < 150) return { ik: 'sko', ton: 'ok', titel: `${150 - v} minuter kvar till veckans mål`, text: 'En rask promenad på 30 minuter tar dig en bra bit på vägen.', knapp: 'Logga rörelse', g: 'pass-ny' }; }
    if (c && dagsform(c) < 60) return { ik: 'hjarta', ton: 'gul', titel: 'Sänk tempot idag', text: 'Dagsformen är lägre än vanligt. Välj ett lugnare pass, rörlighet eller en promenad.', knapp: 'Logga rörelse', g: 'pass-ny' };
    return { ik: 'gnista', ton: 'ok', titel: 'Bra balans – kör enligt plan', text: elit() ? 'Belastning, sömn och kropp ser stabila ut. Fortsätt som planerat.' : 'Du rör dig bra den här veckan. Fortsätt i samma takt.', knapp: 'Gör check-in', g: 'checkin' };
  }
  function fokusKort(i) {
    const f = fokus();
    return `<button class="kort fokus tryck in" style="--i:${i}" data-g="${f.g}" ${f.v ? `data-v="${f.v}"` : ''} data-ton="${f.ton}"><span class="fokus-sken" aria-hidden="true"></span>
      <span class="ikonruta" data-ton="${f.ton}">${ik(f.ik)}</span><span class="fokus-text"><span class="ogon utan">Dagens fokus</span><b>${e(f.titel)}</b><small>${e(f.text)}</small></span>
      <span class="fokus-knapp">${e(f.knapp)} ${ik('pil')}</span></button>`;
  }
  function matchKort(i) {
    const nu0 = idag(), lor = new Date(nu0); lor.setDate(nu0.getDate() + ((6 - nu0.getDay() + 7) % 7 || 7)); lor.setHours(15, 0, 0, 0);
    const ms = lor - nu0, dgr = Math.floor(ms / 864e5), tim = Math.floor((ms % 864e5) / 36e5), skada = st.skador.find((s) => !s.slut);
    const tva = (n) => String(n).padStart(2, '0');
    return `<div class="kort match2 in" style="--i:${i}">
      <div class="match2-topp"><span class="ogon utan">${LANDS ? 'Nästa tävling' : 'Nästa match'}</span><span class="match-status" data-ton="${skada ? 'gul' : 'ok'}"><i></i>${skada ? 'Begränsad' : 'Tillgänglig'}</span></div>
      <div class="match2-rad"><div><b>${lor.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/^./, (x) => x.toUpperCase())}</b><small>${LANDS ? 'Start 13:00 · exempel' : 'Avspark 15:00 · exempel'}</small></div>
        <div class="tavla-siffror"><span><b class="tal">${tva(dgr)}</b><small>dagar</small></span><i>:</i><span><b class="tal">${tva(tim)}</b><small>tim</small></span></div></div>
      <small class="liten">${skada ? 'Beslut efter fystränarens bedömning.' : 'Inga hinder registrerade.'}</small></div>`;
  }
  // Idag, version 3: tre ringar (som aktivitetsringar), snabbcheck med ett tryck, bento med nyckeltal.
  const visNamn = () => { const n = (st.profil?.namn || '').trim(); return n ? n[0].toUpperCase() + n.slice(1) : 'Du'; };
  const statusOrd = (df) => (df >= 75 ? ['Redo för mer', 'ok'] : df >= 60 ? ['Bra läge', 'ok'] : df >= 45 ? ['Ta det lugnt', 'gul'] : ['Vila idag', 'rod']);
  const SNABB = [['toppen', 'Toppen', { somn: 9, energi: 9, omhet: 2, stress: 2, humor: 9 }], ['bra', 'Bra', { somn: 8, energi: 7, omhet: 3, stress: 3, humor: 8 }],
    ['okej', 'Okej', { somn: 6, energi: 6, omhet: 4, stress: 5, humor: 6 }], ['trott', 'Trött', { somn: 4, energi: 4, omhet: 5, stress: 6, humor: 5 }], ['tung', 'Tung dag', { somn: 3, energi: 3, omhet: 7, stress: 8, humor: 3 }]];
  function trioRingar(ringar, mitt) {
    const R = [108, 90, 72];
    return `<div class="trio" data-trio><svg viewBox="0 0 240 240" aria-hidden="true"><defs>
        <linearGradient id="tr-0" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a7f0db"/><stop offset="1" stop-color="#3fc9a3"/></linearGradient>
        <linearGradient id="tr-1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe6ff"/><stop offset="1" stop-color="#5aa8e6"/></linearGradient>
        <linearGradient id="tr-2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe09a"/><stop offset="1" stop-color="#f0a33c"/></linearGradient></defs>
      ${ringar.map((g, i) => `<circle class="trio-spar" data-n="${i}" cx="120" cy="120" r="${R[i]}"/><circle class="trio-bage" data-n="${i}" cx="120" cy="120" r="${R[i]}" stroke="url(#tr-${i})" data-v="${klamp(g.v, 0, 100)}"/>`).join('')}</svg>
      <div class="trio-mitt">${mitt}</div></div>
      <div class="trio-forklaring">${ringar.map((g, i) => `<div data-n="${i}"><i></i><span><b class="tal">${g.tal}</b><small>${g.namn}</small></span>${g.delta ? deltaHtml(...g.delta) : ''}</div>`).join('')}</div>`;
  }
  // Förändringsbricka i ton (som Beredskapen): d = förändringen, bra = om ökning är bra, dec = decimaler, enh = enhet.
  function deltaHtml(d, bra = true, dec = 1, enh = '') {
    const noll = Math.abs(d) < (dec ? .5 : 1), ton = noll ? 'is' : (d > 0) === bra ? 'ok' : 'gul';
    return `<em class="lg-delta" data-ton="${ton}" data-rikt="${noll ? 'lika' : d > 0 ? 'upp' : 'ner'}">${noll ? '±0' : `${fmt(Math.abs(d), dec)}${enh}`}</em>`;
  }
  // En smart rad: ikon + en mening som förklarar datan.
  const insiktHtml = (text, ikon = 'gnista', k = '') => `<p class="lg-insikt ${k}">${ik(ikon)}<span>${e(text)}</span></p>`;
  const medel = (v) => (v.length ? v.reduce((a, x) => a + x, 0) / v.length : 0);
  // Humörikoner: mjuk gradient, ljusreflex, ögon och mun per läge.
  const HUMOR = {
    toppen: ['#a9f2dc', '#38c79f', '<path d="M14.5 26.5c2.2 5.6 6 8.4 9.5 8.4s7.3-2.8 9.5-8.4z" fill="#0b1520"/><path d="M19.5 32.2c1.3 1.6 2.8 2.4 4.5 2.4s3.2-.8 4.5-2.4c-1.3-.9-2.8-1.4-4.5-1.4s-3.2.5-4.5 1.4z" fill="#f2777a"/>', 'glad'],
    bra: ['#c6f3e6', '#6fd8bd', '<path d="M16 28.5c2.2 3.2 4.9 4.8 8 4.8s5.8-1.6 8-4.8" fill="none" stroke="#0b1520" stroke-width="2.6" stroke-linecap="round"/>', 'glad'],
    okej: ['#d7e9ff', '#8fbef2', '<path d="M17 30.5h14" fill="none" stroke="#0b1520" stroke-width="2.6" stroke-linecap="round"/>', 'rak'],
    trott: ['#ffe7b0', '#f2b54a', '<path d="M17.5 32c2-1.6 4.2-2.4 6.5-2.4s4.5.8 6.5 2.4" fill="none" stroke="#0b1520" stroke-width="2.6" stroke-linecap="round"/>', 'trott'],
    tung: ['#ffc4b6', '#ec7c66', '<path d="M16.5 33.5c2.2-3 4.7-4.5 7.5-4.5s5.3 1.5 7.5 4.5" fill="none" stroke="#0b1520" stroke-width="2.6" stroke-linecap="round"/><path d="M14.5 17.6l5-2.2M33.5 17.6l-5-2.2" stroke="#0b1520" stroke-width="2.2" stroke-linecap="round"/>', 'tung'],
  };
  function humorSvg(k) {
    const [ljus, mork, mun, ogon] = HUMOR[k];
    const ogonSvg = ogon === 'trott' ? '<path d="M15.5 21.5q3 2.2 6 0M26.5 21.5q3 2.2 6 0" fill="none" stroke="#0b1520" stroke-width="2.4" stroke-linecap="round"/>'
      : ogon === 'glad' ? '<path d="M15.8 21.8q2.7-3.4 5.4 0M26.8 21.8q2.7-3.4 5.4 0" fill="none" stroke="#0b1520" stroke-width="2.6" stroke-linecap="round"/>'
      : '<ellipse cx="18.5" cy="20.5" rx="2.1" ry="2.6" fill="#0b1520"/><ellipse cx="29.5" cy="20.5" rx="2.1" ry="2.6" fill="#0b1520"/>';
    const kinder = ogon === 'glad' ? '<ellipse cx="13.5" cy="27" rx="3" ry="2" fill="#ff8f8f" opacity=".35"/><ellipse cx="34.5" cy="27" rx="3" ry="2" fill="#ff8f8f" opacity=".35"/>' : '';
    return `<svg class="humor-svg" viewBox="0 0 48 48" aria-hidden="true"><defs><radialGradient id="hu-${k}" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="${ljus}"/><stop offset="1" stop-color="${mork}"/></radialGradient></defs>
      <circle cx="24" cy="24" r="22" fill="url(#hu-${k})"/><ellipse class="hu-glans" cx="17" cy="11" rx="8" ry="4.5" fill="#fff" opacity=".45" transform="rotate(-20 17 11)"/>${kinder}<g class="hu-ogon">${ogonSvg}</g><g class="hu-mun">${mun}</g></svg>`;
  }
  function elitHud(df, kvot, somn, ord, ton) {
    // Beredskap i iOS 26-stil: en 270°-båge med gradient och glödande knopp, talet stort, en smart rad om vad som drar upp/ned,
    // och tre delar i en grupperad glasrad med förändring mot snittet de senaste 7 dagarna.
    const sju = st.checkin.slice(-7), c = senasteCheckin() || {}, p = klamp(df / 100, 0, 1);
    const R = 96, cx = 130, cy = 128, a0 = 135, span = 270;
    const pt = (deg) => [cx + R * Math.cos(deg * Math.PI / 180), cy + R * Math.sin(deg * Math.PI / 180)];
    const bage = (t) => { const [x0, y0] = pt(a0), [x1, y1] = pt(a0 + span * t); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 ${span * t > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
    const [kx, ky] = pt(a0 + span * Math.max(p, .001)), L = (2 * Math.PI * R * span / 360);
    const snitt = (k) => { const v = sju.slice(0, -1).map((x) => x[k]); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : c[k] || 0; };
    const delar = [['somn', 'Sömn', 'mane', false], ['energi', 'Energi', 'batteri', false], ['omhet', 'Ömhet', 'kropp', true]].map(([k, t, i, omvand]) => {
      const nuV = c[k] || 0, d = nuV - snitt(k), bra = omvand ? -d : d;
      return { k, t, i, nuV, d, bra, v: sju.map((x) => x[k]) };
    });
    const upp = delar.slice().sort((x, y) => y.bra - x.bra)[0], ned = delar.slice().sort((x, y) => x.bra - y.bra)[0];
    const insikt = Math.abs(upp.bra) < .5 && Math.abs(ned.bra) < .5 ? 'I nivå med ditt snitt den här veckan.'
      : `${upp.bra >= .5 ? `${upp.t} drar upp` : ''}${upp.bra >= .5 && ned.bra <= -.5 ? ' · ' : ''}${ned.bra <= -.5 ? `${ned.t.toLowerCase()} drar ned` : ''}`.replace(/^./, (x) => x.toUpperCase());
    const spark = (v) => { const w = 64, h = 20, mx = 10; if (v.length < 2) return ''; const dx = w / (v.length - 1);
      const pts = v.map((x, i) => `${(i * dx).toFixed(1)},${(h - 2 - x / mx * (h - 4)).toFixed(1)}`).join(' ');
      return `<svg class="h3-spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}"/><circle cx="${w}" cy="${(h - 2 - v[v.length - 1] / mx * (h - 4)).toFixed(1)}" r="2.4"/></svg>`; };
    return `<section class="hud3 in" style="--i:1">
      <div class="h3-matare"><svg viewBox="0 0 260 236" aria-hidden="true"><defs>
          <linearGradient id="h3-g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#5aa8e6"/><stop offset=".5" stop-color="#7ee0c3"/><stop offset="1" stop-color="#c8f7e6"/></linearGradient>
          <filter id="h3-glod" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter></defs>
        <path d="${bage(1)}" class="h3-spar"/>
        ${Array.from({ length: 11 }, (_, i) => { const [x0, y0] = pt(a0 + span * i / 10), dx = Math.cos((a0 + span * i / 10) * Math.PI / 180), dy = Math.sin((a0 + span * i / 10) * Math.PI / 180);
          return `<line class="h3-tick" x1="${(x0 - dx * 18).toFixed(1)}" y1="${(y0 - dy * 18).toFixed(1)}" x2="${(x0 - dx * 23).toFixed(1)}" y2="${(y0 - dy * 23).toFixed(1)}"/>`; }).join('')}
        <path d="${bage(Math.max(p, .001))}" class="h3-bage-glod" filter="url(#h3-glod)" style="--L:${L.toFixed(1)}"/>
        <path d="${bage(Math.max(p, .001))}" class="h3-bage" style="--L:${L.toFixed(1)}"/>
        <circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="9" class="h3-knopp"/></svg>
        <div class="h3-mitt"><small>Beredskap</small><b class="tal" data-rakna="${df}">0</b><span class="h3-status" data-ton="${ton}"><i></i>${ord}</span></div>
        <div class="h3-skala" aria-hidden="true"><span>0</span><span>100</span></div></div>
      <p class="h3-insikt">${ik('gnista')}<span>${e(insikt)}</span></p>
      <div class="h3-delar">${delar.map((x) => `<div class="h3-del"><span class="h3-del-topp">${ik(x.i)}${x.t}</span><b class="tal">${x.nuV}<small>/10</small></b>
        <span class="h3-del-fot">${spark(x.v)}<em class="lg-delta" data-ton="${Math.abs(x.d) < .5 ? 'is' : x.bra > 0 ? 'ok' : 'gul'}" data-rikt="${Math.abs(x.d) < .5 ? 'lika' : x.d > 0 ? 'upp' : 'ner'}">${Math.abs(x.d) < .5 ? '±0' : fmt(Math.abs(x.d), 1)}</em></span></div>`).join('')}</div>
      <small class="h3-not">Förändring mot ditt snitt de senaste 7 dagarna</small></section>`;
  }

  function snabbcheck(i) {
    const c = senasteCheckin(), gjord = c && c.datum === dagStr(idag());
    if (gjord) return `<button class="kort checkin-klar tryck in" style="--i:${i}" data-g="checkin"><span class="ikonruta">${ik('bock')}</span><span><b>Dagens check-in är gjord</b>${svit() > 1 ? `<span class="svit">${ik('gnista')}${svit()} dagar i rad</span>` : ''}<small>Tryck för att justera sömn, energi, ömhet, stress eller humör</small></span>${ik('hoger')}</button>`;
    if (elit()) return `<div class="kort snabb snabb-elit in" style="--i:${i}"><div class="kort-rubrik"><div><span class="ogon utan">Välmående · 1–5</span><h3 style="margin-top:4px">Dagens wellness-check</h3>${svit() > 1 ? `<span class="svit">${ik('gnista')}${svit()} dagar i rad</span>` : ''}</div><button class="mer" data-g="checkin">Detaljer ${ik('hoger')}</button></div>
      <div class="skala">${[...SNABB].reverse().map(([k, t], n) => `<button type="button" data-g="snabb" data-k="${k}" style="--n:${n}" data-steg="${n + 1}"><b class="tal">${n + 1}</b><small>${t}</small></button>`).join('')}</div><div class="skala-axel"><span>Tungt</span><span>Toppen</span></div></div>`;
    return `<div class="kort snabb in" style="--i:${i}"><div class="kort-rubrik"><div><span class="ogon utan">Snabbcheck · ett tryck</span><h3 style="margin-top:4px">Hur mår du idag?</h3>${svit() > 1 ? `<span class="svit">${ik('gnista')}${svit()} dagar i rad</span>` : ''}</div><button class="mer" data-g="checkin">Detaljer ${ik('hoger')}</button></div>
      <div class="snabb-val">${SNABB.map(([k, t], n) => `<button type="button" data-g="snabb" data-k="${k}" style="--n:${n}"><span class="humor-ikon">${humorSvg(k)}</span><small>${t}</small></button>`).join('')}</div></div>`;
  }
  function minisparkar(varden, max = 10) {
    const v = varden.length ? varden : [0]; const w = 100, h = 30, st0 = v.length > 1 ? w / (v.length - 1) : w;
    const pts = v.map((x, i) => `${(i * st0).toFixed(1)},${(h - 3 - (x / max) * (h - 6)).toFixed(1)}`).join(' ');
    const sist = v[v.length - 1], yS = (h - 3 - (sist / max) * (h - 6)) / h * 100;
    return `<span class="minispark-ram"><svg class="minispark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,30 ${pts} 100,30" class="minispark-yta"/><polyline points="${pts}" class="minispark-linje" pathLength="1"/></svg><i class="minispark-prick" style="--y:${yS.toFixed(1)}%" aria-hidden="true"></i></span>`;
  }
  // Himlen bakom hälsningen: dygnet (morgon, dag, kväll, natt), årstiden (snö, blomblad, sommarsol, löv) och svenska högtider.
  // Testa med ?himmel=natt|morgon|dag|kvall och ?hogtid=jul|nyar|lucia|hjarta|pask|midsommar|nationaldag|advent.
  function pask(ar) { const a = ar % 19, b = Math.floor(ar / 100), c = ar % 100, d = Math.floor(b / 4), e2 = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e2 + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(ar, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1); }
  function himmelLage() {
    const q = new URLSearchParams(location.search), d = idag(), h = d.getHours(), md = (d.getMonth() + 1) * 100 + d.getDate(), ar = d.getFullYear();
    const fas = q.get('himmel') || (h < 5 || h >= 21 ? 'natt' : h < 9 ? 'morgon' : h < 17 ? 'dag' : 'kvall');
    // vinter (snö) från mitten av november till mitten av mars – som i Sverige; ?arstid= styr i test
    const m = d.getMonth() + 1, dd = d.getDate(), arstid = q.get('arstid') || ((m === 11 && dd >= 15) || m === 12 || m <= 2 || (m === 3 && dd < 15) ? 'vinter' : m <= 5 ? 'var' : m <= 8 ? 'sommar' : 'host');
    const p = pask(ar), dagTill = (x) => Math.round((x - new Date(ar, d.getMonth(), d.getDate())) / 864e5);
    const midsommar = (() => { for (let dd = 19; dd <= 25; dd++) { const x = new Date(ar, 5, dd); if (x.getDay() === 5) return x; } })();
    let hogtid = q.get('hogtid') || (md === 1231 || md === 101 ? 'nyar' : md === 1213 ? 'lucia' : md >= 1220 && md <= 1226 ? 'jul' : md >= 1127 && md < 1220 ? 'advent'
      : md === 214 ? 'hjarta' : md === 606 ? 'nationaldag' : Math.abs(dagTill(p)) <= 3 ? 'pask' : Math.abs(dagTill(midsommar)) <= 1 ? 'midsommar' : '');
    const HALS = { jul: 'God jul', advent: 'Trevlig advent', lucia: 'Glad Lucia', nyar: 'Gott nytt år', hjarta: 'Glad alla hjärtans dag', pask: 'Glad påsk', midsommar: 'Glad midsommar', nationaldag: 'Glad nationaldag' };
    return { fas, arstid: hogtid === 'jul' || hogtid === 'advent' || hogtid === 'lucia' || hogtid === 'nyar' ? 'vinter' : arstid, hogtid, halsning: HALS[hogtid] || '' };
  }
  function himmelHtml() {
    const { fas, arstid, hogtid } = himmelLage(), mork = fas === 'natt' || fas === 'kvall';
    const n = (k, f) => Array.from({ length: k }, (_, i) => f(i)).join('');
    const ljus = mork
      ? `<span class="hm3-mane"><i></i></span>${n(22, (i) => `<b class="hm3-stjarna" style="--x:${(i * 37 + 11) % 100}%;--y:${(i * 23 + 4) % 70}%;--s:${(.5 + (i % 4) * .25).toFixed(2)};--d:${(i * .41).toFixed(2)}s"></b>`)}<span class="hm3-fall"></span>`
      : `<span class="hm3-sol"><i class="hm3-glans"></i><i class="hm3-stralar"></i><i class="hm3-skiva"></i></span><span class="hm3-flare"><i></i><i></i><i></i></span>`;
    const moln = fas === 'natt' ? '' : `<span class="hm3-moln" style="--x:58%;--y:22%;--w:170px;--t:46s"></span><span class="hm3-moln" style="--x:78%;--y:52%;--w:120px;--t:60s;--d:-20s"></span><span class="hm3-moln" style="--x:-6%;--y:62%;--w:140px;--t:70s;--d:-35s"></span>`;
    const vader = { vinter: n(40, (i) => `<b class="hm3-sno" style="--x:${(i * 37 + 5) % 100}%;--d:${(-i * .55).toFixed(2)}s;--t:${8 + (i % 5) * 1.5}s;--s:${(.5 + (i % 4) * .3).toFixed(2)}"></b>`),
      var: n(6, (i) => `<b class="hm3-blad" data-f="blom" style="--x:${(i * 29 + 8) % 100}%;--d:${(-i * 1.6).toFixed(2)}s;--t:${12 + (i % 3)}s"></b>`),
      host: n(6, (i) => `<b class="hm3-blad" data-f="${i % 3}" style="--x:${(i * 31 + 6) % 100}%;--d:${(-i * 1.7).toFixed(2)}s;--t:${11 + (i % 4)}s"></b>`), sommar: '' }[arstid] || '';
    const extra = hogtid === 'jul' || hogtid === 'advent' || hogtid === 'lucia' ? `<span class="hm3-julstjarna"></span>`
      : hogtid === 'nyar' ? n(3, (i) => `<span class="hm3-gnistor" style="--x:${[68, 84, 56][i]}%;--y:${[22, 40, 50][i]}%;--d:${(i * 1.1).toFixed(1)}s">${n(10, (k) => `<i style="--a:${k * 36}deg"></i>`)}</span>`)
      : hogtid === 'hjarta' ? n(5, (i) => `<b class="hm3-hjarta" style="--x:${(i * 23 + 50) % 95}%;--d:${(-i * 1.6).toFixed(2)}s"></b>`) : '';
    return `<div class="himmel3" data-fas="${fas}" data-arstid="${arstid}" data-hogtid="${hogtid}" aria-hidden="true"><span class="hm3-gradient"></span>${moln}${ljus}${vader}${extra}</div>`;
  }
  function idagTopp() {
    const h = idag().getHours(), natt = h < 5 || h >= 21, morgon = h >= 5 && h < 10;
    const hej = morgon ? 'God morgon' : h < 17 && !natt ? 'Hej' : 'God kväll';
    const veckaPass = Array.from({ length: 7 }, (_, i) => st.pass.filter((x) => x.datum === dagStr(dagar(-i))).length).reduce((a, b) => a + b, 0);
    const c = senasteCheckin(), df = dagsform(c), hp = halsopoang();
    const rad = !c || c.datum !== dagStr(idag()) ? 'Hur känns kroppen idag? En check-in tar ett tryck.'
      : df >= 75 ? `Starkt läge idag – ${veckaPass} pass senaste veckan.` : df >= 60 ? `Bra läge – ${veckaPass} pass senaste veckan.` : 'Ta det lugnt idag – återhämtning räknas också.';
    const R = 25, L = 2 * Math.PI * R;
    const hm = himmelLage();
    return `<header class="valkomst in" style="--i:0">${LANDS ? lsHero() : himmelHtml()}
      <div class="valkomst-text">
        <span class="ios-datum">${ik(natt || h >= 17 ? 'mane' : 'sol')}${e(datumText())}${hm.halsning ? ` · ${e(hm.halsning)}` : ''}</span>
        <h1 class="ios-titel"><span class="ios-titel-text">${e(hej)}, ${e(visNamn())}</span></h1>
        <p class="ios-under">${e(rad)}</p>
        ${(() => { const sv = svit(), p0 = planFor(idag()), gj = passPa(dagStr(idag())).length, ci = c && c.datum === dagStr(idag());
          const del = [sv > 1 ? ['flamma', 'glod', sv, sv === 1 ? 'dag i rad' : 'dagar i rad'] : ['flamma', 'gra', 0, 'dagar i rad'],
            p0 ? [gj ? 'bock' : typIkon(p0.typ), gj ? 'ok' : 'is', gj ? 'Klar' : p0.tid, p0.typ] : ['mane', 'is', 'Vila', 'idag'],
            ci ? ['puls', df >= 60 ? 'ok' : 'gul', df, 'dagsform'] : ['puls', 'gra', 'Check-in', 'väntar']];
          return `<div class="ios-glance" aria-label="Idag i korthet">${del.map(([i, t, v, x], n) => `<button type="button" class="ios-g" data-t="${t}" style="--n:${n}" data-g="${n === 2 ? 'checkin' : n === 1 && p0 ? 'ts-checka' : 'flik'}" ${n === 0 ? 'data-v="jag"' : ''}>${ik(i)}<span><b class="tal">${e(String(v))}</b><small>${e(x)}</small></span></button>`).join('')}</div>`; })()}
      </div>
      <button class="valkomst-profil" data-g="flik" data-v="jag" aria-label="Din profil · hälsopoäng ${hp}">
        <svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="${R}" class="vp-spar"/><circle cx="30" cy="30" r="${R}" class="vp-bage" style="stroke-dasharray:${L};stroke-dashoffset:${L * (1 - hp / 100)}"/></svg>
        <span class="profilbild">${e(visNamn()[0])}</span><small class="tal">${hp}</small></button>
    </header>`;
  }
  // Belastningsmätaren: tre zoner med mellanrum, etiketter utanför bågen, smal visare med nav.
  function acwrSvg(kvot) {
    const T = (v) => klamp((v - .4) / 1.6, 0, 1), P = (t, r) => [115 - r * Math.cos(Math.PI * t), 116 - r * Math.sin(Math.PI * t)];
    const bage = (t0, t1, k) => { const [x0, y0] = P(t0, 96), [x1, y1] = P(t1, 96); return `<path class="${k}" d="M${x0.toFixed(1)} ${y0.toFixed(1)}A96 96 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`; };
    const lapp = (v) => { const [x, y] = P(T(v), 116); return `<text class="zon-etikett" x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle">${fmt(v, 1)}</text>`; };
    const vinkel = T(kvot) * 180 - 90;
    return `<svg viewBox="0 0 230 130" aria-hidden="true">${bage(0, T(.8) - .012, 'zon-lag')}${bage(T(.8) + .012, T(1.3) - .012, 'zon-ok')}${bage(T(1.3) + .012, 1, 'zon-hog')}
      ${lapp(.8)}${lapp(1.3)}<g class="visare ac-svep" style="--v:${vinkel}deg;transform:rotate(${vinkel}deg)"><g class="ac-darr"><path d="M112.5 116 L115 40 L117.5 116 Z"/><circle class="ac-spets" cx="115" cy="42" r="3.2"/></g><circle cx="115" cy="116" r="9" class="nav"/><circle cx="115" cy="116" r="3.5" class="nav-mitt"/></g></svg>`;
  }
  // Motionärens dagsform i iOS 26-stil (som Aktivitet/Fitness): tre ringar med rund ände och glans vid huvudet,
  // värdena i en lista bredvid med förändring mot snittet, en smart rad och en fotnot.
  function motionarHjalte(df, ord, ton) {
    const sju = st.checkin.slice(-7), c = senasteCheckin() || {};
    const snitt = (f) => { const v = sju.slice(0, -1).map(f); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : f(c); };
    const min = (fran, till) => st.pass.filter((x) => { const d = (idag() - new Date(x.datum)) / 864e5; return d >= fran && d < till; }).reduce((s, x) => s + x.min, 0);
    const vecka = min(0, 7), forra = min(7, 14), somn = c.somn || 0;
    const R = [64, 46, 28], W = 13, C = R.map((r) => 2 * Math.PI * r);
    const ringar = [
      { namn: 'Dagsform', tal: `${df}`, av: '/100', p: df / 100, d: df - snitt((x) => dagsform(x)), f: ['#4cdcb1', '#14a07a'], spar: 'rgba(47, 198, 155, .22)' },
      { namn: 'Rörelse', tal: `${vecka}`, av: ' min', p: vecka / 150, d: vecka - forra, enh: ' min', f: ['#7ab8f5', '#2c74c2'], spar: 'rgba(61, 143, 224, .2)' },
      { namn: 'Sömn', tal: `${somn}`, av: '/10', p: somn / 10, d: somn - snitt((x) => x.somn), f: ['#ffc65a', '#e98d1c'], spar: 'rgba(240, 163, 60, .22)' }];
    const huvud = (r, p) => { const v = Math.min(p, 1) * 2 * Math.PI - Math.PI / 2; return [80 + r * Math.cos(v), 80 + r * Math.sin(v)]; };
    const bra = ringar.slice().sort((x, y) => y.d / (y.namn === 'Rörelse' ? 30 : 1) - x.d / (x.namn === 'Rörelse' ? 30 : 1));
    const insikt = vecka >= 150 ? `Veckans rörelsemål är nått${bra[0].namn !== 'Rörelse' && bra[0].d >= .5 ? ` · ${bra[0].namn.toLowerCase()} drar upp` : ''}`
      : `${150 - vecka} min kvar till veckans mål${bra[0].d >= .5 ? ` · ${bra[0].namn.toLowerCase()} drar upp` : ''}`;
    const delta = (g) => { const v = g.namn !== 'Sömn' ? Math.round(g.d) : Math.round(g.d * 10) / 10, t = Math.abs(v) < (g.namn === 'Rörelse' ? 5 : g.namn === 'Dagsform' ? 2 : .5) ? 'is' : v > 0 ? 'ok' : 'gul';
      return `<em class="lg-delta" data-ton="${t}" data-rikt="${t === 'is' ? 'lika' : v > 0 ? 'upp' : 'ner'}">${t === 'is' ? '±0' : `${fmt(Math.abs(v), g.namn === 'Rörelse' || Number.isInteger(v) ? 0 : 1)}${g.enh || ''}`}</em>`; };
    const hh = idag().getHours(), fas = hh >= 5 && hh < 10 ? 'morgon' : hh < 17 ? 'dag' : hh < 22 ? 'kvall' : 'natt';
    return `<section class="mh in" style="--i:1" data-fas="${fas}">
      <div class="mh-topp"><div><small>Idag</small><h3>Dagsform</h3></div><span class="mh-status" data-ton="${ton}"><i></i>${ord}</span></div>
      <div class="mh-rad">
        <svg class="mh-ringar" viewBox="0 0 160 160" aria-hidden="true"><defs>${ringar.map((g, i) => `<linearGradient id="mh-g${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g.f[0]}"/><stop offset="1" stop-color="${g.f[1]}"/></linearGradient>`).join('')}</defs>
          ${ringar.map((g, i) => { const p = klamp(g.p, .002, 1), [hx, hy] = huvud(R[i], p);
            return `<circle cx="80" cy="80" r="${R[i]}" fill="none" stroke="${g.spar}" stroke-width="${W}"/>
            <circle class="mh-bage" cx="80" cy="80" r="${R[i]}" fill="none" stroke="url(#mh-g${i})" stroke-width="${W}" stroke-linecap="round" style="--C:${C[i].toFixed(1)};--d:${i * 120}ms;stroke-dasharray:${C[i].toFixed(1)};stroke-dashoffset:${(C[i] * (1 - p)).toFixed(1)}" transform="rotate(-90 80 80)"/>
            <circle class="mh-huvud" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${W / 2 - 1.5}" fill="${g.f[1]}" style="--d:${i * 120 + 1500}ms"/>`; }).join('')}</svg>
        <ul class="mh-lista">${ringar.map((g, i) => `<li data-n="${i}"><span class="mh-namn"><i></i>${g.namn}</span><span class="mh-varde"><b class="tal">${g.tal}</b><small>${g.av}</small>${delta(g)}</span></li>`).join('')}</ul></div>
      <p class="mh-insikt">${ik('gnista')}<span>${e(insikt)}</span></p>
      <small class="mh-not">Förändring mot ditt snitt de senaste 7 dagarna · rörelse mot förra veckan</small></section>`;
  }
  function vyIdag() {
    const p = st.profil, c = senasteCheckin(), df = dagsform(c), [ord, ton] = statusOrd(df);
    const sju = st.checkin.slice(-7), somn = c ? c.somn : 0;
    const minuter = (d) => st.pass.filter((x) => x.datum === d).reduce((s, x) => s + x.min, 0);
    const vecka = Array.from({ length: 7 }, (_, i) => minuter(dagStr(dagar(i - 6)))).reduce((a, b) => a + b, 0);
    const zoner = (p.ont || []).slice().sort((a, b) => b.niva - a.niva);
    const b = belastning(), kvot = b.kvot;
    const zonB = kvot < .8 ? ['Låg', 'is'] : kvot <= 1.3 ? ['Optimal', 'ok'] : kvot <= 1.5 ? ['Förhöjd', 'gul'] : ['Hög risk', 'rod'];
    // förändring mot snittet för dagarna före idag (samma regel som Beredskapen), rörelse mot de sju dagarna innan
    const fore = sju.slice(0, -1), forut = (k) => (fore.length ? medel(fore.map((x) => x[k])) : (c ? c[k] : 0));
    const dfD = fore.length ? df - medel(fore.map(dagsform)) : 0, somnD = somn - forut('somn');
    const forraVecka = Array.from({ length: 7 }, (_, i) => minuter(dagStr(dagar(i - 13)))).reduce((a, x) => a + x, 0);
    const ringar = elit()
      ? [{ v: df, tal: df, namn: 'Beredskap' }, { v: kvot ? klamp(100 - Math.abs(kvot - 1.05) * 160, 8, 100) : 0, tal: fmt(kvot, 2), namn: 'Belastning' }, { v: somn * 10, tal: `${somn}/10`, namn: 'Sömn' }]
      : [{ v: df, tal: df, namn: 'Dagsform', delta: [dfD, true, 0] }, { v: vecka / 1.5, tal: `${vecka} min`, namn: 'Rörelse', delta: [vecka - forraVecka, true, 0] }, { v: somn * 10, tal: `${somn}/10`, namn: 'Sömn', delta: [somnD, true, 1] }];
    const hjalte = elit() ? elitHud(df, kvot, somn, ord, ton) : motionarHjalte(df, ord, ton);
    // Bento: alla rutor har samma byggnad (topp · tal · rad under · graf nederst), så att rader går jämnt ut.
    const staplarSju = (vals, max, t = '') => `<div class="mini-staplar"${t ? ` data-ton="${t}"` : ''}>${vals.map((x, i) => `<i style="--h:${Math.max(6, x / max * 100)}%;--i:${i}"></i>`).join('')}</div>`;
    const ruta = ({ ikon, t, namn, tal, under, graf, delta }) => `<div class="bento-ruta"><div class="bento-topp"><span class="ikonruta"${t ? ` data-ton="${t}"` : ''}>${ik(ikon)}</span><span class="bento-namn">${namn}</span></div>
      <div class="bento-talrad"><b class="bento-tal tal">${tal}</b>${delta || ''}</div><small class="bento-under">${under}</small><div class="bento-graf">${graf}</div></div>`;
    const somnVals = sju.map((x) => x.somn), stressVals = sju.map((x) => x.stress), energiVals = sju.map((x) => x.energi);
    const snitt = (v) => (v.length ? fmt(v.reduce((a, x) => a + x, 0) / v.length, 1) : '–');
    const stressNu = c ? c.stress : 0, stressOrd = stressNu <= 3 ? 'Låg' : stressNu <= 6 ? 'Måttlig' : 'Hög';
    const stressRuta = ruta({ ikon: 'vag', t: 'is', namn: 'Stress', tal: `${stressNu}<small>/10</small>`, under: `${stressOrd} · snitt ${snitt(stressVals)}`, graf: minisparkar(stressVals), delta: deltaHtml(stressNu - forut('stress'), false) });
    const kroppRuta = `<button class="bento-ruta bred tryck" data-g="flik" data-v="kropp"><div class="bento-topp"><span class="ikonruta" data-ton="rod">${ik('kropp')}</span><span class="bento-namn">Kroppen</span>${ik('hoger')}</div>
      <div class="kropp-mini"><div data-kropp-plats></div><div>${zoner.length ? zoner.slice(0, 3).map((z) => `<div class="zonrad"><b>${e(regionNamn(z.id))}</b><span class="matare" data-ton="${z.niva >= 6 ? 'rod' : 'gul'}"><i style="--v:${z.niva * 10}%"></i></span><span class="niva-tal tal">${z.niva}</span></div>`).join('')
        : `<p class="dampad" style="font-size:.84rem">Inga besvär markerade. Tryck på kroppen om något känns.</p>`}<span class="kropp-mini-tips">Tryck för kroppskartan</span></div></div></button>`;
    let bento, efter;
    if (elit()) {
      const manad = st.pass.filter((x) => (idag() - new Date(x.datum)) / 864e5 < 28), matcher = manad.filter((x) => x.typ === MATCH).length, skada = st.skador.find((s) => !s.slut);
      const vinkel = klamp((kvot - .4) / 1.6, 0, 1) * 180 - 90;
      // 28 dagar som streck: dagarna med pågående skada är begränsade (gul). Exempeldata.
      const begr = skada ? klamp(Math.round((idag() - new Date(skada.start)) / 864e5) + 1, 0, 28) : 0;
      const dagband = `<div class="dagband" aria-hidden="true">${Array.from({ length: 28 }, (_, i) => `<i ${i >= 28 - begr ? 'data-t="begr"' : ''} style="--i:${i}"></i>`).join('')}</div>`;
      bento = `<div class="bento in" style="--i:5">
        <div class="bento-ruta bred"><div class="bento-topp"><span class="ikonruta" data-ton="${zonB[1]}">${ik('trend')}</span><span class="bento-namn">Belastning · akut : kronisk</span><span class="chip" data-ton="${zonB[1]}">${zonB[0]}</span></div>
          <div class="belastning-rad"><div class="acwr acwr2">${acwrSvg(kvot)}</div>
            <div class="belastning-tal"><b class="tal">${fmt(kvot, 2)}</b><small>ACWR idag</small><span><b class="tal" data-rakna="${Math.round(b.akut)}">0</b> AU · 7 d</span><span>Optimalt 0,8–1,3</span></div></div>
          ${veckaStaplar((d) => st.pass.filter((x) => x.datum === d).reduce((s, x) => s + x.min * x.rpe, 0), 'AU')}
          ${insiktHtml(`Senaste 7 dagarnas belastning delad med snittet för 28 dagar – ${kvot < .8 ? 'under' : kvot <= 1.3 ? 'inom' : 'över'} den optimala zonen.`, 'info', 'bento-insikt')}</div>
        ${ruta({ ikon: 'team', namn: 'Tillgänglighet', tal: `<span data-rakna="${skada ? 82 : 98}">0</span><small>%</small>`, under: `28 dagar · ${matcher} ${LANDS ? 'tävlingar' : 'matcher'}`, graf: dagband })}
        ${stressRuta}
        ${kroppRuta}</div>`;
      efter = `${skada ? skadeKort(skada, 6) : ''}${pcmeKort(7)}`;
    } else {
      const dagMin = Array.from({ length: 7 }, (_, i) => minuter(dagStr(dagar(i - 6)))), energiNu = c ? c.energi : 0;
      bento = `<div class="bento in" style="--i:4">
        ${ruta({ ikon: 'mane', t: 'gul', namn: 'Sömn', tal: `${somn}<small>/10</small>`, under: `Snitt ${snitt(somnVals)} · 7 nätter`, graf: staplarSju(somnVals, 10), delta: deltaHtml(somnD) })}
        ${ruta({ ikon: 'sko', t: 'is', namn: 'Rörelse', tal: `<span data-rakna="${vecka}">0</span><small>min</small>`, under: vecka >= 150 ? 'Veckans mål är nått' : `${150 - vecka} min kvar av 150`, graf: staplarSju(dagMin, Math.max(...dagMin, 30), 'is'), delta: deltaHtml(vecka - forraVecka, true, 0) })}
        ${ruta({ ikon: 'batteri', namn: 'Energi', tal: `${energiNu}<small>/10</small>`, under: `${energiNu >= 7 ? 'Hög' : energiNu >= 5 ? 'Normal' : 'Låg'} · snitt ${snitt(energiVals)}`, graf: minisparkar(energiVals), delta: deltaHtml(energiNu - forut('energi')) })}
        ${stressRuta}
        ${kroppRuta}</div>`;
      const TIPS = LANDS ? [['Stakning · 10 min', 'Korta, explosiva stakningar på rullskidor bygger överkroppen inför snön.', 'skidor', 'is'], ['Rörlighet i höften', 'Höftböjare och vader – fem minuter före passet ger ett längre frånskjut.', 'rorlighet', ''], ['Valla rätt', 'Kolla snötemperaturen i vallaguiden innan du åker ut.', 'droppe', 'gul']] : [['Sömn', 'Lika läggdags varje kväll ger kroppen en rytm att återhämta sig i.', 'mane', 'gul'], ['Rörlighet · 5 min', 'Höft, bröstrygg och vader – tre övningar innan frukost.', 'rorlighet', ''], ['Återhämtning', 'En lugn promenad räknas också – och sänker stressen.', 'hjarta', 'is']];
      efter = `<section class="kort tips-lista in" style="--i:5"><div class="kort-rubrik"><div><span class="ogon utan">För dig idag</span><h3>Tre små saker</h3></div><span class="chip">${ik('gnista')}Tips</span></div>
          <ul class="lista">${TIPS.map(([t, x, i, f]) => `<li><span class="ikonruta"${f ? ` data-ton="${f}"` : ''}>${ik(i)}</span><div><b>${t}</b><small>${x}</small></div></li>`).join('')}</ul></section>
        <button class="kort tryck nasta-steg in" style="--i:6" data-g="screening-boka"><div class="rad"><span class="ikonruta" data-ton="is">${ik('kalender')}</span><div style="flex:1;min-width:0"><span class="ogon utan">Nästa steg</span>
          <h3>Fyll i förscreeningen</h3><p class="liten">12 frågor inför din hälsokartläggning</p></div>${ik('hoger')}</div><div class="nasta-framsteg"><div class="matare"><i style="--v:42%"></i></div><small class="tal">5 av 12</small></div></button>`;
    }
    return `<div class="idag-vy">${idagTopp()}${veckoRemsa()}${hjalte}${LANDS ? sasongKort(2) : ''}${elit() ? matchKort(2) : ''}${snabbcheck(elit() ? 3 : 2)}${schemaKort(elit() ? 3 : 2)}${LANDS ? vallaKort(elit() ? 3 : 2) : ''}${fokusKort(elit() ? 4 : 3)}${loppKort(elit() ? 4 : 3)}${bento}${efter}
      <p class="exempel in" style="--i:8">Exempeldata i prototypen</p></div>`;
  }
  function skadeKort(s, i) {
    const d = Math.round((idag() - new Date(s.start)) / 864e5);
    return `<div class="kort in" style="--i:${i}"><div class="kort-rubrik"><h3>Skaderegister</h3><span class="chip" data-ton="${d >= 14 ? 'rod' : 'gul'}">${d >= 14 ? 'Bedöm sjukskrivning' : 'Pågår'}</span></div>
      <div class="skaderad"><span class="ikonruta" data-ton="rod">${ik('plaster')}</span><div><b>${e(regionNamn(s.region))}</b><span class="liten">Skadedatum ${new Date(s.start).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} · ${e(s.typ)}</span></div>
        <div class="dagar"><b class="tal">${d}</b><small>dagar</small></div></div>
      <div class="tidslinje-dagar"><i style="--v:${Math.min(100, d / 21 * 100)}%"></i><em style="--g:${14 / 21 * 100}%"></em></div>
      <div class="tidslinje-axel" aria-hidden="true"><span>Dag 0</span><span style="--g:${14 / 21 * 100}%">14 d · varning</span><span>21 d</span></div>
      ${insiktHtml(d >= 14 ? 'Fjorton dagar har passerat – medicinsk personal bedömer sjukskrivning.' : `Varning efter 14 dagar – ${14 - d} dagar kvar.`, d >= 14 ? 'varning' : 'klocka', 'skade-not')}</div>`;
  }
  const PCME = [['EKG', 'Årligen', 'puls', 'ok'], ['Blod- och urinprov', 'Årligen', 'droppe', 'ok'], ['Hjärtultraljud', 'Vartannat år', 'hjarta', 'gul'], ['Läkarundersökning', 'Årligen', 'skold', 'ok'],
    ['Sjukdomshistoria', 'Uppdateras årligen', 'dokument', 'ok'], ['Funktionsscreening', 'Årligen', 'rorlighet', 'tom'], ['Hjärnskakningsscreening', 'Årligen', 'hjarna', 'tom']];
  function pcmeKort(i) {
    const klara = PCME.filter((x) => x[3] === 'ok').length;
    return `<div class="kort in" style="--i:${i}"><div class="kort-rubrik"><div><h3>PCME</h3><span class="liten">Medicinsk kontroll inför tävling</span></div><span class="chip chip-tal tal" data-ton="${klara === PCME.length ? 'ok' : 'gul'}">${klara}/${PCME.length}</span></div>
      <div class="lg-matare" aria-hidden="true"><i style="--v:${klara / PCME.length * 100}%"></i></div>
      ${insiktHtml(`${klara} av ${PCME.length} klara · ${PCME.filter((x) => x[3] === 'gul').length} bokas nästa år · ${PCME.filter((x) => x[3] === 'tom').length} ingår i screeningen`, 'skold')}
      <ul class="lista pcme-lista">${PCME.map(([t, n, ic, ton]) => `<li><span class="ikonruta" style="width:34px;height:34px;border-radius:11px">${ik(ic)}</span><div><b>${t}</b><small>${n}${ton === 'gul' ? ' · bokas nästa år' : ton === 'tom' ? ' · ingår i screeningen' : ''}</small></div><span class="status" data-ton="${ton}">${ton === 'ok' ? ik('bock') : ton === 'gul' ? ik('kalender') : ''}</span></li>`).join('')}</ul></div>`;
  }

  /* ---- 10 Kropp: Ont · Testvärden (mot din baslinje) · Medicinskt ---- */
  // Testvärden per kroppsdel jämfört med personens egen baslinje (förra testet). Exempeldata.
  const BASLINJE = [
    { k: 'axlar', namn: 'Axlar', reg: ['axel-v', 'axel-h'], ton: { v: 'gul', h: 'ok' }, test: [['Utåtrotation', '°', [88, 84, 80], [90, 91, 92], 90], ['Inåtrotation', '°', [52, 55, 54], [55, 56, 57], 55]] },
    { k: 'grepp', namn: 'Grepp', reg: ['handled-v', 'handled-h'], ton: { v: 'ok', h: 'ok' }, test: [['Greppstyrka', 'kg', [46, 47, 48], [50, 51, 52], 49]] },
    { k: 'bal', namn: 'Bål', reg: ['mage', 'landrygg'], ton: { v: 'ok', h: 'ok' }, test: [['Planka', 's', [95, 104, 112], null, 100], ['Ryggextension', 's', [80, 86, 88], null, 85]] },
    { k: 'hoft', namn: 'Höft', reg: ['hoft-v', 'hoft-h'], ton: { v: 'ok', h: 'ok' }, test: [['Höftflexion', '°', [118, 120, 121], [117, 119, 122], 118]] },
    { k: 'lar', namn: 'Lår', reg: ['lar-v', 'lar-h', 'baklar-v', 'baklar-h'], ton: { v: 'gul', h: 'ok' }, test: [['Baksida lår (excentrisk)', 'N', [330, 318, 301], [335, 338, 342], 335], ['Framsida lår', 'Nm', [210, 212, 214], [214, 216, 219], 212]] },
    { k: 'fotled', namn: 'Fotled', reg: ['fotled-v', 'fotled-h', 'vad-v', 'vad-h'], ton: { v: 'gul', h: 'rod' }, test: [['Dorsalflexion (knä mot vägg)', 'cm', [11, 10.5, 10], [10.5, 9.4, 8.1], 10.5], ['Enbenshopp', 'cm', [24, 25, 25], [23, 21, 19], 24]] },
  ];
  const TON_TEXT = { ok: 'Inom baslinje', gul: 'Strax under baslinje', rod: 'Under baslinje' };
  const TON_NIVA = { ok: 2, gul: 5, rod: 8 };
  let kroppLage = 'ont', kroppLageForra = 'ont'; // förra läget: lägesväljarens markör glider därifrån
  const grupp = (id) => BASLINJE.find((g) => g.reg.includes(id));
  const sidaAv = (id) => (/-v$/.test(id) ? 'v' : 'h');
  function baslinjeZoner() {
    return BASLINJE.flatMap((g) => g.reg.map((id) => { const t = g.ton[sidaAv(id)] || g.ton.v; return { id, niva: TON_NIVA[t], ton: t, text: TON_TEXT[t].replace(' baslinje', '') }; }))
      .filter((z) => z.ton !== 'ok' || /axel|hoft|lar-|fotled|handled|mage/.test(z.id));
  }
  function prickar(g) { return `<span class="prickar">${['v', 'h'].map((x) => `<i data-ton="${g.ton[x]}"></i>`).join('')}</span>`; }
  // Kropp, version 3: scen med svävande lägesväljare, snabbval, smärtdagbok per område, rörlighetsförslag och framtidsverktyg.
  const SNABBVAL = [['nacke', 'Nacke', null], ['axel', 'Axel', ['axel-v', 'axel-h']], ['ovre-rygg', 'Övre rygg', null], ['landrygg', 'Ländrygg', null], ['hoft', 'Höft', ['hoft-v', 'hoft-h']],
    ['kna', 'Knä', ['kna-v', 'kna-h']], ['vad', 'Vad', ['vad-v', 'vad-h']], ['fotled', 'Fotled', ['fotled-v', 'fotled-h']], ['armbage', 'Armbåge', ['armbage-v', 'armbage-h']], ['handled', 'Handled', ['handled-v', 'handled-h']]];
  const OVNINGAR = {
    nacke: [['Haka in', '10 gånger, lugnt'], ['Axelrullningar', '10 gånger bakåt'], ['Nackrotation', '5 gånger åt varje håll']],
    axel: [['Pendelrörelse', '30 sekunder'], ['Väggänglar', '10 gånger'], ['Utåtrotation med band', '12 gånger']],
    rygg: [['Katt och ko', '10 gånger'], ['Barnets position', '30 sekunder'], ['Höftlyft', '12 gånger']],
    hoft: [['Höftböjarstretch', '30 sekunder per sida'], ['Musslan', '12 gånger per sida'], ['Höftlyft', '12 gånger']],
    lar: [['Lugn stretch baksida lår', '30 sekunder per sida'], ['Höftlyft', '12 gånger'], ['Lätt cykling', '5 minuter']],
    kna: [['Raka benlyft', '12 gånger'], ['Halv knäböj mot vägg', '10 gånger'], ['Lätt cykling', '5 minuter']],
    fot: [['Tåhävningar', '12 gånger'], ['Fotledscirklar', '10 åt varje håll'], ['Vadstretch mot vägg', '30 sekunder']],
    arm: [['Handledscirklar', '10 åt varje håll'], ['Underarmsstretch', '30 sekunder'], ['Lätt greppövning', '15 gånger']],
  };
  const ovningsGrupp = (id) => (/nacke|huvud/.test(id) ? 'nacke' : /axel|brost/.test(id) ? 'axel' : /rygg|mage/.test(id) ? 'rygg' : /hoft|ljumske/.test(id) ? 'hoft'
    : /lar/.test(id) ? 'lar' : /kna/.test(id) ? 'kna' : /vad|fotled/.test(id) ? 'fot' : 'arm');
  // Smärtdagboken: sparade nivåer per område; saknas historik byggs en lugn exempelkurva mot dagens nivå.
  function dagbok(id, nu) {
    const logg = (st.ontLogg || []).filter((x) => x.id === id);
    if (logg.length >= 3) return logg.slice(-14).map((x) => x.niva);
    const s = id.length; return Array.from({ length: 14 }, (_, i) => klamp(Math.round(nu + 2.4 - i * .18 + Math.sin(i * 1.3 + s) * .8), 0, 10)).concat([nu]).slice(-14);
  }
  const dagbokEgen = (id) => (st.ontLogg || []).filter((x) => x.id === id).length >= 3;
  // Kurvan i nivåns färg (currentColor), stödlinjer vid 0/5/10, punkt för idag. Skalas med bibehållna proportioner (punkterna förblir runda).
  let dagbokNr = 0;
  function dagbokSvg(v) {
    const w = 300, h = 64, p = 6, dx = (w - p * 2) / (v.length - 1), y = (n) => h - p - n / 10 * (h - p * 2), gid = `kv-db-${++dagbokNr}`;
    const pts = v.map((n, i) => `${(p + i * dx).toFixed(1)},${y(n).toFixed(1)}`).join(' ');
    return `<svg class="dagbok" viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".26"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
      ${[0, 5, 10].map((n) => `<line x1="${p}" x2="${w - p}" y1="${y(n)}" y2="${y(n)}" class="dagbok-stod"/>`).join('')}
      <polygon points="${p},${h - p} ${pts} ${w - p},${h - p}" fill="url(#${gid})" class="dagbok-yta"/><polyline points="${pts}" pathLength="1" class="dagbok-linje"/>
      <circle cx="${w - p}" cy="${y(v[v.length - 1])}" r="5" class="dagbok-nu"/></svg>`;
  }
  const NIVA_ORD = (n) => (n === 0 ? 'Inget ont' : n <= 3 ? 'Lätt' : n <= 6 ? 'Måttlig' : n <= 9 ? 'Stark' : 'Värsta tänkbara');
  const nivaTon = (n) => (n >= 7 ? 'rod' : n >= 4 ? 'gul' : 'ok');
  const varstTon = (g) => (Object.values(g.ton).includes('rod') ? 'rod' : Object.values(g.ton).includes('gul') ? 'gul' : 'ok');
  const KV_LAGEN = ['ont', 'test', 'med'];
  function vyKropp() {
    const zoner = (st.profil.ont || []).slice().sort((a, b) => b.niva - a.niva);
    const seg = [['ont', 'Ont', 'plaster'], ['test', 'Testvärden', 'trend'], ['med', 'Medicinskt', 'las']];
    const fran = KV_LAGEN.indexOf(kroppLageForra); kroppLageForra = kroppLage; // markören glider bara vid själva bytet
    const max = zoner.length ? zoner[0].niva : 0;
    const tally = ['rod', 'gul', 'ok'].map((t) => [t, BASLINJE.filter((g) => varstTon(g) === t).length]);
    const folj = BASLINJE.length - tally[2][1];
    const sammanfattning = kroppLage === 'ont' ? (zoner.length ? `${zoner.length} ${zoner.length === 1 ? 'område' : 'områden'} · högst ${max}/10` : 'Inga besvär markerade')
      : kroppLage === 'test' ? `${folj} av ${BASLINJE.length} att följa upp` : 'Granskas av läkare';
    const sumTon = kroppLage === 'ont' ? (zoner.length ? nivaTon(max) : 'ok') : kroppLage === 'test' ? (tally[0][1] ? 'rod' : folj ? 'gul' : 'ok') : 'is';
    let innehall = '';
    if (kroppLage === 'ont') {
      innehall = `<div class="sektion-rubrik kv-rubrik in" style="--i:2"><h3>Var känns det?</h3><span class="liten">Eller tryck på kroppen</span></div>
        <div class="kv-snabb in" style="--i:2">${SNABBVAL.map(([k, t, ids]) => { const hit = zoner.filter((z) => (ids || [k]).includes(z.id)), aktiv = hit.length > 0;
          return `<button class="kv-snabbval" data-g="snabbval" data-k="${k}" aria-pressed="${aktiv}">${aktiv ? `<i class="kv-prick" data-ton="${nivaTon(Math.max(...hit.map((z) => z.niva)))}"></i>` : ''}<span>${t}</span></button>`; }).join('')}</div>
        ${zoner.length ? `<div class="sektion-rubrik kv-rubrik in" style="--i:3"><h3>Smärtdagbok</h3><span class="liten">${zoner.length} ${zoner.length === 1 ? 'område' : 'områden'} · 14 dagar</span></div>
        <div class="kv-zoner">${zoner.map((z, n) => { const v = dagbok(z.id, z.niva), forst = v[0], ton = nivaTon(z.niva), egen = dagbokEgen(z.id);
          const trend = z.niva < forst ? ['Minskar', 'ok'] : z.niva > forst ? ['Ökar', 'rod'] : ['Oförändrad', 'is'];
          return `<article class="kort kv-zon in" style="--i:${3 + n}" data-ton="${ton}"><div class="kv-zon-topp">
              <div class="kv-matare" style="--v:${z.niva * 10}" aria-label="${z.niva} av 10"><svg viewBox="0 0 56 56" aria-hidden="true"><circle class="spar" cx="28" cy="28" r="24"/><circle class="bage" cx="28" cy="28" r="24" pathLength="100"/></svg><b class="tal">${z.niva}</b></div>
              <div class="kv-zon-namn"><b>${e(regionNamn(z.id))}</b><span>${e(z.typ || 'Värk')} · ${e((z.sedan || 'Några dagar').toLowerCase())}</span></div>
              <span class="chip kv-trend" data-ton="${trend[1]}">${trend[0]}</span></div>
            <div class="kv-dagbok" data-ton="${ton}"><div class="kv-dagbok-topp"><span>${NIVA_ORD(z.niva)} · ${z.niva}/10 idag</span><span class="kv-dagbok-hoger">${deltaHtml(z.niva - forst, false, 0)}${egen ? '' : '<span class="exempel">Exempel</span>'}</span></div>${dagbokSvg(v)}
              <div class="kv-axel" aria-hidden="true"><span>14 dagar sedan</span><span>Idag</span></div></div>
            <div class="kv-knappar"><button class="knapp knapp-sek" data-g="zon" data-id="${z.id}">${ik('uppdatera')}Uppdatera</button><button class="knapp knapp-sek" data-g="ovningar" data-id="${z.id}">${ik('rorlighet')}Övningar</button></div></article>`; }).join('')}</div>`
          : `<div class="kort kv-tom in" style="--i:3"><span class="kv-tom-ikon">${ik('kropp')}</span><b>Inget ont just nu</b><small>Tryck på kroppen eller välj ett område ovan när något känns – vi följer det över tid.</small></div>`}
        <div class="bara-elit">${st.skador.filter((x) => !x.slut).map((x) => skadeKort(x, 6)).join('')}</div>`;
    } else if (kroppLage === 'test') {
      const TALLY = { rod: 'Under', gul: 'Strax under', ok: 'Inom' };
      // största avvikelsen mot baslinjen (senaste testet mot baslinjevärdet), räknad ur exempeldatan
      const avv = BASLINJE.flatMap((g) => g.test.flatMap((t) => [['v', t[2]], ['h', t[3]]].filter(([, a]) => a).map(([sd, a]) => ({ g, t, sd: t[3] ? sd : '', pr: (a[a.length - 1] - t[4]) / t[4] * 100 })))).sort((x, y) => x.pr - y.pr)[0];
      innehall = `<div class="kort kv-test in" style="--i:2"><div class="kort-rubrik"><div><h3>Fysik mot din baslinje</h3><span class="liten">Senaste test ${dagar(-12).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })} · ${BASLINJE.length} kroppsdelar</span></div><span class="exempel">Exempel</span></div>
          <div class="kv-fordelning" role="img" aria-label="${tally.map(([t, n]) => `${n} ${TALLY[t].toLowerCase()}`).join(', ')}">${tally.filter(([, n]) => n).map(([t, n]) => `<i data-ton="${t}" style="--n:${n}"></i>`).join('')}</div>
          <div class="kv-tally2">${tally.map(([t, n]) => `<span data-ton="${t}"><i></i><b class="tal">${n}</b>${TALLY[t]}</span>`).join('')}</div>
          ${avv && avv.pr < 0 ? insiktHtml(`Störst avvikelse: ${avv.t[0].toLowerCase()}${avv.sd ? `, ${avv.sd === 'v' ? 'vänster' : 'höger'}` : ''} – ${fmt(Math.abs(avv.pr), 0)} % under baslinjen`, 'trend', 'kv-insikt') : ''}
          <div class="kv-lista">${BASLINJE.map((g, n) => { const t = varstTon(g), ensidig = g.test.every((x) => !x[3]);
            return `<button class="kv-listrad" data-g="grupp" data-k="${g.k}" data-ton="${t}" style="--n:${n}"><span class="kv-listikon" data-ton="${t}">${ik({ axlar: 'rorlighet', grepp: 'hantel', bal: 'kropp', hoft: 'balans', lar: 'sko', fotled: 'sko' }[g.k] || 'kropp')}</span>
              <span class="kv-listtext"><b>${g.namn}</b><small>${TON_TEXT[t]}</small></span>
              <span class="kv-sidor2">${ensidig ? `<i data-ton="${g.ton.v}" title="Hela"></i>` : ['v', 'h'].map((s) => `<span><i data-ton="${g.ton[s]}"></i>${s === 'v' ? 'V' : 'H'}</span>`).join('')}</span>${ik('hoger')}</button>`; }).join('')}</div></div>`;
    } else {
      innehall = `<div class="kort kv-med in" style="--i:2"><div class="kort-rubrik"><div><h3>Medicinska värden</h3><span class="liten">Bara du och medicinsk personal</span></div><span class="chip" data-ton="is">${ik('las')}Skyddat</span></div>
          <ul class="kv-med-lista">${[['EKG', 'puls'], ['Spirometri', 'lunga'], ['Blodprov', 'droppe'], ['Blodtryck', 'hjarta']].map(([t, i]) => `<li><span class="ikonruta" data-ton="is">${ik(i)}</span><div><b>${t}</b><small>Visas efter läkarens granskning</small></div>${ik('las', 'kv-med-las')}</li>`).join('')}</ul>
          <div class="notis">${ik('info')}<span>Ett normalt värde bevisar inte att man är frisk och ett avvikande värde är ingen diagnos. Medicinsk data hålls skild från din hälsodata.</span></div></div>`;
    }
    return `${topp('Din kropp')}
      <section class="kv-scen in" style="--i:1" data-lage="${kroppLage}">
        <div class="kv-lage" role="group" aria-label="Visa" style="--n:${KV_LAGEN.indexOf(kroppLage)};--fran:${fran}"><span class="kv-lage-markor" aria-hidden="true"></span>${seg.map(([v, t, i]) => `<button type="button" data-g="kropp-lage" data-v="${v}" aria-pressed="${kroppLage === v}">${ik(i)}<span>${t}</span></button>`).join('')}</div>
        <div data-kropp-plats></div>
        ${kroppLage === 'med' ? `<div class="kropp-las">${ik('las')}<b>Skyddat</b><span>Bara du och medicinsk personal</span></div>` : ''}
        ${kroppLage !== 'med' ? `<span class="tryck-tips kv-tips"><i></i>${kroppLage === 'ont' ? 'Tryck där det känns' : 'Tryck på ett område'}</span>` : ''}
        <div class="kv-fot"><button class="kv-vrid" data-g="vrid" aria-label="Vrid kroppen">${ik('uppdatera')}<span data-vy-text>Bak</span></button><span class="kv-delare" aria-hidden="true"></span>
          <span class="kv-sammanfattning" data-ton="${sumTon}"><i></i>${e(sammanfattning)}</span></div>
      </section>
      ${innehall}
      <div class="sektion-rubrik kv-rubrik in" style="--i:8"><h3>Snart i appen</h3><span class="chip" data-ton="is">Kommer</span></div>
      <div class="kopplingar kv-snart in" style="--i:8">${[['puls', 'Rösten', '"Det hugger i vänster knä"'], ['rorlighet', 'Rörelseanalys', 'Kameran mäter rörligheten'], ['hjarta', 'Klockan', 'Återhämtning per dag']].map(([i, t, u]) => `<div class="koppling"><span class="ikonruta" data-ton="is">${ik(i)}</span><b>${t}</b><small>${e(u)}</small></div>`).join('')}</div>
      <div class="notis kv-notis in" style="--i:9">${ik('info')}<span>Kroppskartan är ingen diagnos. Vid ihållande eller ökande besvär hänvisar vi dig vidare till rätt specialist eller vården.</span></div>`;
  }
  function sidaArk(k) {
    const s = SNABBVAL.find((x) => x[0] === k); if (!s) return;
    if (!s[2]) return ontArk(k);
    ark(`<div class="ark-rubrik"><span class="ikonruta" data-ton="rod">${ik('plaster')}</span><div><span class="ogon utan">Ont · ${e(s[1].toLowerCase())}</span><h2>Vilken sida?</h2></div><button class="ikonknapp" data-stang-ark aria-label="Stäng">${ik('stang')}</button></div>
      <div class="kv-sidval">${s[2].map((id) => { const v = /-v$/.test(id), z = (st.profil.ont || []).find((x) => x.id === id);
        return `<button class="kv-sidknapp tryck" data-g="zon" data-id="${id}" data-sida="${v ? 'v' : 'h'}" ${z ? `data-ton="${nivaTon(z.niva)}"` : ''}><span class="kv-bokstav">${v ? 'V' : 'H'}</span>
          <b>${v ? 'Vänster' : 'Höger'} ${e(s[1].toLowerCase())}</b><small>${z ? `${z.niva}/10 · ${e(z.typ || 'Värk').toLowerCase()}` : 'Inte markerad'}</small></button>`; }).join('')}</div>
      <p class="liten kv-ark-not">Vänster och höger räknas från din egen kropp.</p>`);
  }
  function ovningsArk(id) {
    const g = OVNINGAR[ovningsGrupp(id)];
    ark(`<div class="ark-rubrik"><span class="ikonruta">${ik('rorlighet')}</span><div><span class="ogon utan">Förslag · rörlighet</span><h2>${e(regionNamn(id))}</h2></div><button class="ikonknapp" data-stang-ark aria-label="Stäng">${ik('stang')}</button></div>
      <p class="liten kv-ovn-intro">${g.length} lugna övningar. Bocka av när du gjort dem.</p>
      <ol class="ovningar kv-ovningar">${g.map(([t, u], n) => `<li style="--n:${n}"><span class="ov-nr">${n + 1}</span><div><b>${t}</b><small>${u}</small></div><button class="bock-ruta" data-g="ovning-klar" aria-pressed="false" aria-label="Klar">${ik('bock')}</button></li>`).join('')}</ol>
      <div class="notis" style="margin-top:14px">${ik('info')}<span>Lugna rörlighetsövningar – ingen behandling. Sluta om det gör ondare och kontakta vården om besvären håller i sig.</span></div>`);
  }
  function gruppArk(k) {
    const g = BASLINJE.find((x) => x.k === k); if (!g) return;
    kropp?.markera?.(g.reg.find((id) => g.ton[sidaAv(id)] !== 'ok') || g.reg[0]);
    // Som i Hälsa (iOS 26): ett kort per test, en rad per sida med stort värde, förändringsbricka och en riktig liten graf
    // (yta under linjen, baslinjen streckad och märkt, senaste punkten upplyst, datum under). Exempeldata.
    const tonFor = (v, b) => (v >= b * .97 ? 'ok' : v >= b * .88 ? 'gul' : 'rod');
    const tal = (x) => fmt(x, x % 1 ? 1 : 0), enhet = (u) => (u === '°' ? '°' : ` ${u}`);
    const datum = [dagar(-180), dagar(-90), dagar(-12)].map((d) => d.toLocaleDateString('sv-SE', { month: 'short' }).replace('.', ''));
    const FARG = { ok: '#3fd3a8', gul: '#f0b545', rod: '#ee7a62' };
    const graf = (v, b, ton, id) => { const all = v.concat([b]), mn = Math.min(...all), mx = Math.max(...all), sp = (mx - mn) || 1, w = 168, h = 64, px = 10, py = 10;
      const x = (i) => px + i * (w - px * 2) / (v.length - 1), y = (q) => h - py - (q - mn) / sp * (h - py * 2), f = FARG[ton];
      const pts = v.map((q, i) => `${x(i).toFixed(1)},${y(q).toFixed(1)}`).join(' ');
      return `<svg class="tg-graf" viewBox="0 0 ${w} ${h + 14}" aria-hidden="true"><defs><linearGradient id="tg-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f}" stop-opacity=".32"/><stop offset="1" stop-color="${f}" stop-opacity="0"/></linearGradient></defs>
        <line x1="${px}" x2="${w - px}" y1="${y(b).toFixed(1)}" y2="${y(b).toFixed(1)}" class="tg-bas"/>
        <polygon points="${x(0).toFixed(1)},${h} ${pts} ${x(v.length - 1).toFixed(1)},${h}" fill="url(#tg-${id})" class="tg-yta"/>
        <polyline points="${pts}" class="tg-linje" stroke="${f}" pathLength="1"/>
        ${v.map((q, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(q).toFixed(1)}" r="${i === v.length - 1 ? 4.5 : 2.6}" class="${i === v.length - 1 ? 'tg-nu' : 'tg-p'}" fill="${f}"/>`).join('')}
        ${v.map((q, i) => `<text x="${x(i).toFixed(1)}" y="${h + 12}" text-anchor="${i === 0 ? 'start' : i === v.length - 1 ? 'end' : 'middle'}" class="tg-dag">${datum[i] || ''}</text>`).join('')}</svg>`; };
    const gt = varstTon(g);
    ark(`<div class="ark-rubrik"><span class="ikonruta" ${gt === 'ok' ? '' : `data-ton="${gt}"`}>${ik('trend')}</span><div><span class="ogon utan">Fysik · mot din baslinje</span><h2>${g.namn}</h2></div><button class="ikonknapp" data-stang-ark aria-label="Stäng">${ik('stang')}</button></div>
      ${planHtml({ g })}
      <div class="tg-lista">${g.test.map(([t, enh, v, h, b], ti) => `<section class="tg-kort"><header class="tg-topp"><h3>${t}</h3><span class="tg-baslinje"><i></i>Baslinje ${tal(b)}${enhet(enh)}</span></header>
        ${[[h ? 'Vänster' : '', v], ['Höger', h]].filter(([, x]) => x).map(([sida, x], si) => { const sist = x[x.length - 1], ton = tonFor(sist, b), d = sist - b, pr = Math.round(d / b * 100);
          return `<div class="tg-rad" data-ton="${ton}"><div class="tg-tal">${sida ? `<span class="tg-sida">${sida}</span>` : ''}<b class="tal">${tal(sist)}<small>${enhet(enh)}</small></b>
            <span class="tg-diff" data-ton="${ton}">${Math.abs(d) < 1e-9 ? '±0' : `${d > 0 ? '▲' : '▼'} ${tal(Math.abs(d))}${enhet(enh)}`}<small>${pr ? ` · ${pr > 0 ? '+' : '−'}${Math.abs(pr)} %` : ''}</small></span>
            <span class="tg-status" data-ton="${ton}"><i></i>${{ ok: 'Inom baslinjen', gul: 'Strax under', rod: 'Under baslinjen' }[ton]}</span></div>
            ${graf(x, b, ton, `${ti}-${si}`)}</div>`; }).join('')}</section>`).join('')}</div>
      <p class="liten kv-ark-not">De tre senaste testerna. Den streckade linjen är din baslinje. Exempeldata.</p>
      <div class="notis">${ik('info')}<span>Under baslinjen betyder inte skada – det är en signal att följa upp. Testansvarig tittar på värdena och föreslår nästa steg.</span></div>`);
  }


  /* ---- 10b din plan: vad, varför och vad du ska göra – med råd från teamet ---- */
  // Råden är EXEMPEL i prototypen (märkta). Appen ställer ingen diagnos – den visar signalen, skälet i siffror och vad teamet rekommenderar.
  const PLAN = {
    axlar: { vad: 'Vänster axel roterar sämre utåt', varfor: (g) => `Utåtrotationen har gått från ${g.test[0][2][0]}° till ${g.test[0][2].at(-1)}° på tre tester – din baslinje är ${g.test[0][4]}°. Höger sida ligger stabilt. Vanligt vid ensidig belastning som kast, skott och press över huvudet.`,
      fran: ['Fysioterapeut', 'FT'], rad: 'Utåtrotation med band 3 × 12 varannan dag. Undvik tunga pressövningar över huvudet i två veckor och värm upp axeln före varje pass.',
      undvik: 'Tung press över huvudet', uppfolj: 6 },
    lar: { vad: 'Baksida vänster lår har tappat styrka', varfor: (g) => `Excentrisk styrka ${g.test[0][2].at(-1)} N mot baslinjen ${g.test[0][4]} N (−${Math.round((1 - g.test[0][2].at(-1) / g.test[0][4]) * 100)} %), och den sjunker. Höger lår ligger på baslinjen. Lägre excentrisk styrka i baksida lår kopplas till högre risk för bristning vid sprint.`,
      fran: ['Idrottsläkare', 'IL'], rad: 'Nordic hamstring 2 × 6 två gånger i veckan. Trappa upp sprintträningen gradvis och stoppa vid stramhet bak i låret.',
      undvik: 'Maxsprint utan uppvärmning', uppfolj: 4 },
    fotled: { vad: 'Höger fotled är stelare och svagare', varfor: (g) => `Knä mot vägg ${fmt(g.test[0][3].at(-1), 1)} cm mot baslinjen ${fmt(g.test[0][4], 1)} cm och enbenshopp ${g.test[1][3].at(-1)} cm mot ${g.test[1][4]} cm – båda sjunker på höger sida. Kan hänga ihop med en tidigare stukning som inte är färdigrehabiliterad.`,
      fran: ['Fysioterapeut', 'FT'], rad: 'Fotledsmobilisering varje dag och balans på ett ben 3 × 30 sekunder. Boka en uppföljning så tittar vi på fotleden tillsammans.',
      undvik: 'Hopp och snabba riktningsbyten på hård yta', uppfolj: 3 },
  };
  const VARD_FLAGGOR = ['Svullnad, rodnad eller värme', 'Domningar eller stickningar', 'Smärta som väcker dig på natten', 'Inte bättre efter två veckor'];
  // Skälen till ont räknas ur datan: baslinjen för området, belastningen och hur länge det gjort ont.
  function ontSkal(id, z) {
    const g = grupp(id), s = [], b = belastning(), ton = g ? g.ton[sidaAv(id)] : null;
    if (g && ton && ton !== 'ok') s.push(['trend', ton, `${g.namn}: ${TON_TEXT[ton].toLowerCase()} på din sida`, PLAN[g.k] ? PLAN[g.k].varfor(g) : 'Testvärdet ligger under din baslinje.']);
    if (b.kvot > 1.3) s.push(['puls', 'gul', `Belastningen har ökat snabbt (${fmt(b.kvot, 2)})`, 'Senaste veckans träning är mer än 30 % över ditt snitt. Snabba ökningar ger oftare ont.']);
    const nya = st.pass.filter((p) => (idag() - new Date(p.datum)) / 864e5 < 7 && ['Löpning', MATCH, 'Styrka', 'Klassiskt', 'Skate', 'Rullskidor', 'Intervaller'].includes(p.typ)).length;
    if (nya >= 3 && /kna|fot|vad|lar|hoft/.test(id)) s.push(['sko', 'is', `${nya} löp- eller styrkepass senaste veckan`, 'Benen har fått mycket att jobba med. Ont som kommer efter passen och släpper till nästa dag är ofta belastningsrelaterat.']);
    if (z && z.typ === 'Stelhet') s.push(['rorlighet', 'is', 'Stelhet snarare än smärta', 'Stelhet som släpper när du värmt upp handlar oftare om rörlighet än om skada.']);
    if (!s.length) s.push(['info', 'is', 'Ingen tydlig orsak i din data', 'Inga testvärden under baslinjen och normal belastning här. Följ hur det känns i smärtdagboken några dagar.']);
    return s;
  }
  function planHtml({ id, g, z = null }) {
    g = g || (id ? grupp(id) : null); const p = g ? PLAN[g.k] : null, gt = g ? varstTon(g) : 'ok';
    const skal = id ? ontSkal(id, z) : (p ? [['trend', gt, 'Varför?', p.varfor(g)]] : []);
    const ovn = OVNINGAR[ovningsGrupp(id || g?.reg[0] || 'nacke')] || [];
    const flagga = z && (z.niva >= 7 || ['Svullnad', 'Domning'].includes(z.typ) || z.sedan === 'Mer än 2 veckor');
    const sista = new Date(dagar((p?.uppfolj || 4) * 7)).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
    if (g && !id && !p) return `<section class="pl-kort pl-ok"><span class="ikonruta">${ik('bock')}</span><div><b>Inom din baslinje</b><small>Fortsätt som nu – nästa test visar om något förändras.</small></div></section>`;
    return `<section class="pl-kort" aria-label="Din plan">
      <header class="pl-topp"><span class="ogon utan">Din plan</span><span class="chip pl-exempel">Exempel</span></header>
      ${p ? `<h3 class="pl-vad">${e(p.vad)}</h3>` : z ? `<h3 class="pl-vad">${e(regionNamn(id))} · ${e(z.typ.toLowerCase())} ${z.niva}/10</h3>` : ''}
      <div class="pl-steg">
        <div class="pl-del" style="--n:0"><span class="pl-nr">1</span><div><b>Varför</b>${skal.map(([i, t, r, x]) => `<p class="pl-skal" data-ton="${t}">${ik(i)}<span><b>${e(r)}</b>${e(x)}</span></p>`).join('')}</div></div>
        ${p ? `<div class="pl-del" style="--n:1"><span class="pl-nr">2</span><div><b>Råd från ditt team</b>
          <blockquote class="pl-rad"><span class="profilbild pl-avatar">${e(p.fran[1])}</span><span><small>${e(p.fran[0])} · ditt team</small>${e(p.rad)}</span></blockquote></div></div>` : ''}
        <div class="pl-del" style="--n:2"><span class="pl-nr">${p ? 3 : 2}</span><div><b>Gör så här</b>
          <ul class="pl-gor">${ovn.map(([t, u], n) => `<li><button class="pl-bock" data-g="pl-bock" data-k="${e(t)}" aria-pressed="${!!(st.planKlar || {})[dagStr(idag()) + t]}" aria-label="${e(t)} klar idag">${ik('bock')}</button><span><b>${e(t)}</b><small>${e(u)}</small></span></li>`).join('')}</ul>
          ${p ? `<p class="pl-undvik">${ik('varning')}<span><b>Undvik just nu:</b> ${e(p.undvik)}</span></p>` : ''}</div></div>
        <div class="pl-del" style="--n:3"><span class="pl-nr">${p ? 4 : 3}</span><div><b>Följ upp</b><p class="pl-folj">${ik('kalender')}<span>${p ? `Nytt test om ${p.uppfolj} veckor · runt ${e(sista)}` : 'Fyll i smärtdagboken i tre dagar – coachen anpassar passen efter den'}</span></p></div></div>
      </div>
      <div class="pl-verktyg">
        <button class="knapp knapp-primar" data-g="pl-schema" data-k="${e(id || g.reg[0])}">${ik('kalender')}Lägg övningarna i schemat</button>
        <div class="pl-verktyg-rad"><button class="knapp knapp-sek" data-g="pl-fraga" data-vem="${e(p ? p.fran[0] : 'ditt team')}">${ik('team')}Fråga ${e(p ? p.fran[0].toLowerCase() : 'teamet')}</button>
          <button class="knapp knapp-sek" data-g="pl-dela" aria-pressed="${!!st.dela.team}">${ik('skold')}${st.dela.team ? 'Delas med teamet' : 'Dela med teamet'}</button></div>
      </div>
      <details class="pl-vard" ${flagga ? 'open' : ''}><summary>${ik('info')}När ska du söka vård?</summary><ul>${VARD_FLAGGOR.map((x) => `<li>${e(x)}</li>`).join('')}</ul>
        <p>Appen ställer ingen diagnos – vi är en remiss. Rådgivning dygnet runt: 1177. Vid akut fara: 112.</p></details>
      ${flagga ? `<p class="pl-flagga">${ik('varning')}<span>Det du beskriver (${e(z.niva >= 7 ? `${z.niva}/10` : z.typ === 'Svullnad' || z.typ === 'Domning' ? z.typ.toLowerCase() : 'mer än två veckor')}) bör en läkare titta på.</span></p>` : ''}
    </section>`;
  }

  /* ---- 11 Screening ---- */
  // Screening, version 2: testdagen med nedräkning och förberedelser, resan, förscreeningen, stationerna, normvärden, grundformen, medicinskt.
  const FORBERED = [['somn', 'Sov ordentligt natten innan', 'mane'], ['mat', 'Ät lätt 2 timmar innan', 'droppe'], ['klader', 'Ta med träningskläder och skor', 'sko'], ['vila', 'Ingen hård träning dagen innan', 'hjarta']];
  const FRAGOR = [['Hälsohistorik', 4, 4], ['Läkemedel och allergier', 2, 2], ['Träning och vardag', 3, 3], ['Smärta och skador', 0, 2], ['Sömn och stress', 0, 1]];
  function vyScreening() {
    const g = `${konText() === 'alla' ? 'alla' : konText()} ${alderGrupp()}`;
    const testdag = dagar(14), kvar = 14, klaraF = st.forbered || {};
    const fKlara = FORBERED.filter(([k]) => klaraF[k]).length;
    const fragorKlara = FRAGOR.reduce((s, x) => s + x[1], 0), fragorAlla = FRAGOR.reduce((s, x) => s + x[2], 0);
    const R = 40, L = 2 * Math.PI * R;
    const STN = [['A', 'Medicinska tester', ['EKG', 'Blod', 'Urin', 'Antropometri'], 'puls', 'is', '25 min'], ['B', 'Funktionstester', ['Rörlighet', 'Styrka', 'Balans'], 'rorlighet', 'ok', '40 min'], ['C', 'Fystester', ['Löpning', 'Kondition'], 'sko', 'gul', '30 min']];
    const RES = [['Rörlighet höft', 62, 'rorlighet'], ['Greppstyrka', 71, 'hantel'], ['Balans på ett ben', 48, 'balans'], ['Kondition (beräknad)', elit() ? 84 : 66, 'hjarta']];
    const TRAPPA = [['Rörlighet', 'grund för teknik', .72], ['Styrka', 'grund för säker träning', .78], ['Koordination', 'grund för funktionella rörelser', .6], ['Aerob bas', 'återhämtning och spelintelligens', .7],
      ['Uthållighet', 'mjölksyratålighet', .55], ['Snabbhet', 'kräver rörlighet, styrka, koordination', .5], ['Agility / plyometri', 'kräver allt ovan + snabbhet', .42]];
    const steg = elit() ? TRAPPA : TRAPPA.slice(0, 4);
    const RESA = [['Förscreening', 'Klar', 'klar', 'dokument'], ['Testdag', 'Om 14 dagar', 'nu', 'kalender'], ['Rapport', 'Granskas', '', 'screen'], ['Uppföljning', 'Coaching', '', 'trend']];
    const datum = testdag.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (x) => x.toUpperCase());
    return `${topp('Screening')}
      <section class="sc-hjalte in" style="--i:1"><span class="sc-sken" aria-hidden="true"></span>
        <div class="sc-rad"><div class="ring sc-ring"><svg viewBox="0 0 96 96"><circle class="spar" cx="48" cy="48" r="${R}" stroke-width="8"/><circle class="bage" cx="48" cy="48" r="${R}" stroke-width="8" style="stroke-dasharray:${L};stroke-dashoffset:${L * (kvar / 30)}"/></svg>
            <div class="varde"><b class="tal" data-rakna="${kvar}">0</b><small>dagar</small></div></div>
          <div class="sc-text"><span class="ogon">Din testdag</span><h2>${e(datum)}</h2></div></div><div class="sc-meta"><span>${ik('klocka')}08:30</span><span>${ik('timglas')}ca 2 h</span><span>${ik('plats')}Plats meddelas</span></div>
        <div class="sc-knappar"><button class="knapp knapp-primar" data-g="kalender-fil">${ik('kalender')}Lägg i kalendern</button><button class="knapp knapp-sek" data-g="boka-om">Boka om</button></div>
        <div class="sc-forbered"><div class="rad" style="justify-content:space-between"><b>Förbered dig</b><span class="liten tal">${fKlara}/${FORBERED.length}</span></div>
          <div class="matare" style="margin:8px 0 4px"><i style="--v:${fKlara / FORBERED.length * 100}%"></i></div>
          ${FORBERED.map(([k, t, i]) => `<button class="bock-rad" data-g="forbered" data-k="${k}" aria-pressed="${!!klaraF[k]}"><span class="bock-ruta">${ik('bock')}</span>${ik(i)}<span>${t}</span></button>`).join('')}</div>
      </section>

      <div class="sektion-rubrik in" style="--i:2"><h3>Din resa</h3><span class="liten">Steg 2 av 4</span></div>
      <div class="sc-resa in" style="--i:2"><span class="sc-resa-linje" aria-hidden="true"><i></i></span>${RESA.map(([t, u, l, i]) => `<div class="sc-steg" data-lage="${l}"><span class="sc-steg-prick">${ik(l === 'klar' ? 'bock' : i)}</span><b>${t}</b><small>${u}</small></div>`).join('')}</div>

      <button class="kort sc-formular tryck in" style="--i:3" data-g="formular"><div class="ring" data-ring="${Math.round(fragorKlara / fragorAlla * 100)}" style="width:62px;height:62px"><svg viewBox="0 0 120 120"><circle class="spar" cx="60" cy="60" r="50" stroke-width="12"/><circle class="bage" cx="60" cy="60" r="50" stroke-width="12"/></svg><div class="varde"><b class="tal" style="font-size:1rem">${fragorKlara}/${fragorAlla}</b></div></div>
        <div><span class="ogon utan">Förscreening</span><b>Hälsoformuläret</b><small>${fragorAlla - fragorKlara} frågor kvar · ca 3 min · sparas automatiskt</small></div>${ik('hoger')}</button>

      <div class="sektion-rubrik in" style="--i:4"><div><h3>Testdagens stationer</h3><span class="liten">Tre stationer i tur och ordning</span></div><span class="liten tal">Ca 95 min</span></div>
      <div class="kort sc-schema in" style="--i:4">${(() => { const tot = STN.reduce((x, y) => x + parseInt(y[5], 10), 0); let t0 = 8 * 60 + 30; const kl = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        return `<div class="sc-tidslinje" aria-hidden="true">${STN.map(([b, , , , ton, tid]) => `<i data-ton="${ton}" style="--w:${parseInt(tid, 10) / tot}"><b>${b}</b></i>`).join('')}</div>
        <ol class="sc-stationer">${STN.map(([b, t, delar, i, ton, tid]) => { const fran = t0; t0 += parseInt(tid, 10);
          return `<li class="sc-station" data-ton="${ton}"><span class="sc-tid tal">${kl(fran)}</span><span class="sc-bokstav">${b}</span>
          <div class="sc-station-text"><div class="sc-station-topp"><h4>${t}</h4><span class="sc-langd tal">${tid}</span></div><div class="sc-delar">${delar.map((d) => `<span>${d}</span>`).join('')}</div>${b === 'A' ? `<small class="sc-las">${ik('las')}Svaren ser bara medicinsk personal</small>` : ''}</div></li>`; }).join('')}
          <li class="sc-station sc-slut"><span class="sc-tid tal">${kl(t0)}</span><span class="sc-bokstav">${ik('bock')}</span><div class="sc-station-text"><h4>Klart för dagen</h4><small>Rapporten granskas innan du får den</small></div></li></ol>`; })()}</div>

      <div class="sektion-rubrik in" style="--i:5"><div><h3>Jämfört med normvärden</h3><span class="liten">${e(g)} · förra testet</span></div><span class="exempel">Exempel</span></div>
      <div class="kort sc-norm in" style="--i:5"><div class="sc-norm-legend" aria-hidden="true"><span><i class="lg-band"></i>Normalt intervall</span><span><i class="lg-prick"></i>Ditt värde</span></div>${(() => { const o = RES.slice().sort((x, y) => y[1] - x[1]); return insiktHtml(`Starkast: ${o[0][0].toLowerCase()} (${o[0][1]} %) · lägst: ${o[o.length - 1][0].toLowerCase()} (${o[o.length - 1][1]} %)`, 'trend', 'sc-insikt'); })()}${RES.map(([t, v, i]) => `<div class="norm-rad"><span class="ikonruta" style="width:34px;height:34px;border-radius:11px">${ik(i)}</span><div class="norm-mitt"><div class="rad" style="justify-content:space-between"><b>${t}</b><span class="norm-tal tal" data-ton="${v >= 60 ? 'ok' : v >= 40 ? 'is' : 'gul'}">${v}</span></div>
        <div class="norm-skala"><span class="norm-band" aria-hidden="true"></span><i style="--v:${v}%"></i></div><small>Bättre än ${v} % av ${e(g)}</small></div></div>`).join('')}</div>

      <div class="sektion-rubrik in" style="--i:6"><div><h3>${elit() ? 'Atletiska förmågor' : 'Din grundform'}</h3><span class="liten">Bygg nerifrån – grunden först</span></div></div>
      <div class="kort sc-trappa-kort in" style="--i:6"><div class="trappa">${steg.slice().reverse().map(([t, u, s], k, a) => `<div class="trappsteg" style="--n:${a.length - 1 - k};--s:${s}"><em class="tal">${a.length - k}</em><div class="trapp-text"><b>${t}</b><small>${u}</small><span class="trapp-matare" aria-hidden="true"><i></i></span></div><strong class="tal">${Math.round(s * 100)}</strong></div>`).join('')}</div></div>

      <div class="sektion-rubrik in" style="--i:7"><h3>Medicinska värden</h3><span class="chip">${ik('las')}Skyddat</span></div>
      <div class="kort sc-med in" style="--i:7"><div class="sc-med-sudd" aria-hidden="true">${['EKG', 'Spirometri', 'Blodprov', 'Blodtryck'].map((t) => `<div><b>${t}</b><span></span></div>`).join('')}</div>
        <div class="sc-med-las">${ik('las')}<b>Visas efter läkarens granskning</b><small>Ett normalt värde bevisar inte att man är frisk och ett avvikande värde är ingen diagnos.</small></div></div>

      <div class="kort in" style="--i:8;margin-top:12px"><div class="kort-rubrik"><h3>Ditt paket</h3><span class="liten">${elit() ? 'Med uppföljning online' : 'Hälsokartläggning'}</span></div>
        <div class="pk-rad" role="group" aria-label="Paket">${[['bas', 'Bas', 'Riskprofil', 0], ['plus', 'Bas+', 'Fördjupad', 1], ['plusplus', 'Bas++', 'Mest komplett', 2]].map(([k, t, u, n]) => `<button type="button" class="pk" data-g="paket" data-v="${k}" data-steg="${n}" aria-pressed="${(st.paket || (elit() ? 'plusplus' : 'bas')) === k}">
          ${n ? '<span class="pk-ram" aria-hidden="true"><i></i></span>' : ''}<span class="pk-sken" aria-hidden="true"></span>${n === 2 ? '<em class="pk-premium">Premium</em>' : ''}
          <b class="pk-namn">${t.replace(/(\+\+?)$/, '<span class="pk-plus">$1</span>')}</b><small>${u}</small><span class="pk-bock" aria-hidden="true">${ik('bock')}</span></button>`).join('')}</div>
        <div class="notis" style="margin-top:12px">${ik('info')}<span>Rapporten skapas automatiskt av dina svar och testvärden, kontrolleras av specialist och är ingen diagnos – vi hänvisar vidare när något behöver följas upp.</span></div></div>
      <p class="exempel in" style="--i:9;margin-top:16px">Exempeldata i prototypen</p>`;
  }
  function formularArk() {
    ark(`<div class="ark-handtag"></div><div class="ark-rubrik"><span class="ikonruta" data-ton="is">${ik('dokument')}</span><div><span class="ogon utan">Förscreening</span><h2>Hälsoformuläret</h2></div><button class="ikonknapp" data-stang-ark aria-label="Stäng">${ik('stang')}</button></div>
      ${(() => { const klara = FRAGOR.reduce((s, x) => s + x[1], 0), alla = FRAGOR.reduce((s, x) => s + x[2], 0), nasta = FRAGOR.findIndex(([, k, a]) => k < a);
        return `<div class="fm-summa"><div class="ring" data-ring="${Math.round(klara / alla * 100)}" style="width:64px;height:64px"><svg viewBox="0 0 120 120"><circle class="spar" cx="60" cy="60" r="50" stroke-width="12"/><circle class="bage" cx="60" cy="60" r="50" stroke-width="12"/></svg><div class="varde"><b class="tal">${Math.round(klara / alla * 100)}<small>%</small></b></div></div>
          <div><b>${klara} av ${alla} frågor besvarade</b><small>${FRAGOR.filter(([, k, a]) => k === a).length} av ${FRAGOR.length} delar klara · ca 3 min kvar</small></div></div>
        <ol class="fm-lista">${FRAGOR.map(([t, k, a], n) => `<li class="formular-rad" ${n === nasta ? 'data-nasta' : ''} style="--n:${n}"><span class="status" data-ton="${k === a ? 'ok' : n === nasta ? 'nu' : 'tom'}">${k === a ? ik('bock') : `<b class="tal">${n + 1}</b>`}</span><div><b>${t}</b><small>${k === a ? 'Klar' : n === nasta ? `Nästa · ${a - k} ${a - k === 1 ? 'fråga' : 'frågor'}` : `${a} ${a === 1 ? 'fråga' : 'frågor'}`}</small></div><div class="matare"><i style="--v:${k / a * 100}%"></i></div></li>`).join('')}</ol>
        <div class="notis">${ik('las')}<span>Svaren om hälsa och läkemedel går bara till medicinsk personal. De blir underlag till rapporten – ingen diagnos.</span></div>`; })()}
      <div class="ark-knappar"><button class="knapp knapp-primar knapp-bred" data-g="formular-fortsatt">Fortsätt där du var ${ik('pil')}</button></div>
      <p class="liten" style="margin-top:10px;text-align:center">Prototyp – frågorna fylls i i nästa version.</p>`);
  }

  /* ---- 12 Jag ---- */
  // Jag: hjälte med hälsopoäng, utmärkelser, mål med framsteg, upplägget som två skärmar, dataflödet, kopplingar och inställningar.
  function halsopoang() { const s = st.checkin.slice(-7); return s.length ? Math.round(s.reduce((a, c) => a + dagsform(c), 0) / s.length) : 0; }
  function veckoMin() { return Array.from({ length: 7 }, (_, i) => st.pass.filter((x) => x.datum === dagStr(dagar(i - 6))).reduce((s, x) => s + x.min, 0)).reduce((a, b) => a + b, 0); }
  function utmarkelser() {
    const veckoPass = Array.from({ length: 7 }, (_, i) => st.pass.filter((x) => x.datum === dagStr(dagar(i - 6))).length).reduce((a, b) => a + b, 0);
    return [
      // [nyckel, rubrik, underrad, ikon, klar, andel 0–1 (bågen runt medaljen)]
      ['profil', 'Profilen klar', 'Fem frågor besvarade', 'gnista', true, 1],
      ['checkin', 'Första check-in', 'Dagsformen är igång', 'puls', st.checkin.length > 0, st.checkin.length > 0 ? 1 : 0],
      ['svit', '7 dagar i rad', `${Math.min(svit(), 7)} av 7 dagar`, 'stjarna', svit() >= 7, Math.min(svit(), 7) / 7],
      ['vecka', elit() ? '5 pass i veckan' : '150 minuter', elit() ? `${Math.min(veckoPass, 5)} av 5 pass` : `${Math.min(veckoMin(), 150)} av 150 min`, elit() ? 'boll' : 'sko', elit() ? veckoPass >= 5 : veckoMin() >= 150,
        elit() ? Math.min(veckoPass, 5) / 5 : Math.min(veckoMin(), 150) / 150],
      ['kropp', 'Kroppskartan', (st.profil.ont || []).length ? 'Besvär följs upp' : 'Markera om något känns', 'kropp', true, 1],
      ['testdag', 'Testdagen', 'Efter testet', 'kalender', false, 0],
    ];
  }
  function malFramsteg(v) {
    const sju = st.checkin.slice(-7);
    switch (v) {
      case 'ma': { const n = sju.filter((c) => dagsform(c) >= 70).length; return ['Dagsform över 70', n, 7, 'dagar']; }
      case 'skador': { const n = Math.min(3, st.pass.filter((x) => (idag() - new Date(x.datum)) / 864e5 < 7 && /Styrka|Återhämtning|Promenad/.test(x.typ)).length); return ['Rörlighet och styrka', n, 3, 'pass i veckan']; }
      case 'prestera': { const b = belastning(); return elit() ? ['Belastning i optimal zon', b.kvot >= .8 && b.kvot <= 1.3 ? 1 : 0, 1, 'just nu'] : ['Konditionstest på testdagen', 0, 1, 'om 14 dagar']; }
      case 'tillbaka': { const z = (st.profil.ont || [])[0]; return ['Smärtan minskar', z ? Math.max(0, 10 - z.niva) : 10, 10, z ? `${z.niva}/10 nu` : 'inga besvär']; }
      case 'orka': { const n = sju.filter((c) => c.somn >= 7).length; return ['Sömn 7/10 eller mer', n, 7, 'nätter']; }
      default: return ['', 0, 1, ''];
    }
  }
  function vyJag() {
    const p = st.profil, hp = halsopoang(), ut = utmarkelser(), klara = ut.filter((u) => u[4]).length;
    const medlem = new Date(p.skapad || dagStr(idag())).toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
    const mal = MAL.filter(([v]) => p.mal.includes(v)), bok = e(p.namn[0].toUpperCase());
    // en rubrik per avsnitt: nummer (syns i elitläget), rubrik, något till höger
    const rub = (nr, t, hoger = '', i = nr + 1) => `<div class="jg-rubrik in" style="--i:${i}"><span class="jg-nr tal" aria-hidden="true">${String(nr).padStart(2, '0')}</span><h3>${t}</h3>${hoger}</div>`;
    const ring = (pr, inne, k = '') => `<div class="ring ${k}" data-ring="${pr}"><svg viewBox="0 0 120 120"><circle class="spar" cx="60" cy="60" r="50" stroke-width="12"/><circle class="bage" cx="60" cy="60" r="50" stroke-width="12"/></svg><div class="varde">${inne}</div></div>`;
    const forra = st.checkin.slice(-14, -7), diff = forra.length ? hp - Math.round(forra.reduce((x, c) => x + dagsform(c), 0) / forra.length) : null;
    const vecka = Array.from({ length: 7 }, (_, i) => { const d = dagar(i - 6), c = st.checkin.find((x) => x.datum === dagStr(d)); return { v: c ? dagsform(c) : 0, dag: VECKODAG[d.getDay()].slice(0, 2), idag: i === 6 }; });
    const streck = Array.from({ length: 48 }, (_, i) => `<line x1="60" y1="1.5" x2="60" y2="${i % 4 ? 5.5 : 8}" transform="rotate(${i * 7.5} 60 60)" ${i / 48 < hp / 100 ? `class="pa" style="--n:${i}"` : ''}/>`).join('');
    const lage = hp >= 75 ? 'Stark vecka' : hp >= 60 ? 'Stabil vecka' : 'Tid för återhämtning';
    const pass = e((PASS.find((x) => x[0] === p.pass)?.[1] || '–').replace(' pass', '').replace(' eller fler', '+'));
    const inst = [['coach', 'gnista', 'Coach', `<span class="jg-inst-varde"><span class="chip jg-tid">${e(TONER.find(([k]) => k === coach().ton)[1])}</span>${ik('hoger')}</span>`, 'is'], ['schema', 'kalender', 'Träningsschema', `<span class="jg-inst-varde"><span class="chip jg-tid tal">${schema().filter(Boolean).length} pass/v</span>${ik('hoger')}</span>`, 'ok'],
      ['notiser', 'info', 'Notiser', `<span class="vaxel" role="switch" aria-checked="${st.notiser !== false}" aria-hidden="true"></span>`, ''],
      ['export', 'dokument', 'Exportera mina data', ik('hoger'), 'gul'], ['integritet', 'skold', 'Integritet och samtycke', ik('hoger'), '']];
    return `${topp('Jag')}
      <section class="jg-hjalte in" style="--i:1">
        <div class="jg-hjalte-sken" aria-hidden="true"></div>
        <div class="jg-id">
          <div class="jg-avatar"><span class="jg-avatar-ring" aria-hidden="true"></span><span class="jg-avatar-bild">${bok}</span><span class="jg-avatar-niva">${ik(elit() ? 'blixt' : 'sol')}</span></div>
          <h2>${e(visNamn())}</h2>
          <p class="jg-meta"><span>Medlem sedan ${e(medlem)}</span><i aria-hidden="true"></i><span>${elit() ? 'Elit' : 'Motionär'}</span></p>
        </div>
        <div class="jg-poang">
          <div class="jg-matare">${ring(hp, `<b class="tal" data-rakna="${hp}">0</b><small>poäng</small>`, 'jg-poang-ring')}<svg class="jg-streck" viewBox="0 0 120 120" aria-hidden="true">${streck}</svg></div>
          <div class="jg-poang-text">
            <span class="jg-etikett">Hälsopoäng · 7 dagar</span>
            <b>${lage}</b>
            ${diff === null ? '<span class="jg-trend" data-ton="is">Första veckan</span>' : `<span class="jg-trend" data-ton="${diff >= 0 ? 'ok' : 'gul'}">${ik('trend')}${diff >= 0 ? '+' : '−'}${Math.abs(diff)} mot förra veckan</span>`}
            <div class="jg-vecka" aria-label="Dagsform de senaste sju dagarna">${vecka.map((d, n) => `<span ${d.idag ? 'data-idag' : ''} ${d.v ? '' : 'data-tom'} title="${d.v ? `Dagsform ${d.v}` : 'Ingen check-in'}"><i style="--h:${d.v || 100}%;--n:${n}"></i><small>${d.dag}</small></span>`).join('')}</div>
          </div>
        </div>
        <dl class="jg-fakta">
          <div><dt>Ålder</dt><dd class="tal" data-rakna="${alder()}">0</dd></div>
          <div><dt>Kön</dt><dd>${{ kvinna: 'Kvinna', man: 'Man', annat: '–' }[p.kon] || '–'}</dd></div>
          <div><dt>Pass/v</dt><dd class="tal">${pass}</dd></div>
          <div><dt>I rad</dt><dd class="tal"><span data-rakna="${svit()}">0</span><small> d</small></dd></div>
        </dl>
      </section>

      ${rub(1, 'Utmärkelser', `<span class="jg-rakna tal"><b>${klara}</b>/${ut.length}</span>`)}
      <div class="jg-medaljer in" style="--i:2">${ut.map(([k, t, u, i, ok, a], n) => `<button class="jg-medalj" data-g="medalj" data-k="${k}" ${ok ? 'data-klar' : ''} style="--n:${n}" aria-label="${e(t)}: ${ok ? 'klar' : e(u)}">
        <span class="jg-skiva"><svg class="jg-skiva-bage" viewBox="0 0 64 64" aria-hidden="true"><circle class="spar" cx="32" cy="32" r="29"/><circle class="pa" cx="32" cy="32" r="29" pathLength="100" style="--a:${Math.round(a * 100)}"/></svg>
          <span class="jg-skiva-karna">${ik(ok ? i : a > 0 ? i : 'las')}</span></span><b>${e(t)}</b><small>${e(u)}</small></button>`).join('')}</div>

      ${rub(2, 'Dina mål', `<button class="jg-lank" data-g="mal-ark">Ändra ${ik('hoger')}</button>`)}
      <div class="jg-mal-lista in" style="--i:3">${mal.length ? mal.map(([v, t, i]) => { const [vad, n, av, enh] = malFramsteg(v), pr = Math.round(n / av * 100);
        return `<div class="kort jg-mal" ${pr >= 100 ? 'data-klar' : ''}>${ring(pr, ik(i), 'jg-mal-ring')}
          <div class="jg-mal-text"><b>${t}</b><small>${e(vad)}</small></div><div class="jg-mal-tal"><b class="tal">${n}<small>/${av}</small></b><small>${e(enh)}</small></div></div>`; }).join('')
        : `<button class="kort jg-mal jg-mal-tom" data-g="mal-ark"><span class="ikonruta">${ik('mal')}</span><div class="jg-mal-text"><b>Välj ett mål</b><small>Appen lägger upp veckan efter det</small></div>${ik('hoger')}</button>`}</div>

      ${rub(3, 'Upplägg', '<span class="jg-dampad">Byter design direkt</span>')}
      <div class="jg-upplagg in" style="--i:4">${[['motionar', 'Motionär', 'Ljust och lugnt'], ['elit', 'Elit', 'Mörkt och datatätt']].map(([v, t, u]) => `<button class="jg-lage" data-g="byt-niva" data-v="${v}" aria-pressed="${niva() === v}" data-tilt>
        <span class="jg-mini jg-mini-${v}" aria-hidden="true"><i class="m-topp"></i><i class="m-ring"></i><i class="m-rad"></i><i class="m-rad m-kort"></i><i class="m-ruta"></i><i class="m-ruta"></i><i class="m-flik"></i></span>
        <span class="jg-lage-text"><b>${t}</b><small>${u}</small></span><span class="jg-lage-bock">${ik('bock')}</span></button>`).join('')}</div>

      ${rub(4, 'Vem ser din data?')}
      <div class="kort jg-flode in" style="--i:5">
        <div class="jg-nod"><span class="jg-nod-ikon profilbild">${bok}</span><div><b>Du</b><small>Ser allt</small></div><span class="chip" data-ton="ok">Ägare</span></div>
        <div class="jg-linje" aria-hidden="true" ${st.dela.team ? '' : 'data-av'}><i></i></div>
        <div class="jg-nod"><span class="jg-nod-ikon ikonruta">${ik('team')}</span><div><b>${elit() ? 'Tränare' : 'Ditt team'}</b><small>Hälsodata${st.dela.team ? '' : ' · delas inte'}</small></div><button class="vaxel" role="switch" aria-checked="${st.dela.team}" data-g="dela" data-v="team" aria-label="Dela hälsodata med ${elit() ? 'tränaren' : 'ditt team'}"></button></div>
        <div class="jg-linje" aria-hidden="true" data-las><i></i></div>
        <div class="jg-nod"><span class="jg-nod-ikon ikonruta" data-ton="is">${ik('las')}</span><div><b>Medicinsk personal</b><small>Medicinsk data</small></div><span class="chip" data-ton="is">${ik('las')}Skyddat</span></div>
        <p class="jg-flode-fot">${ik('skold')}Hälsodata och medicinsk data hålls isär.</p>
      </div>

      ${rub(5, 'Kopplingar', '<span class="chip" data-ton="is">Kommer</span>')}
      <div class="jg-kopplingar in" style="--i:6">${[['puls', 'Klocka', 'Puls, sömn och steg'], ['matt', 'Våg', 'Vikt och sammansättning'], ['hjarta', 'Pulsband', 'Belastning på passet']].map(([i, t, u], n) => `<div class="jg-koppling" style="--n:${n}"><span class="ikonruta" data-ton="is">${ik(i)}</span><b>${t}</b><small>${u}</small></div>`).join('')}</div>

      ${rub(6, 'Ditt team')}
      <div class="kort jg-team in" style="--i:7">${LANDS ? '<span class="profilbild">MT</span><div><b>Medicinska teamet</b><small>Landslagets stab · exempel</small></div>' : '<span class="profilbild">DR</span><div><b>Dale Reese</b><small>Testansvarig · Uperformance</small></div>'}<span class="chip" data-ton="ok"><i class="online"></i>Ditt team</span></div>

      ${rub(7, 'Inställningar')}
      <div class="jg-inst in" style="--i:8">${inst.map(([k, i, t, h, ton]) => `<button class="jg-inst-rad" data-g="${k === 'notiser' ? 'notiser' : k === 'coach' ? 'coach-ark' : k === 'schema' ? 'ts-schema' : 'jag-inst'}" data-k="${k}" ${k === 'notiser' ? `role="switch" aria-checked="${st.notiser !== false}"` : ''}><span class="ikonruta" data-ton="${ton}">${ik(i)}</span><b>${t}</b>${h}</button>`).join('')}</div>
      <div class="jg-fot in" style="--i:9">
        <button class="knapp knapp-text" data-g="borja-om">${ik('uppdatera')}Börja om introt</button>
        <p class="exempel">Prototyp · exempeldata</p>
      </div>`;
  }
  function malArk() {
    // samma uppbyggnad i alla Jag-ark: ikon · ögonrad + rubrik · stäng, sedan fälten, sist en bred huvudknapp
    ark(`<div class="ark-rubrik jg-ark-rubrik"><span class="ikonruta">${ik('mal')}</span><div><span class="ogon utan">Mål</span><h2>Vad vill du uppnå?</h2></div><button class="ikonknapp" data-stang-ark aria-label="Stäng">${ik('stang')}</button></div>
      <p class="jg-ark-ingress">Välj ett eller flera. Veckans förslag och framstegen i Jag följer målen.</p>
      <div class="val-lista jg-mal-val">${MAL.map(([v, t, i], n) => { const [vad] = malFramsteg(v); return `<button type="button" class="val" style="--n:${n}" data-g="jag-mal" data-v="${v}" aria-pressed="${st.profil.mal.includes(v)}"><span class="ikonruta">${ik(i)}</span><span><b>${t}</b><small>${e(vad)}</small></span><span class="bock">${ik('bock')}</span></button>`; }).join('')}</div>
      <div class="ark-knappar"><button class="knapp knapp-primar knapp-bred" data-g="mal-klar">Klart ${ik('bock')}</button></div>`);
  }

  /* ---- 12b träningsschemat, coachen och påminnelserna ---- */
  // Schemat är en vecka: ett pass eller vila per veckodag (0 = söndag). Incheckning = ett pass i st.pass med plan: true.
  // Coachen har tre tonlägen (mjuk · mitt emellan · hård) och enkla, förklarade regler – den pushar aldrig när kroppen säger stopp.
  const VECKA_ORDNING = [1, 2, 3, 4, 5, 6, 0];
  const DAGNAMN = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
  const TYP_IKON = { Klassiskt: 'skidor', Skate: 'skidor', Rullskidor: 'skidor', Intervaller: 'puls', Tävling: 'stjarna', Lagträning: 'boll', Match: 'boll', Styrka: 'hantel', Löpning: 'sko', Återhämtning: 'hjarta', Promenad: 'sko', Cykel: 'puls', Simning: 'droppe', Rörlighet: 'rorlighet', Annat: 'gnista' };
  const typIkon = (t) => TYP_IKON[t] || 'gnista';
  const TONER = [['mjuk', 'Mjuk', 'Peppande och förstående'], ['mitt', 'Mitt emellan', 'Rak och vänlig'], ['hard', 'Hård', 'Kräver mer av dig']];
  const TIDER = ['07:00', '12:00', '17:30', '19:00'];
  const FORE = [[60, '1 h före'], [30, '30 min före'], [0, 'När passet börjar']];
  function standardSchema(p) {
    const s = Array(7).fill(null), satt = (d, typ, min, tid) => { s[d] = { typ, min, tid }; };
    if (LANDS && p.niva === 'elit') { satt(2, 'Intervaller', 90, '09:00'); satt(3, 'Klassiskt', 120, '09:00'); satt(4, 'Styrka', 60, '16:00'); satt(5, 'Skate', 90, '09:00'); satt(6, 'Klassiskt', 150, '09:00'); satt(0, 'Rullskidor', 90, '10:00'); return s; }
    if (LANDS) { satt(2, 'Klassiskt', 60, '17:30'); satt(4, 'Styrka', 40, '17:30'); satt(6, 'Skate', 90, '10:00'); return s; }
    if (p.niva === 'elit') { satt(2, 'Lagträning', 90, '17:30'); satt(3, 'Styrka', 60, '17:00'); satt(4, 'Lagträning', 90, '17:30'); satt(5, 'Löpning', 40, '17:00'); satt(6, 'Match', 95, '15:00'); satt(0, 'Återhämtning', 35, '10:00'); return s; }
    const n = { salan: 2, '1-2': 3, '3-4': 4, '5+': 5 }[p.pass] || 3;
    const plan = [[1, 'Promenad', 30, '17:30'], [3, 'Styrka', 40, '17:30'], [6, 'Löpning', 30, '10:00'], [5, 'Cykel', 45, '17:30'], [2, 'Rörlighet', 20, '07:00']];
    if (n === 2) { satt(3, 'Promenad', 30, '17:30'); satt(6, 'Promenad', 40, '10:00'); return s; }
    plan.slice(0, n).forEach(([d, t, m, tid]) => satt(d, t, m, tid)); return s;
  }
  function schema() { if (!st.schema && st.profil) { st.schema = standardSchema(st.profil); spara(); } return st.schema || Array(7).fill(null); }
  function coach() { st.coach = st.coach || { ton: 'mitt', pamin: true, fore: 30 }; return st.coach; }
  const planFor = (d) => schema()[d.getDay()];
  const passPa = (ds) => st.pass.filter((x) => x.datum === ds);
  const hoppad = (ds) => (st.hoppat || []).includes(ds);
  function veckaStart() { const d = idag(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
  function veckoNr(d0) { const d = new Date(Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate())); const dag = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dag);
    return Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); }
  // Läget per dag i veckan: klar · hoppad · missad · idag · kommande · vila
  function veckoLage() {
    const start = veckaStart(), ids = dagStr(idag());
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); const ds = dagStr(d), plan = planFor(d), gjort = passPa(ds);
      const lage = gjort.length ? 'klar' : !plan ? 'vila' : hoppad(ds) ? 'hoppad' : ds < ids ? 'missad' : ds === ids ? 'idag' : 'kommande';
      return { d, ds, plan, gjort, lage, idag: ds === ids }; });
  }
  // Planerade pass i rad som är gjorda (vilodagar räknas inte, idag räknas bara om det är gjort).
  function traningsSvit() { let n = 0; for (let i = 0; i < 60; i++) { const d = dagar(-i), ds = dagStr(d), plan = planFor(d);
    if (passPa(ds).length) { n++; continue; } if (!plan || i === 0 || hoppad(ds)) continue; break; } return n; }
  const minuterAv = (t) => Number(String(t || '0:0').split(':')[0]) * 60 + Number(String(t || '0:0').split(':')[1]);
  const typLiten = (t) => (t === MATCH ? MATCH.toLowerCase() : t.toLowerCase());
  // Coachens meddelande: regler i ordning, sedan rätt tonläge. Säkerheten först – även Hård säger vila när kroppen säger stopp.
  function coachMeddelande() {
    const c = coach(), t = TONER.findIndex(([k]) => k === c.ton), v = (a) => a[t < 0 ? 1 : t];
    const nu0 = idag(), ds = dagStr(nu0), plan = planFor(nu0), gjort = passPa(ds).length > 0, vl = veckoLage();
    const klara = vl.filter((x) => x.lage === 'klar' && x.plan).length, planerade = vl.filter((x) => x.plan).length;
    const ig = dagar(-1), igPlan = planFor(ig), missIg = igPlan && !passPa(dagStr(ig)).length && !hoppad(dagStr(ig));
    const ont = (st.profil.ont || []).reduce((m, z) => Math.max(m, z.niva), 0), skada = st.skador.some((s) => !s.slut);
    const ci = st.checkin.find((x) => x.datum === ds), df = ci ? dagsform(ci) : null, kvot = belastning().kvot;
    const risk = ont >= 6 || skada || (df !== null && df < 45) || (elit() && kvot > 1.5);
    const varfor = ont >= 6 ? `du har markerat ont ${ont}/10` : skada ? 'du har en pågående skada' : df !== null && df < 45 ? `dagsformen är ${df}` : `belastningen är hög (${fmt(kvot, 2)})`;
    const namn = visNamn(), sv = traningsSvit();
    let nasta = null; for (let i = 1; i < 8; i++) { const d = dagar(i), p = planFor(d); if (p) { nasta = { ...p, dag: i === 1 ? 'imorgon' : DAGNAMN[d.getDay()].toLowerCase() }; break; } }
    const nastaText = nasta ? `${typLiten(nasta.typ)} ${nasta.dag}` : 'nästa pass';
    const m = (ikon, ton, rub, text, regel) => ({ ikon, ton, rub, text, regel });
    if (gjort) return m('bock', 'ok', v([`Fint jobbat, ${namn}!`, 'Passet är avklarat', 'Ett till i boken']),
      v(['Passet är gjort. Unna dig vila och något gott att äta – det har du förtjänat.', `${klara} av ${planerade} pass den här veckan. Bra rytm – fortsätt så.`, `${klara} av ${planerade}. Ta resten också – inga genvägar.`]), 'Du har checkat in dagens pass.');
    if (!plan) return m('mane', 'is', v(['Vilodag', 'Vila är också träning', 'Ladda om']),
      v(['Idag får kroppen återhämta sig. En lugn promenad är bara en bonus.', `Musklerna byggs när du vilar. Sov gott ikväll så är du redo för ${nastaText}.`, `Vila idag, leverera sen. ${nastaText.replace(/^./, (x) => x.toUpperCase())} väntar.`]), 'Ingen träning i schemat idag.');
    if (hoppad(ds)) return m('mane', 'is', v(['Okej att vila', 'Passet är flyttat', 'Vila idag – inte imorgon']),
      v(['Du hoppade över idag. Vila gott, kroppen tackar dig.', `Dagens pass är överhoppat. Nästa: ${nastaText}.`, `Överhoppat idag. Då gäller det ${nastaText} – utan undantag.`]), 'Du har hoppat över dagens pass.');
    if (risk) return m('hjarta', 'gul', v(['Lyssna på kroppen', 'Anpassa dagens pass', 'Smart är också starkt']),
      v([`Eftersom ${varfor} är det helt okej att ta det lugnt. Byt gärna till rörlighet eller en promenad – det räknas också.`, `${varfor.replace(/^./, (x) => x.toUpperCase())}. Kör lättare än planerat eller flytta passet.`, `Inte fullt idag – ${varfor}. Vila nu så kör vi hårt när kroppen är redo. Det är så man blir bättre.`]), `Coachen sänker tempot: ${varfor}.`);
    const tid = plan.tid, typ = plan.typ, min = plan.min, sen = nu0.getHours() * 60 + nu0.getMinutes() > minuterAv(tid) + 60;
    if (missIg) return m('uppdatera', 'is', v(['Ny dag, ny chans', 'Tillbaka på banan', 'Inga två missar i rad']),
      v([`Igår blev det inget pass, och det är helt okej. Idag väntar ${typLiten(typ)} kl ${tid} – ${min} minuter räcker långt.`, `Gårdagens pass missades. Ta ${typLiten(typ)} kl ${tid} så är veckan räddad.`, `Igår blev det inget. Idag gäller det: ${typLiten(typ)} kl ${tid}. Inga ursäkter.`]), 'Gårdagens pass blev inte av.');
    if (sen) return m('klocka', 'gul', v(['Fortfarande tid', 'Passet väntar', 'Klockan tickar']),
      v([`Hann du inte ${typLiten(typ)} kl ${tid}? Tio minuter nu är bättre än inget.`, `Klockan har passerat ${tid}. Kör en kortare variant ikväll – eller checka in om du redan tränat.`, `${tid} har passerat. Skorna på – nu.`]), `Passet var planerat kl ${tid}.`);
    if (sv >= 2) return m('gnista', 'ok', v([`${sv} pass i rad – så bra!`, 'Håll sviten vid liv', 'Bryt inte kedjan']),
      v([`Dagens ${typLiten(typ)} kl ${tid} fortsätter din fina svit.`, `${sv} pass i rad. ${typ} kl ${tid} gör det till ${sv + 1}.`, `${sv} i rad. Kedjan bryts inte idag – ${typLiten(typ)} kl ${tid}.`]), `${sv} planerade pass i rad är gjorda.`);
    if (df !== null && df >= 75) return m('blixt', 'ok', v(['Du är i form idag', 'Kroppen är redo', 'Full gas idag']),
      v([`Dagsformen är ${df}. Njut av ${typLiten(typ)} kl ${tid}.`, `Dagsform ${df} – ett bra läge för ${typLiten(typ)} kl ${tid}.`, `Dagsform ${df}. Inga ursäkter – ${typLiten(typ)} kl ${tid}, ge allt.`]), `Dagsformen idag är ${df}.`);
    return m(typIkon(typ), 'is', v([`Idag: ${typLiten(typ)}`, 'Dagens pass', 'Dags att leverera']),
      v([`Kl ${tid} väntar ${min} minuter ${typLiten(typ)}. Ta det i din egen takt.`, `${typ} kl ${tid}, ${min} min. Du är ${klara} av ${planerade} pass in i veckan.`, `${typ} kl ${tid}. ${min} minuter med full fokus – veckan blir inte bättre av sig själv.`]), `${typ} står i schemat kl ${tid}.`);
  }
  function schemaKort(i) {
    const vl = veckoLage(), nu0 = idag(), ds = dagStr(nu0), plan = planFor(nu0), gjort = passPa(ds), c = coach(), msg = coachMeddelande();
    const klara = vl.filter((x) => x.lage === 'klar' && x.plan).length, planerade = vl.filter((x) => x.plan).length || 1, pr = Math.round(klara / planerade * 100);
    const LAGE_TEXT = { klar: 'Klar', hoppad: 'Överhoppad', missad: 'Missad', idag: 'Idag', kommande: 'Planerad', vila: 'Vila' };
    const dagar7 = vl.map((x, n) => `<button class="ts-dag" data-g="ts-dag" data-d="${x.ds}" data-lage="${x.lage}" ${x.idag ? 'data-idag aria-current="date"' : ''} style="--n:${n}" aria-label="${DAGNAMN[x.d.getDay()]}: ${x.plan ? e(x.plan.typ) : 'vila'} – ${LAGE_TEXT[x.lage]}">
        <small>${VECKODAG[x.d.getDay()].slice(0, 2)}</small><span class="ts-prick">${ik(x.lage === 'klar' ? 'bock' : x.lage === 'missad' ? 'stang' : x.plan ? typIkon(x.plan.typ) : 'mane')}</span><b class="tal">${x.d.getDate()}</b></button>`).join('');
    let dagens;
    if (gjort.length) dagens = `<div class="ts-idag" data-lage="klar"><span class="ikonruta ts-idag-ikon">${ik('bock')}</span><div><span class="ogon utan">Idag · incheckat</span><b>${e(gjort.map((x) => x.typ).join(' + '))}</b><small>${gjort.reduce((s, x) => s + x.min, 0)} min · ansträngning ${Math.max(...gjort.map((x) => x.rpe))}/10</small></div><button class="knapp knapp-sek ts-knapp-liten" data-g="pass-ny">Lägg till</button></div>`;
    else if (!plan) dagens = `<div class="ts-idag" data-lage="vila"><span class="ikonruta ts-idag-ikon" data-ton="is">${ik('mane')}</span><div><span class="ogon utan">Idag</span><b>Vilodag</b><small>Återhämtning är en del av planen</small></div><button class="knapp knapp-sek ts-knapp-liten" data-g="ts-checka" data-extra="1">Tränade ändå</button></div>`;
    else if (hoppad(ds)) dagens = `<div class="ts-idag" data-lage="hoppad"><span class="ikonruta ts-idag-ikon" data-ton="is">${ik(typIkon(plan.typ))}</span><div><span class="ogon utan">Idag · överhoppat</span><b>${e(plan.typ)}</b><small>${plan.min} min · kl ${e(plan.tid)}</small></div><button class="knapp knapp-sek ts-knapp-liten" data-g="ts-angra">Ångra</button></div>`;
    else dagens = `<div class="ts-idag" data-lage="idag"><span class="ikonruta ts-idag-ikon" data-ton="is">${ik(typIkon(plan.typ))}</span><div><span class="ogon utan">Idag · kl ${e(plan.tid)}</span><b>${e(plan.typ)}</b><small>${plan.min} min${c.pamin ? ` · påminnelse ${FORE.find(([m]) => m === c.fore)?.[1].toLowerCase() || ''}` : ''}</small></div></div>
      <div class="ts-knappar"><button class="knapp knapp-primar" data-g="ts-checka">${ik('bock')}Checka in</button><button class="knapp knapp-sek" data-g="ts-hoppa">Hoppa över</button></div>`;
    return `<section class="kort ts-kort in" style="--i:${i}">
      <div class="kort-rubrik"><div><span class="ogon utan">Träningsschema · v ${veckoNr(nu0)}</span><h3 style="margin-top:4px">${klara} av ${vl.filter((x) => x.plan).length} pass klara</h3></div>
        <button class="mer" data-g="ts-schema">Ändra ${ik('hoger')}</button></div>
      <div class="ts-matare matare" aria-hidden="true"><i style="--v:${pr}%"></i></div>
      <div class="ts-vecka" role="list">${dagar7}</div>
      ${dagens}
      <button class="ts-coach" data-g="coach-ark" data-ton="${msg.ton}" aria-label="Coachen: ${e(msg.rub)}. ${e(msg.text)} Tryck för att ändra tonläge.">
        <span class="ts-coach-bild" aria-hidden="true">U</span>
        <span class="ts-coach-text"><span class="ts-coach-topp"><b>Coachen</b><span class="chip ts-ton">${e(TONER.find(([k]) => k === c.ton)[1])}</span></span><b class="ts-coach-rub">${e(msg.rub)}</b><small>${e(msg.text)}</small></span></button>
    </section>`;
  }
  // Schemat: en rad per veckodag. Tryck på en dag → dagens val i samma ark.
  function schemaArk() {
    const s = schema(), antal = s.filter(Boolean).length, min = s.reduce((a, x) => a + (x ? x.min : 0), 0);
    ark(`<div class="ark-rubrik jg-ark-rubrik"><span class="ikonruta" data-ton="is">${ik('kalender')}</span><div><span class="ogon utan">Träningsschema</span><h2>Din vecka</h2></div><button class="ikonknapp" data-stang-ark aria-label="Stäng">${ik('stang')}</button></div>
      <p class="jg-ark-ingress">${antal} pass · ${min} min i veckan. Tryck på en dag för att ändra pass, tid eller vila.</p>
      <div class="ts-lista">${VECKA_ORDNING.map((d, n) => { const p = s[d]; return `<button class="ts-rad" data-g="ts-redigera" data-d="${d}" style="--n:${n}" ${p ? '' : 'data-vila'}>
        <span class="ikonruta"${p ? ' data-ton="is"' : ''}>${ik(p ? typIkon(p.typ) : 'mane')}</span><span class="ts-rad-text"><b>${DAGNAMN[d]}</b><small>${p ? `${e(p.typ)} · ${p.min} min` : 'Vila'}</small></span>${p ? `<span class="chip tal">${e(p.tid)}</span>` : ''}${ik('hoger')}</button>`; }).join('')}</div>
      <div class="ark-knappar"><button class="knapp knapp-text" data-g="ts-aterstall">${ik('uppdatera')}Föreslå efter min profil</button><button class="knapp knapp-primar knapp-bred" data-g="ts-klar">Klart ${ik('bock')}</button></div>`);
  }
  function dagArk(d) {
    const p = schema()[d] || { typ: '', min: 45, tid: '17:30' }, typer = [...new Set([...PASSTYPER().filter((t) => t !== 'Annat'), 'Rörlighet'])];
    ark(`<div class="ark-rubrik jg-ark-rubrik"><button class="ikonknapp" data-g="ts-schema" aria-label="Tillbaka till veckan">${ik('bak')}</button><div><span class="ogon utan">Träningsschema</span><h2>${DAGNAMN[d]}</h2></div><button class="ikonknapp" data-stang-ark aria-label="Stäng">${ik('stang')}</button></div>
      <div class="ark-falt"><span class="etikett">Pass</span><div class="jg-typer"><button class="chip chip-val" data-g="ts-typ" data-v="" aria-pressed="${!p.typ}">${ik('mane')}Vila</button>${typer.map((t, i) => `<button class="chip chip-val" style="--n:${i + 1}" data-g="ts-typ" data-v="${t}" aria-pressed="${p.typ === t}">${ik(typIkon(t))}${t}</button>`).join('')}</div></div>
      <div class="ts-dagfalt" ${p.typ ? '' : 'hidden'}>
        <div class="ark-falt jg-ci"><label for="ts-min"><span class="jg-ci-namn"><span class="jg-ci-ikon">${ik('klocka')}</span>Längd</span><span class="jg-ci-tal tal" data-ts-min-tal>${p.min}<small> min</small></span></label><input class="reglage" id="ts-min" type="range" min="10" max="120" step="5" value="${p.min}" data-ts-min><div class="jg-ci-skala"><span>10 min</span><span>120 min</span></div></div>
        <div class="ark-falt"><span class="etikett">Starttid</span><div class="jg-typer">${TIDER.map((t) => `<button class="chip chip-val tal" data-g="ts-tid" data-v="${t}" aria-pressed="${p.tid === t}">${t}</button>`).join('')}</div></div>
      </div>
      <div class="ark-knappar"><button class="knapp knapp-primar knapp-bred" data-g="ts-dag-spara" data-d="${d}">Spara ${DAGNAMN[d].toLowerCase()} ${ik('bock')}</button></div>`,
    { efter: (a) => { a.dataset.typ = p.typ; a.dataset.tid = TIDER.includes(p.tid) ? p.tid : '17:30'; const r = $('[data-ts-min]', a); reglageFarg(r);
      r.addEventListener('input', () => { reglageFarg(r); $('[data-ts-min-tal]', a).innerHTML = `${r.value}<small> min</small>`; }); } });
  }
  // Coachen: tonläge, påminnelse och en förhandsvisning som byter text direkt.
  function coachArk() {
    const c = coach();
    ark(`<div class="ark-rubrik jg-ark-rubrik"><span class="ikonruta">${ik('gnista')}</span><div><span class="ogon utan">Coach och påminnelser</span><h2>Hur vill du bli peppad?</h2></div><button class="ikonknapp" data-stang-ark aria-label="Stäng">${ik('stang')}</button></div>
      <div class="ark-falt"><span class="etikett">Tonläge</span><div class="segment ts-segment" role="group" aria-label="Coachens tonläge"><span class="segment-markor"></span>${TONER.map(([k, t]) => `<button type="button" data-g="coach-ton" data-v="${k}" aria-pressed="${c.ton === k}">${t}</button>`).join('')}</div>
        <p class="ts-ton-text" data-ton-text>${e(TONER.find(([k]) => k === c.ton)[2])}</p></div>
      <div class="ts-forhand" data-forhand>${forhandHtml()}</div>
      <div class="ark-falt"><button class="jg-inst-rad ts-vaxelrad" data-g="coach-pamin" role="switch" aria-checked="${c.pamin}"><span class="ikonruta" data-ton="is">${ik('klocka')}</span><b>Påminn mig om träningen</b><span class="vaxel" aria-checked="${c.pamin}" aria-hidden="true"></span></button></div>
      <div class="ark-falt" data-fore-falt ${c.pamin ? '' : 'hidden'}><span class="etikett">När</span><div class="jg-typer">${FORE.map(([m, t]) => `<button class="chip chip-val" data-g="coach-fore" data-v="${m}" aria-pressed="${c.fore === m}">${t}</button>`).join('')}</div></div>
      <p class="ts-regel">${ik('info')}<span>Coachen följer enkla regler: schemat, din svit, dagsformen och kroppskartan. Har du ont, en skada eller låg dagsform sänker den tempot – även i Hård.</span></p>
      <div class="ark-knappar"><button class="knapp knapp-sek knapp-bred" data-g="coach-test">${ik('klocka')}Visa en påminnelse nu</button><button class="knapp knapp-primar knapp-bred" data-g="coach-klar">Klart ${ik('bock')}</button></div>`);
  }
  function forhandHtml() { const m = coachMeddelande(); return `<span class="ts-coach-bild" aria-hidden="true">U</span><span class="ts-coach-text"><b class="ts-coach-rub">${e(m.rub)}</b><small>${e(m.text)}</small><span class="ts-varfor">${ik('info')}${e(m.regel)}</span></span>`; }
  // Notisen: en banderoll i iOS-stil som glider ner från toppen. Tryck öppnar incheckningen, svep uppåt eller vänta så försvinner den.
  function notis({ rub, text, g = 'ts-checka' } = {}) {
    const m = rub ? { rub, text } : coachMeddelande();
    let n = $('#notis'); if (!n) { n = document.createElement('button'); n.id = 'notis'; n.className = 'up-notis'; n.type = 'button'; app.appendChild(n);
      let y0 = null; n.addEventListener('pointerdown', (ev) => { y0 = ev.clientY; });
      n.addEventListener('pointerup', (ev) => { if (y0 !== null && ev.clientY - y0 < -18) { n.dataset.svept = ''; gomNotis(); } y0 = null; }); }
    n.dataset.g = g; delete n.dataset.svept;
    n.innerHTML = `<span class="up-notis-ikon" aria-hidden="true">U</span><span class="up-notis-text"><span class="up-notis-topp"><b>${LANDS ? 'LÄNGDLANDSLAGET' : 'UPERFORMANCE'}</b><small>nu</small></span><b class="up-notis-rub">${e(m.rub)}</b><small>${e(m.text)}</small></span>`;
    n.setAttribute('aria-label', `Påminnelse: ${m.rub}. ${m.text}`);
    clearTimeout(notis.t); delete n.dataset.visas; void n.offsetWidth; n.dataset.visas = ''; try { navigator.vibrate?.([10, 40, 10]); } catch (err) { /* ingen vibration */ }
    notis.t = setTimeout(gomNotis, 6500);
  }
  function gomNotis() { const n = $('#notis'); if (n) delete n.dataset.visas; clearTimeout(notis.t); }
  // Påminnelsen i prototypen: när Idag visas och dagens pass inte är gjort kommer notisen en gång per session (och när tiden för påminnelsen är nådd medan appen är öppen).
  let notisVisad = false;
  function paminnKoll() {
    const c = coach(); if (!st.profil || !c.pamin || st.notiser === false) return; const nu0 = idag(), ds = dagStr(nu0), plan = planFor(nu0);
    if (!plan || passPa(ds).length || hoppad(ds)) return;
    const kvar = minuterAv(plan.tid) - (nu0.getHours() * 60 + nu0.getMinutes());
    if (!notisVisad && flik === 'idag') { notisVisad = true; setTimeout(() => { if (flik === 'idag' && arkLager.hidden) notis(); }, lugn ? 300 : 1600); return; }
    if (kvar <= c.fore && kvar > c.fore - 1 && paminnKoll.dag !== ds) { paminnKoll.dag = ds; notis(); }
  }
  setInterval(paminnKoll, 30000);
  // Incheckning: passet från schemat är förifyllt – bara ansträngningen kvar.
  function checkaArk({ extra = false } = {}) {
    const plan = planFor(idag());
    passArk({ typ: !extra && plan ? plan.typ : null, min: !extra && plan ? plan.min : 45, plan: !extra && !!plan, rubrik: !extra && plan ? 'Checka in dagens pass' : 'Logga ett pass' });
  }
  function reaktion() {
    const t = coach().ton, vl = veckoLage(), klara = vl.filter((x) => x.lage === 'klar' && x.plan).length, alla = vl.filter((x) => x.plan).length, sv = traningsSvit();
    if (klara >= alla && alla) return ['Hela veckans schema är klart!', 'Veckan är avklarad – starkt.', 'Hela veckan klar. Nu höjer vi ribban.'][TONER.findIndex(([k]) => k === t)];
    return [`Incheckat – ${sv > 1 ? `${sv} pass i rad, ` : ''}bra jobbat!`, `Incheckat · ${klara} av ${alla} den här veckan`, `Incheckat. ${alla - klara} kvar – fortsätt leverera.`][TONER.findIndex(([k]) => k === t)];
  }

  /* ---- 12c lopp: banan på karta, rundan i färg efter farten och smarta verktyg ---- */
  // Banorna är SCHEMATISKA (inte riktiga kartdata) och märkta så. Rundan är ett exempelpass från klockan.
  const LOPP = [
    { id: 'varvet', namn: 'Göteborgsvarvet', stad: 'Göteborg', km: 21.0975, nar: 'Maj', typ: 'Halvmaraton',
      partner: { kalla: 'goteborgsvarvet.se/partners',
        huvud: [['ASICS', 'Huvudpartner i Varvetfamiljen'], ['Polestar', 'Officiell klockbil · Polestar 4'], ['Stadium', 'Huvudpartner sedan 2025'], ['STC', 'Uppvärmning under Varvetveckan']],
        evenemang: ['Volvokoncernen', 'Göteborg Energi', 'Garmin', 'Vitamin Well', 'Biotherm', 'Almondy', 'Dannebacken', 'Cramo', 'Norion Bank', 'Solar Sverige', 'Skinome'],
        media: ['Mix Megapol', 'Göteborgs-Posten', "Runner's World"],
        leverantorer: ['ProPud', 'Chiquita', 'Radisson Blu Scandinavia', 'Therabody', 'Cramo', 'HLR Konsulten', 'Learnifier'],
        tid: 'Garmin' },
      beloningar: [
        { id: 'vw', partner: 'Vitamin Well', typ: 'stracka', km: 5, rubrik: 'En Vitamin Well på köpet', text: 'Hämta vid målområdet', kod: 'VARVET-VW5' },
        { id: 'polestar', partner: 'Polestar', typ: 'plats', t: .36, plats: 'Hisingen', rubrik: 'Provkör Polestar 4', text: 'Boka en provkörning efter loppet', kod: 'VARVET-PS4' },
        { id: 'asics', partner: 'ASICS', typ: 'stracka', km: 10, rubrik: '20 % på löparkläder', text: 'I butik och på nätet', kod: 'VARVET-ASICS20' },
        { id: 'stadium', partner: 'Stadium', typ: 'plats', t: .8, plats: 'Avenyn', rubrik: '15 % på löparskor', text: 'I Stadiums butik vid Avenyn', kod: 'VARVET-STAD15' },
        { id: 'garmin', partner: 'Garmin', typ: 'stracka', km: 15, rubrik: '10 % på en löparklocka', text: 'När rundan är synkad', kod: 'VARVET-GAR10' },
        { id: 'stc', partner: 'STC', typ: 'stracka', km: 21.1, rubrik: 'Ett gympass på köpet', text: 'När du gått i mål', kod: 'VARVET-STC' } ],
      bana: 'M150 214 C112 214 70 196 52 168 C40 150 38 128 40 104 C42 84 58 70 84 64 C120 56 168 52 206 58 C236 62 248 76 244 96 C240 112 228 122 226 134 C224 150 240 160 262 166 C284 172 290 192 270 204 C246 218 196 222 150 214',
      vatten: 'M0 118 C60 110 120 126 180 116 C240 106 300 120 340 112 L340 136 C300 144 240 130 180 140 C120 150 60 134 0 142 Z',
      parker: [[150, 226, 46, 20], [300, 30, 30, 18]], broar: [[40, 128, 0], [236, 124, 8]],
      platser: [[150, 214, 'Slottsskogen · start och mål', 'b'], [40, 118, 'Älvsborgsbron', 'v'], [120, 54, 'Hisingen', 'o'], [242, 106, 'Götaälvbron', 'h'], [266, 168, 'Avenyn', 'h']],
      backar: [[0.18, 0.27], [0.55, 0.62]] },
    { id: 'midnatt', namn: 'Midnattsloppet', stad: 'Stockholm', km: 10, nar: 'Augusti', typ: '10 km',
      bana: 'M70 190 C60 150 76 110 112 92 C150 72 200 70 238 86 C272 100 286 132 276 162 C266 192 232 206 196 204 C160 202 140 184 120 196 C100 208 78 210 70 190',
      vatten: 'M0 40 C80 30 160 50 240 36 C290 28 320 34 340 30 L340 56 C300 62 240 58 180 66 C110 74 50 60 0 66 Z',
      parker: [[72, 210, 30, 16], [250, 150, 20, 14]], broar: [],
      platser: [[70, 190, 'Start och mål', 'b'], [176, 72, 'Södermalm', 'o'], [278, 150, 'Hornstull', 'h']], backar: [[0.3, 0.38]] },
    { id: 'lidingo', namn: 'Lidingöloppet', stad: 'Lidingö', km: 30, nar: 'September', typ: 'Terräng 30 km',
      bana: 'M60 200 C40 160 52 112 88 86 C122 62 170 50 212 62 C254 74 290 104 288 146 C286 186 252 212 210 214 C176 216 160 196 132 202 C104 208 72 222 60 200',
      vatten: 'M0 230 C90 222 180 238 260 226 C300 220 320 224 340 222 L340 260 L0 260 Z',
      parker: [[180, 130, 110, 70], [60, 210, 26, 14]], broar: [],
      platser: [[60, 200, 'Start och mål', 'b'], [212, 62, 'Skogen', 'o'], [288, 146, 'Abborrbacken', 'h']], backar: [[0.4, 0.5], [0.78, 0.86]] },
    { id: 'varruset', namn: 'Vårruset', stad: 'Flera städer', km: 5, nar: 'Maj', typ: '5 km',
      bana: 'M90 180 C70 140 92 100 136 92 C180 84 232 96 252 132 C270 166 246 200 204 206 C164 212 140 196 118 204 C100 210 96 194 90 180',
      vatten: '', parker: [[170, 150, 80, 50]], broar: [], platser: [[90, 180, 'Start och mål', 'b'], [252, 132, 'Vändpunkt', 'h']], backar: [] },
  ];
  // Ett gemensamt gatunät (huvudgator tjockare) och kvarter – samma för alla banor, bara som bakgrund.
  const GATOR_D = ['M0 30 C80 40 160 20 340 34', 'M0 84 C100 90 220 72 340 80', 'M0 176 C90 168 200 186 340 172', 'M0 226 C120 232 220 216 340 228', 'M30 0 C40 80 20 160 36 250',
    'M112 0 C104 70 124 170 108 250', 'M196 0 C204 90 184 160 202 250', 'M286 0 C276 80 298 170 284 250', 'M0 0 L150 120', 'M340 10 L210 140'];
  const GATOR = GATOR_D.map((d, i) => `<path d="${d}" class="${i % 3 ? '' : 'stor'}"/>`).join('');
  const KVARTER = Array.from({ length: 54 }, (_, i) => { const x = (i % 9) * 38 + 6 + ((i * 7) % 5), y = Math.floor(i / 9) * 42 + 6 + ((i * 11) % 6); return `<rect x="${x}" y="${y}" width="${24 + (i * 5) % 9}" height="${26 + (i * 3) % 8}" rx="3"/>`; }).join('');
  const FART = LANDS ? [[14, 'gar', 'Lugnt', 'is'], [19, 'jogg', 'Distans', 'ok'], [24, 'spring', 'Tempo', 'gul'], [99, 'tar', 'Spurt', 'rod']]
    : [[7, 'gar', 'Går', 'is'], [10, 'jogg', 'Joggar', 'ok'], [13, 'spring', 'Springer', 'gul'], [99, 'tar', 'Tar i', 'rod']];
  // Längdlandslagets lopp (schematiska banor, exempel). Partnerna enligt skidor.com/idrotter/langdakning/elit--landslag.
  const LS_PARTNER = { kalla: 'skidor.com · Längdlandslagen', rubrik: 'Längdlandslagets partners', remsaRubrik: 'Huvud- och premiumpartner', etikett: { evenemang: 'Lagpartners' },
    huvud: [['Svenska Spel', 'Huvudpartner'], ['Adidas', 'Premiumpartner']], evenemang: ['Bauhaus', 'Elgiganten', 'Ica', 'Novo Nordisk', 'SCA', 'Sundström', 'Swedbank', 'Thermia'], media: [], leverantorer: [] };
  const LOPP_LANDS = [
    { id: 'vasa', namn: 'Vasaloppet', stad: 'Sälen – Mora', km: 90, nar: 'Mars', typ: 'Klassiskt 90 km', partner: LS_PARTNER,
      bana: 'M22 64 C54 52 78 92 108 98 C138 104 150 56 184 58 C218 60 214 124 246 136 C276 148 292 118 312 146 C326 166 320 196 300 212',
      vatten: 'M236 204 C276 192 318 206 340 198 L340 250 L222 250 C224 230 228 214 236 204 Z',
      parker: [[92, 166, 64, 30], [206, 34, 72, 22], [52, 30, 40, 18], [150, 200, 40, 20]], broar: [],
      platser: [[22, 64, 'Sälen · start', 'b'], [108, 98, 'Smågan', 'o'], [184, 58, 'Risberg', 'o'], [246, 136, 'Evertsberg', 'v'], [312, 146, 'Oxberg', 'h'], [300, 212, 'Mora · mål', 'b']],
      backar: [[0.01, 0.07], [0.3, 0.36]],
      beloningar: [
        { id: 'adidas', partner: 'Adidas', typ: 'stracka', km: 30, rubrik: '20 % på skidkläder', text: 'I butik och på nätet', kod: 'LL-ADI20' },
        { id: 'ica', partner: 'Ica', typ: 'plats', t: .56, plats: 'Evertsberg', rubrik: 'Blåbärssoppa och bulle på köpet', text: 'Hämta i kontrollen', kod: 'LL-ICA' },
        { id: 'elg', partner: 'Elgiganten', typ: 'stracka', km: 60, rubrik: '10 % på en pulsklocka', text: 'När passet är synkat', kod: 'LL-ELG10' },
        { id: 'bauhaus', partner: 'Bauhaus', typ: 'plats', t: .8, plats: 'Oxberg', rubrik: '15 % på vallabord och verktyg', text: 'I Bauhaus butiker', kod: 'LL-BH15' },
        { id: 'thermia', partner: 'Thermia', typ: 'stracka', km: 90, rubrik: 'Värm upp i målområdet', text: 'När du gått i mål i Mora', kod: 'LL-MAL' } ] },
    { id: 'falun', namn: 'VM i Falun 2027', stad: 'Falun · Lugnet', km: 10, nar: 'Feb – mars 2027', typ: '10 km', partner: LS_PARTNER,
      bana: 'M84 196 C60 160 70 106 112 84 C152 64 210 66 246 92 C278 116 282 160 256 186 C232 208 196 204 168 192 C142 182 120 216 84 196',
      vatten: 'M0 26 C70 18 150 34 230 24 C290 18 320 22 340 20 L340 0 L0 0 Z',
      parker: [[180, 140, 100, 56], [50, 120, 30, 40]], broar: [],
      platser: [[84, 196, 'Lugnet · start och mål', 'b'], [176, 70, 'Mördarbacken', 'o'], [270, 150, 'Skidstadion', 'h']], backar: [[0.25, 0.4], [0.62, 0.72]],
      beloningar: [
        { id: 'sca', partner: 'SCA', typ: 'stracka', km: 5, rubrik: 'Halvvägs – heja-hälsning', text: 'Exempel på en partnerhälsning', kod: 'LL-SCA' },
        { id: 'swedbank', partner: 'Swedbank', typ: 'stracka', km: 10, rubrik: 'Målgångsbild att spara', text: 'När du gått i mål', kod: 'LL-SWB' } ] },
  ];
  const fartZon = (kmh) => FART.find(([max]) => kmh < max);
  const tidText = (sek) => { sek = Math.round(sek); const h = Math.floor(sek / 3600), m = Math.floor((sek % 3600) / 60), s = sek % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; };
  const tempoText = (sekPerKm) => `${Math.floor(sekPerKm / 60)}:${String(Math.round(sekPerKm % 60)).padStart(2, '0')}`;
  if (LANDS) LOPP.splice(0, LOPP.length, ...LOPP_LANDS);
  const loppNu = () => LOPP.find((l) => l.id === (st.lopp?.id || 'varvet')) || LOPP[0];
  const loppSt = () => { st.lopp = st.lopp || (LANDS ? { id: 'vasa', mal: Math.round(90 * (elit() ? 165 : 330) / 60) * 60 } : { id: 'varvet', mal: (elit() ? 92 : 125) * 60 }); return st.lopp; };
  // Exempelrundan: 120 punkter längs banan, farten i km/h – lugnt i början, långsammare i backarna, gång vid vätskan, spurt sist.
  function exempelRunda(l) {
    const N = 120, bas = LANDS ? (elit() ? 22 : 15.5) : elit() ? 12.6 : 9.8;
    return Array.from({ length: N }, (_, i) => { const t = i / (N - 1); let v = bas * (t < .06 ? .86 : 1) * (1 + .1 * Math.sin(i * .33) + .05 * Math.sin(i * 1.7));
      if (l.backar.some(([a, b]) => t >= a && t <= b)) v *= .76;
      if (!elit() && [0.24, 0.48, 0.72].some((p) => Math.abs(t - p) < .012)) v = 5.6;
      if (t > .94) v = bas * 1.22; return Math.max(4.5, +v.toFixed(2)); });
  }
  function rundaFakta(l, v) {
    const del = l.km / v.length, sek = v.reduce((s, x) => s + del / x * 3600, 0), andel = FART.map(([, k]) => v.filter((x) => fartZon(x)[1] === k).length / v.length);
    const perKm = []; for (let k = 0; k < Math.ceil(l.km); k++) { const fran = Math.floor(k / l.km * v.length), till = Math.max(fran + 1, Math.floor(Math.min(k + 1, l.km) / l.km * v.length)); const s = v.slice(fran, till); perKm.push(s.reduce((a, x) => a + x, 0) / s.length); }
    const snabb = perKm.indexOf(Math.max(...perKm));
    return { sek, tempo: sek / l.km, andel, perKm, snabb };
  }
  function kartaSvg(l, { spela = true } = {}) {
    return `<svg class="lp-karta" viewBox="0 0 340 250" role="img" aria-label="Schematisk karta över ${e(l.namn)} med rundan färgad efter farten">
      <defs><pattern id="lp-rutnat" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="currentColor" stroke-width=".5"/></pattern></defs>
      <rect class="lp-mark" width="340" height="250" rx="22"/><rect class="lp-rutor" width="340" height="250" rx="22" fill="url(#lp-rutnat)"/>
      <g class="lp-kvarter" aria-hidden="true">${KVARTER}</g>
      ${(l.parker || []).map(([x, y, rx, ry]) => `<ellipse class="lp-park" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('')}
      ${l.vatten ? `<path class="lp-strand" d="${l.vatten}"/><path class="lp-vatten" d="${l.vatten}"/>` : ''}
      <g class="lp-gator" aria-hidden="true">${GATOR}</g>
      ${(l.broar || []).map(([x, y, v]) => `<rect class="lp-bro" x="-4" y="-16" width="8" height="32" rx="2" transform="translate(${x} ${y}) rotate(${v})"/>`).join('')}
      <path class="lp-bana-skugga" fill="none" d="${l.bana}"/><path class="lp-bana" fill="none" d="${l.bana}" data-lp-bana/><path class="lp-bana-glod" fill="none" d="${l.bana}" pathLength="1"/>
      <g data-lp-farg></g>
      ${l.platser.map(([x, y, t, s]) => `<g class="lp-plats" data-sida="${s}" transform="translate(${x} ${y})">${s === 'b' ? '<circle class="lp-start-puls" r="6"/>' : ''}<circle r="${s === 'b' ? 6 : 3.5}"/><text x="${s === 'v' ? 8 : s === 'h' ? -8 : 0}" y="${s === 'o' ? -9 : s === 'b' ? 18 : 4}" text-anchor="${s === 'v' ? 'start' : s === 'h' ? 'end' : 'middle'}">${e(t)}</text></g>`).join('')}
      ${spela ? '<g class="lp-spok" data-lp-spok><circle r="9" class="lp-spok-glod"/><circle r="5"/></g>' : ''}
    </svg>`;
  }
  // Färgar rundan: banan mäts upp och delas i lika långa bitar, varje bit får farten i den punkten.
  function fargaRunda(svg, v) {
    const p = $('[data-lp-bana]', svg), g = $('[data-lp-farg]', svg); if (!p || !g || !p.getTotalLength) return;
    const L = p.getTotalLength(), n = v.length, bit = L / n; let html = '';
    for (let i = 0; i < n; i++) { const a = p.getPointAtLength(i * bit), b = p.getPointAtLength(Math.min(L, (i + 1) * bit + .6)), z = fartZon(v[i]);
      html += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" data-z="${z[1]}" style="--n:${i}"/>`; }
    g.innerHTML = html; svg.dataset.l = L; svg.dataset.ritad = '';
  }
  let spokRaf = 0;
  function spelaRunda(svg, v, l, knapp) {
    cancelAnimationFrame(spokRaf); const p = $('[data-lp-bana]', svg), dot = $('[data-lp-spok]', svg); if (!p || !dot) return;
    const L = p.getTotalLength(), linjer = $$('[data-lp-farg] line', svg), T = lugn ? 0 : 7000, t0 = performance.now(), info = $('[data-lp-live]', svg.closest('.ark'));
    linjer.forEach((x) => x.classList.add('vantar')); svg.dataset.spelar = ''; if (knapp) knapp.innerHTML = `${ik('klocka')}Spelar upp …`;
    const steg = (nu0) => { const t = T ? Math.min(1, (nu0 - t0) / T) : 1, pt = p.getPointAtLength(t * L), i = Math.min(v.length - 1, Math.floor(t * v.length)), z = fartZon(v[i]);
      dot.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`); dot.dataset.z = z[1];
      for (let k = 0; k <= i; k++) linjer[k]?.classList.remove('vantar');
      if (info) info.innerHTML = `<b class="tal">${fmt(t * l.km, 1)}</b><small>km</small><span class="lp-zon" data-z="${z[1]}">${z[2]} · ${fmt(v[i], 1)} km/h</span>`;
      if (t < 1) spokRaf = requestAnimationFrame(steg); else { delete svg.dataset.spelar; if (knapp) knapp.innerHTML = `${ik('uppdatera')}Spela upp igen`; } };
    spokRaf = requestAnimationFrame(steg);
  }
  // Riegels formel (T2 = T1 · (D2/D1)^1,06) – en känd tumregel för att räkna om en tid till en annan distans.
  const riegel = (t1, d1, d2) => t1 * Math.pow(d2 / d1, 1.06);
  function basta10() { // bästa 10-km-tid i exempelhistoriken (märkt exempel)
    return LANDS ? (elit() ? 24 * 60 + 30 : 41 * 60) : elit() ? 39 * 60 + 40 : 54 * 60 + 10;
  }
  // Loppets partners – namnen som text tills partnernas egna loggfiler finns (inga efterritade loggor). Källan visas.
  // Loggfiler från partnerna läggs i partner/ och skrivs in här (namn → fil). Saknas filen visas namnet som ordmärke.
  const PARTNER_LOGGA = { ASICS: 'partner/asics.svg', Polestar: 'partner/polestar.svg', Stadium: 'partner/stadium.svg', STC: 'partner/stc.svg', Volvokoncernen: 'partner/volvo.svg', Garmin: 'partner/garmin.svg', Chiquita: 'partner/chiquita.svg', 'Radisson Blu Scandinavia': 'partner/radisson.svg', 'Göteborg Energi': 'partner/goteborg-energi.svg', 'Vitamin Well': 'partner/vitamin-well.svg', Biotherm: 'partner/biotherm.svg', Almondy: 'partner/almondy.svg', Dannebacken: 'partner/dannebacken.png', Cramo: 'partner/cramo.svg', 'Norion Bank': 'partner/norion-bank.svg', 'Solar Sverige': 'partner/solar.svg', Skinome: 'partner/skinome.svg', 'Mix Megapol': 'partner/mix-megapol.svg', 'Göteborgs-Posten': 'partner/gp.svg', "Runner's World": 'partner/runners-world.png', ProPud: 'partner/propud.svg', Therabody: 'partner/therabody.svg', 'HLR Konsulten': 'partner/hlr-konsulten.svg', Learnifier: 'partner/learnifier.svg',
    'Svenska Spel': 'partner/landslaget/svenska-spel.png', Adidas: 'partner/landslaget/adidas.jpg', Bauhaus: 'partner/landslaget/bauhaus.png', Elgiganten: 'partner/landslaget/elgiganten.jpg', Ica: 'partner/landslaget/ica.jpg',
    'Novo Nordisk': 'partner/landslaget/novo-nordisk.png', SCA: 'partner/landslaget/sca.jpg', Sundström: 'partner/landslaget/sundstrom.jpg', Swedbank: 'partner/landslaget/swedbank.jpg', Thermia: 'partner/landslaget/thermia.png' }; // från partnernas webbplatser och Wikimedia Commons
  const VITA_LOGGOR = new Set(['Mix Megapol', 'HLR Konsulten']); // vita loggor – mörk platta i ljust läge
  function sponsorRemsa(l) {
    const p = l.partner; if (!p) return '';
    return `<div class="lp-sponsorer" aria-label="Huvudpartners: ${e(p.huvud.map(([n]) => n).join(', '))}"><span class="lp-s-etikett">${e(p.remsaRubrik || 'Huvudpartners')}</span><span class="lp-s-rad">${p.huvud.map(([n], i) => PARTNER_LOGGA[n]
      ? (n === 'Polestar' ? `<span class="lp-s-polestar" style="--n:${i}"><img class="lp-s-logga" src="${PARTNER_LOGGA[n]}" alt="">POLESTAR</span>` : `<img class="lp-s-logga" src="${PARTNER_LOGGA[n]}" alt="${e(n)}" style="--n:${i}">`) : `<b class="lp-s-ord" style="--n:${i}">${e(n)}</b>`).join('<i aria-hidden="true"></i>')}</span></div>`;
  }
  function partnerHtml(l) {
    const p = l.partner; if (!p) return '';
    const rad = (rubrik, lista) => `<div class="lp-p-grupp"><span class="lp-p-etikett">${rubrik}</span><div class="lp-p-chips">${lista.map((n, i) => PARTNER_LOGGA[n] ? `<span class="lp-p-chip lp-p-chip-logga${VITA_LOGGOR.has(n) ? ' lp-p-vit' : ''}" style="--n:${i}"><img src="${PARTNER_LOGGA[n]}" alt="${e(n)}"></span>` : `<span class="lp-p-chip" style="--n:${i}">${e(n)}</span>`).join('')}</div></div>`;
    return `<section class="lp-partner" aria-labelledby="lp-p-rubrik"><div class="lp-p-topp"><h3 id="lp-p-rubrik">${e(p.rubrik || `${l.namn}s partners`)}</h3><span class="lp-p-kalla">Källa: ${e(p.kalla)}</span></div>
      <div class="lp-p-huvud">${p.huvud.map(([n, u], i) => `<div class="lp-p-kort" style="--n:${i}">${PARTNER_LOGGA[n] ? `<span class="lp-p-loggarad"><img class="lp-p-logga" src="${PARTNER_LOGGA[n]}" alt="${n === 'Polestar' ? '' : e(n)}">${n === 'Polestar' ? '<b class="lp-p-ordmarke">POLESTAR</b>' : ''}</span>` : `<b class="lp-p-namn">${e(n)}</b>`}<small>${e(u)}</small></div>`).join('')}</div>
      ${p.evenemang.length ? rad(p.etikett?.evenemang || 'Evenemangspartners', p.evenemang) : ''}${p.media.length ? rad('Mediepartners', p.media) : ''}${p.leverantorer.length ? rad('Leverantörer', [...new Set(p.leverantorer)]) : ''}</section>`;
  }
  // Belöningar: var på banan (andel) och om de är upplåsta (sparas per lopp i st.lopp.upplast).
  const belT = (l, b) => (b.typ === 'stracka' ? Math.min(1, b.km / l.km) : b.t);
  const upplast = (l) => new Set(((loppSt().upplast || {})[l.id]) || []);
  function lasUpp(l, b) { const s0 = loppSt(); s0.upplast = s0.upplast || {}; const lista = s0.upplast[l.id] = s0.upplast[l.id] || []; if (lista.includes(b.id)) return false; lista.push(b.id); spara(); return true; }
  function belVillkor(b) { const sp = LANDS ? 'Åk' : 'Spring'; return b.typ === 'stracka' ? (b.km >= (LANDS ? loppNu().km : 21) ? 'Gå i mål' : `${sp} ${fmt(b.km, 0)} km`) : `${sp} förbi ${b.plats}`; }
  function beloningHtml(l) {
    const lista = l.beloningar; if (!lista) return ''; const u = upplast(l), n = lista.filter((b) => u.has(b.id)).length;
    return `<section class="lp-bel" aria-labelledby="lp-bel-rubrik"><div class="lp-bel-topp"><div><h3 id="lp-bel-rubrik">Belöningar längs banan</h3><small>Lås upp erbjudanden från loppets partners när du springer</small></div>
      <span class="lp-bel-rakna" data-bel-rakna><b class="tal">${n}</b>/${lista.length}</span></div>
      <div class="lp-bel-matare matare" aria-hidden="true"><i data-bel-matare style="--v:${n / lista.length * 100}%"></i></div>
      <ul class="lp-bel-lista">${lista.map((b, i) => { const ok = u.has(b.id), lg = PARTNER_LOGGA[b.partner];
        return `<li class="lp-bel-rad" data-bel="${b.id}" ${ok ? 'data-upplast' : ''} style="--n:${i}">
          <span class="lp-bel-logga">${lg ? `<img src="${lg}" alt="${e(b.partner)}">` : `<b>${e(b.partner)}</b>`}</span>
          <span class="lp-bel-text"><b>${e(b.rubrik)}</b><small>${ik(b.typ === 'plats' ? 'plats' : 'sko')}${e(belVillkor(b))} · ${e(b.text)}</small></span>
          <span class="lp-bel-lage">${ok ? `<button class="lp-bel-kod" data-g="bel-kod" data-kod="${e(b.kod)}" aria-label="Kopiera koden ${e(b.kod)}"><span class="tal">${e(b.kod)}</span>${ik('dokument')}</button>` : `<span class="lp-bel-las">${ik('las')}Låst</span>`}</span></li>`; }).join('')}</ul>
      <p class="lp-bel-fot">${ik('info')}<span>Exempel i prototypen – erbjudanden och villkor bestäms tillsammans med partnerna. Spela upp rundan för att se hur de låses upp.</span></p>${n ? `<button class="knapp knapp-text lp-bel-om" data-g="bel-nollstall">${ik('uppdatera')}Lås belöningarna igen</button>` : ''}</section>`;
  }
  function visaUpplast(l, b) {
    const ram = $('.lp-kartram', arkLager); if (!ram) return; const lg = PARTNER_LOGGA[b.partner];
    const k = document.createElement('div'); k.className = 'lp-upp'; k.innerHTML = `<span class="lp-upp-logga">${lg ? `<img src="${lg}" alt="">` : ''}</span><span><small>Upplåst · ${e(b.partner)}</small><b>${e(b.rubrik)}</b></span><span class="lp-upp-bock">${ik('bock')}</span>`;
    ram.appendChild(k); try { navigator.vibrate?.(12); } catch (err) { /* ingen vibration */ } setTimeout(() => k.dataset.ut = '', 2200); setTimeout(() => k.remove(), 2700);
    const rad = $(`.lp-bel-rad[data-bel="${b.id}"]`, arkLager); if (rad) { rad.dataset.upplast = ''; $('.lp-bel-lage', rad).innerHTML = `<button class="lp-bel-kod" data-g="bel-kod" data-kod="${e(b.kod)}" aria-label="Kopiera koden ${e(b.kod)}"><span class="tal">${e(b.kod)}</span>${ik('dokument')}</button>`; rad.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'cubic-bezier(.2, 1.3, .35, 1)' }); }
    const n = upplast(l).size, t0 = $('[data-bel-rakna]', arkLager); if (t0) t0.innerHTML = `<b class="tal">${n}</b>/${l.beloningar.length}`; $('[data-bel-matare]', arkLager)?.style.setProperty('--v', `${n / l.beloningar.length * 100}%`);
  }
  // Vallaguiden (bara landslaget): välj snötemperatur → typ av glid- och fästvalla. Allmän guide – vallateamet avgör.
  const VALLA = [[-15, 'Kall, torr snö', 'Hård glidvalla för kyla', 'Grön eller kall fästvalla', '#7fc8ff'], [-8, 'Kall snö', 'Kall–medel glidvalla', 'Blå fästvalla', '#4f9dff'],
    [-3, 'Medelföre', 'Medel glidvalla', 'Lila fästvalla', '#9b7bff'], [0, 'Runt nollan', 'Varm glidvalla med struktur', 'Röd fästvalla eller klister', '#ff7a6b'], [3, 'Blöt snö', 'Varm glidvalla, grov struktur', 'Universalklister', '#ffb347']];
  // Hjälten bakom hälsningen: norrsken, fjäll i två lager, stjärnor och snö (bara landslaget).
  function lsHero() {
    const fj = (top, n, amp) => { const p = Array.from({ length: n + 1 }, (_, i) => [i * 400 / n, i % 2 ? top + amp + ((i * 13) % 3) * 4 : top + ((i * 37) % 5) * 4]);
      let d = `M0 100 L0 ${p[0][1]}`; for (let i = 0; i < n; i++) d += ` Q${p[i][0].toFixed(0)} ${p[i][1].toFixed(0)} ${((p[i][0] + p[i + 1][0]) / 2).toFixed(0)} ${((p[i][1] + p[i + 1][1]) / 2).toFixed(0)}`; return d + ` L400 ${p[n][1]} L400 100 Z`; };
    const stj = Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 53) % 100}%;--y:${(i * 31) % 60}%;--d:${(-(i * .8) % 5).toFixed(1)}s"></i>`).join('');
    const sno = Array.from({ length: 22 }, (_, i) => `<b style="--x:${(i * 41 + 9) % 100}%;--t:${(6 + (i % 4) * 2).toFixed(0)}s;--d:${(-(i * .7)).toFixed(1)}s;--s:${(1.4 + (i % 3) * .9).toFixed(1)}px"></b>`).join('');
    return `<div class="ls-hero" aria-hidden="true"><div class="ls-hero-ns"><i></i><i></i><i></i></div><div class="ls-hero-stj">${stj}</div>
      <svg class="ls-hero-fj ls-hero-fj1" viewBox="0 0 400 100" preserveAspectRatio="none"><path d="${fj(26, 8, 34)}"/><path transform="translate(400 0)" d="${fj(26, 8, 34)}"/></svg>
      <svg class="ls-hero-fj ls-hero-fj2" viewBox="0 0 400 100" preserveAspectRatio="none"><path d="${fj(50, 5, 30)}"/><path transform="translate(400 0)" d="${fj(50, 5, 30)}"/></svg>
      <div class="ls-hero-sno">${sno}</div></div>`;
  }
  // Säsongen: från barmark till Vasaloppet (första söndagen i mars) – en åkare glider fram till där vi är, nedräkning till loppet.
  function sasongKort(i) {
    const nu0 = idag(), ar = nu0.getMonth() > 2 || (nu0.getMonth() === 2 && nu0.getDate() > 7) ? nu0.getFullYear() + 1 : nu0.getFullYear();
    const vasa = new Date(ar, 2, 1); vasa.setDate(1 + ((7 - vasa.getDay()) % 7)); vasa.setHours(8, 0, 0, 0);
    const dgr = Math.max(0, Math.ceil((vasa - nu0) / 864e5)), start = new Date(ar - 1, 4, 1), andel = klamp((nu0 - start) / (vasa - start), 0, 1);
    const FAS = [['Barmark', 'Maj – okt', 0], ['Snöläger', 'Nov', .55], ['Världscup', 'Dec – feb', .7], ['Vasaloppet', vasa.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }), 1]];
    const nuFas = FAS.reduce((a, f, n) => (andel >= f[2] ? n : a), 0), VIS = [0, .34, .67, 1];
    const nf = Math.min(nuFas, 2), vis = nuFas >= 3 ? 1 : VIS[nf] + (andel - FAS[nf][2]) / (FAS[nf + 1][2] - FAS[nf][2]) * (VIS[nf + 1] - VIS[nf]); // tiden fördelad jämnt över faserna
    return `<section class="kort ls-sasong in" style="--i:${i};--a:${(vis * 100).toFixed(1)}%;--a-tal:${vis.toFixed(3)}">
      <div class="ls-s-topp"><div><span class="ogon utan">Säsongen ${ar - 1}/${String(ar).slice(2)}</span><h3>${FAS[nuFas][0]}</h3><small>Nu: ${e(FAS[nuFas][0].toLowerCase())} · nästa ${e((FAS[nuFas + 1] || FAS[3])[0].toLowerCase())}</small></div>
        <div class="ls-s-ned"><b class="tal" data-rakna="${dgr}">0</b><small>dagar till<br>Vasaloppet</small></div></div>
      <div class="ls-s-bana"><svg viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true"><path class="ls-s-spar" d="M0 30 C60 30 90 12 150 14 C210 16 240 30 300 22"/><path class="ls-s-spar ls-s-spar-klar" pathLength="1" d="M0 30 C60 30 90 12 150 14 C210 16 240 30 300 22"/></svg>
        <span class="ls-s-akare" aria-hidden="true">${ik('skidor')}</span>
        ${FAS.map(([t, u], n) => `<span class="ls-s-fas" data-n="${n}" style="--p:${VIS[n] * 100}%" ${n <= nuFas ? 'data-klar' : ''}><i></i><b>${e(t)}</b><small>${e(u)}</small></span>`).join('')}</div>
      <p class="ls-s-fot">${ik('info')}<span>Säsongens faser och Vasaloppets datum som exempel – landslagets eget program läggs in här.</span></p></section>`;
  }
  function vallaKort(i) {
    const v = st.valla ?? 1, [t, fore, glid, fast, farg] = VALLA[v];
    return `<section class="kort ls-valla in" style="--i:${i};--vf:${farg}"><div class="kort-rubrik"><div><span class="ogon utan">Vallaguiden · före passet</span><h3 style="margin-top:4px">${e(fore)}</h3></div><span class="ls-temp tal">${t > 0 ? '+' : ''}${t}°</span></div>
      <div class="ls-termo" role="group" aria-label="Snötemperatur">${VALLA.map(([x], n) => `<button type="button" data-g="valla" data-v="${n}" aria-pressed="${n === v}"><b class="tal">${x > 0 ? '+' : ''}${x}°</b></button>`).join('')}<span class="ls-termo-markor" style="--n:${v}"></span></div>
      <div class="ls-valla-rad"><div><small>Glid</small><b>${e(glid)}</b></div><div><small>Fäste</small><b>${e(fast)}</b></div></div>
      <p class="ls-valla-fot">${ik('info')}<span>Allmän guide – ert vallateam avgör efter testerna på plats.</span></p></section>`;
  }
  function loppKort(i) {
    const l = loppNu(), s = loppSt(), prog = riegel(basta10(), 10, l.km), under = prog <= s.mal;
    return `<button class="kort lp-kort tryck in" style="--i:${i}" data-g="lopp-ark" aria-label="${e(l.namn)}: mål ${tidText(s.mal)}, prognos ${tidText(prog)}. Öppna rundan och verktygen.">
      <span class="lp-kort-karta" aria-hidden="true">${kartaSvg(l, { spela: false })}</span>
      <span class="lp-kort-text"><span class="ogon utan">Ditt lopp · ${e(l.nar)}</span><b>${e(l.namn)}</b><small>${e(l.typ)} · ${fmt(l.km, 1)} km</small>
        <span class="lp-kort-fart" aria-hidden="true">${FART.map(([, k]) => `<i data-z="${k}"></i>`).join('')}</span>${l.beloningar ? `<span class="lp-kort-bel">${ik('stjarna')}${l.beloningar.length - upplast(l).size} belöningar att låsa upp</span>` : ''}</span>
      <span class="lp-kort-pil" aria-hidden="true">${ik('hoger')}</span>
      <span class="lp-kort-tal"><span><small>Mål</small><b class="tal">${tidText(s.mal)}</b></span><span><small>Prognos</small><b class="tal">${tidText(prog)}</b></span>
        <span data-ton="${under ? 'ok' : 'gul'}"><small>Läge</small><b>${under ? 'Före målet' : 'Efter målet'}</b></span></span></button>`;
  }
  function loppArk(vy = 'karta', { bara = false } = {}) {
    const l = loppNu(), s = loppSt(), v = exempelRunda(l), f = rundaFakta(l, v), prog = riegel(basta10(), 10, l.km), malTempo = s.mal / l.km;
    const flikar = [['karta', 'Rundan'], ['verktyg', 'Verktyg'], ['lopp', 'Lopp']];
    const delar = l.km > 50 ? [20, 45, 70, l.km] : l.km > 20 ? [5, 10, 15, l.km] : l.km > 9 ? [2.5, 5, 7.5, l.km] : [1, 2.5, 4, l.km];
    let inne = '';
    if (vy === 'karta') inne = `
      <div class="lp-kartram"><canvas class="lp-3d" role="img" aria-label="Karta i 3D över ${e(l.namn)} med rundan färgad efter farten"></canvas><div class="lp-live" data-lp-live><b class="tal">${fmt(l.km, 1)}</b><small>km</small><span class="lp-zon">Exempelpass · schematisk bana</span></div>
        <span class="lp-skiss">Schematisk bana</span>${sponsorRemsa(l)}</div>
      <div class="lp-legend">${FART.map(([max, k, t], n) => `<span data-z="${k}"><i></i>${t}<small>${n === 0 ? `< ${FART[0][0]}` : n === 3 ? `${FART[2][0]}+` : `${FART[n - 1][0]}–${max}`} km/h</small></span>`).join('')}</div>
      <button class="knapp knapp-sek knapp-bred lp-spela" data-g="lopp-spela">${ik('spela')}Spela upp rundan</button>
      <dl class="lp-fakta"><div><dt>Tid</dt><dd class="tal">${tidText(f.sek)}</dd></div><div><dt>Snittempo</dt><dd class="tal">${tempoText(f.tempo)}<small>/km</small></dd></div><div><dt>Snabbast</dt><dd class="tal">km ${f.snabb + 1}</dd></div></dl>
      <div class="lp-andel" aria-label="Andel av rundan per fart">${FART.map(([, k, t], n) => `<i data-z="${k}" style="--a:${(f.andel[n] * 100).toFixed(1)}%" title="${t} ${Math.round(f.andel[n] * 100)} %"></i>`).join('')}</div>
      <div class="lp-andel-text">${FART.map(([, k, t], n) => f.andel[n] > 0 ? `<span data-z="${k}"><i></i>${t} ${Math.round(f.andel[n] * 100)} %</span>` : '').join('')}</div>
      <div class="lp-km" aria-label="Fart per kilometer – tryck på en stapel">${f.perKm.map((x, k) => `<i data-z="${fartZon(x)[1]}" data-km="${k + 1}" data-kmh="${fmt(x, 1)}" data-zon="${fartZon(x)[2]}" style="--h:${Math.round(x / 16 * 100)}%;--n:${k}" title="km ${k + 1}: ${fmt(x, 1)} km/h"></i>`).join('')}<span class="lp-km-tips" data-km-tips hidden></span></div>
      <p class="lp-km-axel"><span>km 1</span><span>Fart per kilometer</span><span>km ${fmt(l.km, 1)}</span></p>
      <button class="lp-garmin" data-g="lopp-garmin"><span class="lp-garmin-ikon">${ik('klocka')}</span><span><b>Synka från klockan</b><small>${l.partner?.tid ? `${e(l.partner.tid)} är loppets tidtagningspartner · exempelpass i prototypen` : 'Garmin och andra klockor · exempelpass i prototypen'}</small></span>${ik('hoger')}</button>
      ${beloningHtml(l)}${partnerHtml(l)}`;
    if (vy === 'verktyg') inne = `
      <section class="lp-verktyg"><div class="lp-v-topp"><span class="ikonruta" data-ton="is">${ik('klocka')}</span><div><b>Tempokalkylator</b><small>Välj måltid – appen räknar tempot och delsträckorna</small></div></div>
        <div class="jg-ci"><label for="lp-mal"><span class="jg-ci-namn"><span class="jg-ci-ikon">${ik('mal')}</span>Måltid</span><span class="jg-ci-tal tal" data-lp-maltal>${tidText(s.mal)}</span></label>
          <input class="reglage" id="lp-mal" type="range" min="${Math.round(l.km * (LANDS ? 110 : 180))}" max="${Math.round(l.km * 480)}" step="${l.km > 20 ? 60 : 15}" value="${s.mal}" data-lp-mal></div>
        <div class="lp-tempo"><div><b class="tal" data-lp-tempo>${tempoText(malTempo)}</b><small>min/km</small></div><div><b class="tal" data-lp-kmh>${fmt(l.km / (s.mal / 3600), 1)}</b><small>km/h</small></div></div>
        <ol class="lp-delar" data-lp-delar>${delar.map((d) => `<li><span>${d === l.km ? 'Mål' : `${fmt(d, 1)} km`}</span><b class="tal">${tidText(malTempo * d)}</b></li>`).join('')}</ol></section>
      <section class="lp-verktyg"><div class="lp-v-topp"><span class="ikonruta">${ik('trend')}</span><div><b>Prognos</b><small>Från din bästa 10 km (exempel) med Riegels formel</small></div></div>
        <div class="lp-prognos"><b class="tal">${tidText(prog)}</b><span class="chip" data-ton="${prog <= s.mal ? 'ok' : 'gul'}">${prog <= s.mal ? 'Under målet' : `${tidText(prog - s.mal)} över målet`}</span></div>
        <p class="lp-liten">10 km på ${tidText(basta10())} ger ungefär ${tidText(prog)} på ${e(l.typ.toLowerCase())}. En tumregel – formen och banan avgör.</p></section>
      <section class="lp-verktyg"><div class="lp-v-topp"><span class="ikonruta" data-ton="gul">${ik('trend')}</span><div><b>Höjdprofil</b><small>Där banan går uppför – spara krafterna</small></div></div>
        <svg class="lp-hojd" viewBox="0 0 300 70" aria-hidden="true"><path d="${Array.from({ length: 61 }, (_, i) => { const t = i / 60, b = l.backar.find(([a, c]) => t >= a - .03 && t <= c + .03); const h = 52 - (b ? Math.sin(Math.min(1, Math.max(0, (t - b[0] + .03) / (b[1] - b[0] + .06))) * Math.PI) * 34 : Math.sin(i * .9) * 3); return `${i ? 'L' : 'M'}${(t * 300).toFixed(1)} ${h.toFixed(1)}`; }).join(' ')} L300 70 L0 70 Z"/></svg>
        <p class="lp-liten">${l.backar.length ? `${l.backar.length} ${l.backar.length === 1 ? 'stigning' : 'stigningar'} – gå gärna ner i tempo där och ta igen på nedförslöpan.` : 'Platt bana – jämnt tempo hela vägen.'} Schematisk.</p></section>
      <section class="lp-verktyg"><div class="lp-v-topp"><span class="ikonruta" data-ton="ok">${ik('kalender')}</span><div><b>Förbered dig i schemat</b><small>Ett långpass på söndagar och ett tempopass på torsdagar</small></div></div>
        <button class="knapp knapp-primar knapp-bred" data-g="lopp-schema">${ik('kalender')}Lägg in i träningsschemat</button></section>`;
    if (vy === 'lopp') inne = `<p class="jg-ark-ingress">Välj loppet du siktar på. Datum och anmälan hittar du hos arrangören.</p>
      <div class="lp-lista">${LOPP.map((x, n) => `<button class="lp-rad" data-g="lopp-val" data-v="${x.id}" aria-pressed="${x.id === l.id}" style="--n:${n}"><span class="lp-rad-karta" aria-hidden="true">${kartaSvg(x, { spela: false })}</span>
        <span class="lp-rad-text"><b>${e(x.namn)}</b><small>${e(x.stad)} · ${e(x.typ)} · ${e(x.nar)}</small></span><span class="bock">${ik('bock')}</span></button>`).join('')}</div>`;
    const ni0 = bara && !arkLager.hidden ? $('.ark .lp-inne', arkLager) : null;
    if (ni0) { ni0.dataset.vy = vy; ni0.innerHTML = inne; delete ni0.dataset.gar; ni0.style.animation = 'none'; void ni0.offsetWidth; ni0.style.animation = ''; forbered(ni0); return loppEfter($('.ark', arkLager), true); }
    ark(`<div class="ark-rubrik jg-ark-rubrik"><span class="ikonruta" data-ton="is">${ik('plats')}</span><div><span class="ogon utan">${e(l.stad)} · ${e(l.nar)}</span><h2>${e(l.namn)}</h2></div><button class="ikonknapp" data-stang-ark aria-label="Stäng">${ik('stang')}</button></div>
      <div class="segment lp-segment" role="tablist"><span class="segment-markor"></span>${flikar.map(([k, t]) => `<button type="button" role="tab" data-g="lopp-flik" data-v="${k}" aria-pressed="${vy === k}">${t}</button>`).join('')}</div>
      <div class="lp-inne" data-vy="${vy}">${inne}</div>`,
    { efter: (a) => loppEfter(a, false) });
    function loppEfter(a, bara0) {
      const km = $('.lp-km', a); if (km && !km.dataset.kopplad) { km.dataset.kopplad = '';
        const visaKm = (st0) => { if (!st0?.dataset.km) return; $$('i', km).forEach((x) => x.toggleAttribute('data-vald', x === st0)); const tip = $('[data-km-tips]', km);
          tip.innerHTML = `<b>km ${st0.dataset.km}</b> · ${st0.dataset.kmh} km/h · ${st0.dataset.zon}`; tip.hidden = false; tip.dataset.z = st0.dataset.z;
          const kb = km.getBoundingClientRect(), sb = st0.getBoundingClientRect(); tip.style.setProperty('--x', `${Math.min(kb.width - 70, Math.max(70, sb.left - kb.left + sb.width / 2))}px`); };
        km.addEventListener('pointerdown', (ev) => visaKm(ev.target.closest('i')));
        km.addEventListener('pointermove', (ev) => { if (ev.buttons || ev.pointerType === 'mouse') visaKm(document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.lp-km i')); });
        km.addEventListener('pointerleave', () => { $$('i', km).forEach((x) => x.removeAttribute('data-vald')); const tip = $('[data-km-tips]', km); if (tip) tip.hidden = true; }); } if (!bara0) { const sg = $('.lp-segment', a), mk = $('.segment-markor', sg); mk.style.transition = 'none'; segmentMarkor(sg); void mk.offsetWidth; mk.style.transition = ''; } cancelAnimationFrame(spokRaf); karta3dNu?.stopp(); karta3dNu = null; const cv3 = $('.lp-3d', a); if (cv3) karta3dNu = karta3d(cv3, l, v); const svg = $('.lp-kartram .lp-karta', a);
      if (svg) { fargaRunda(svg, v); const p = $('[data-lp-bana]', svg), pt = p.getPointAtLength(0); $('[data-lp-spok]', svg)?.setAttribute('transform', `translate(${pt.x} ${pt.y})`); }
      $$('.lp-kort-karta .lp-karta, .lp-rad-karta .lp-karta', a).forEach((x) => fargaRunda(x, exempelRunda(LOPP.find((y) => x.getAttribute('aria-label').includes(y.namn)) || l)));
      const r = $('[data-lp-mal]', a); if (r) { reglageFarg(r); r.addEventListener('input', () => { reglageFarg(r); const m = +r.value, tp = m / l.km; s.mal = m; spara();
        $('[data-lp-maltal]', a).textContent = tidText(m); $('[data-lp-tempo]', a).textContent = tempoText(tp); $('[data-lp-kmh]', a).textContent = fmt(l.km / (m / 3600), 1);
        $('[data-lp-delar]', a).innerHTML = delar.map((d) => `<li><span>${d === l.km ? 'Mål' : `${fmt(d, 1)} km`}</span><b class="tal">${tidText(tp * d)}</b></li>`).join(''); }); } }
  }

  /* ---- 12d kartan i 3D: lutad kamera, byggnader, vatten, parker, gator och rundan som upphöjt band (canvas 2D, egen projektion) ---- */
  // Punkter längs en SVG-väg (mäts i en dold svg – getPointAtLength kräver att vägen sitter i dokumentet).
  let matSvg = null;
  function vagPunkter(d, n) {
    if (!matSvg) { matSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); matSvg.setAttribute('aria-hidden', 'true'); matSvg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; document.body.appendChild(matSvg); }
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); matSvg.appendChild(p);
    const L = p.getTotalLength(), ut = Array.from({ length: n }, (_, i) => { const q = p.getPointAtLength(L * i / (n - 1)); return [q.x, q.y]; }); p.remove(); return ut;
  }
  const FARG_HEX = () => (document.body.dataset.niva === 'motionar' ? { gar: '#5a9be0', jogg: '#22b58d', spring: '#e7a522', tar: '#e0603f' } : { gar: '#8fc3f7', jogg: '#6fdcbc', spring: '#f3c35a', tar: '#f08a6c' });
  function karta3d(cv, l, v) {
    const ljus = document.body.dataset.niva === 'motionar', F = FARG_HEX();
    const P = ljus ? { mark: '#e6eae4', mark2: '#dde3dc', vatten: '#9ec6ea', vattenKant: '#bcd8f1', park: '#bcdcb4', gata: '#ffffff', gataStor: '#ffffff', tak: '#f7f8f6', sidaA: '#d4dad6', sidaB: '#c3cbc7', text: '#20303c', textKant: 'rgba(255,255,255,.9)', fonster: null, dimma: 'rgba(238,241,236,' }
      : { mark: '#152230', mark2: '#111c28', vatten: '#173450', vattenKant: '#21476b', park: '#1d3a2e', gata: 'rgba(255,255,255,.07)', gataStor: 'rgba(255,255,255,.12)', tak: '#24384a', sidaA: '#1a2b3b', sidaB: '#132231', text: '#e8eef2', textKant: 'rgba(11,21,32,.9)', fonster: 'rgba(255,214,140,', dimma: 'rgba(14,24,34,' };
    const rutt = vagPunkter(l.bana, v.length + 1), vatten = l.vatten ? vagPunkter(l.vatten, 90) : null;
    const gator = GATOR_D.map((d, i) => ({ p: vagPunkter(d, 40), stor: i % 3 === 0 }));
    const nara = (x, y, r) => rutt.some(([a, b]) => (a - x) ** 2 + (b - y) ** 2 < r * r);
    const iVatten = (x, y) => { if (!vatten) return false; let inne = false; for (let i = 0, j = vatten.length - 1; i < vatten.length; j = i++) { const [xi, yi] = vatten[i], [xj, yj] = vatten[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inne = !inne; } return inne; };
    const iPark = (x, y) => (l.parker || []).some(([px, py, rx, ry]) => ((x - px) / rx) ** 2 + ((y - py) / ry) ** 2 < 1.15);
    // Byggnader: kvarteren som lådor med höjd – inte där banan, vattnet eller parkerna går
    const hus = []; for (let i = 0; i < 80; i++) { const x = (i % 10) * 34 + 6 + ((i * 7) % 9), y = Math.floor(i / 10) * 31 + 4 + ((i * 11) % 7), w = 14 + (i * 5) % 10, d = 13 + (i * 3) % 9;
      const cx = x + w / 2, cy = y + d / 2; if (nara(cx, cy, 17) || iVatten(cx, cy) || iPark(cx, cy) || x + w > 336 || y + d > 246) continue; hus.push({ x, y, w, d, h: 5 + ((i * 37) % 23) * (Math.abs(cx - 170) < 90 ? 1.2 : .7), f: (i * 13) % 7 }); }
    let W = 0, H = 0, dpr = 1, raf = 0, t0 = performance.now(), spel = null, cam = { yaw: -.32, tilt: .2 };
    const bel = (l.beloningar || []).map((b) => { const t = belT(l, b), i = Math.min(rutt.length - 1, Math.round(t * (rutt.length - 1))), img = new Image(); if (PARTNER_LOGGA[b.partner]) img.src = PARTNER_LOGGA[b.partner]; return { b, t, p: rutt[i], img }; });
    const g = cv.getContext('2d');
    const storlek = () => { dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
    storlek();
    // Projektion: banan i kartans enheter (340 × 250, mitten 170,125), höjd uppåt. Kameran lutar (tilt) och vrider sig (yaw).
    const proj = (x, y, h = 0) => { const X = x - 170, Z = y - 125, c = Math.cos(cam.yaw), s = Math.sin(cam.yaw), xr = X * c - Z * s, zr = X * s + Z * c;
      const ct = Math.cos(cam.tilt), st = Math.sin(cam.tilt), D = 430, djup = D - zr * st - h * ct, f = W * .98 * D / 340;
      return [W / 2 + f * xr / djup, H * .56 + f * (zr * ct - h * st) / djup, djup, f / djup]; };
    const poly = (pts, h = 0) => { g.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = proj(x, y, h); i ? g.lineTo(a, b) : g.moveTo(a, b); }); };
    function rita(nu0) { try { ritaNu(nu0); } catch (err) { /* en enstaka bild får hellre utebli än att animeringen stannar */ } }
    function ritaNu(nu0) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      // marken med en mjuk ton mot horisonten
      poly([[-60, -60], [400, -60], [400, 310], [-60, 310]]); const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, P.mark2); gr.addColorStop(1, P.mark); g.fillStyle = gr; g.fill();
      (l.parker || []).forEach(([px, py, rx, ry]) => { poly(Array.from({ length: 28 }, (_, i) => [px + Math.cos(i / 28 * 6.283) * rx, py + Math.sin(i / 28 * 6.283) * ry])); g.fillStyle = P.park; g.fill(); });
      if (vatten) { poly(vatten); g.fillStyle = P.vatten; g.fill(); g.strokeStyle = P.vattenKant; g.lineWidth = 2; g.stroke();
        // ljusglitter på vattnet som rör sig
        g.save(); poly(vatten); g.clip(); g.globalAlpha = ljus ? .35 : .25; g.strokeStyle = '#fff'; g.lineWidth = 1;
        for (let k = 0; k < 9; k++) { const x0 = ((k * 47 + nu0 / 90) % 380) - 20, y0 = 112 + (k % 3) * 9; const [a, b] = proj(x0, y0), [c2, d2] = proj(x0 + 14, y0 + 1); g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d2); g.stroke(); } g.restore(); }
      gator.forEach(({ p, stor }) => { g.beginPath(); p.forEach(([x, y], i) => { const [a, b] = proj(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.strokeStyle = stor ? P.gataStor : P.gata; g.lineWidth = (stor ? 4.5 : 2.4) * proj(170, 125)[3] * 1.4; g.lineCap = 'round'; g.stroke(); });
      // rundans skugga på marken
      g.beginPath(); rutt.forEach(([x, y], i) => { const [a, b] = proj(x + 1.5, y + 2); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.strokeStyle = ljus ? 'rgba(24,54,83,.18)' : 'rgba(0,0,0,.45)'; g.lineWidth = 7; g.lineJoin = 'round'; g.stroke();
      // byggnader bakifrån och fram, sidorna skuggade efter kamerans vinkel
      g.fillStyle = ljus ? 'rgba(24,54,83,.1)' : 'rgba(0,0,0,.28)'; for (const b of hus) { const o = b.h * .45; poly([[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w + o, b.y + b.d + o * .6], [b.x + o, b.y + b.d + o * .6]]); g.fill(); }
      const sorterade = hus.map((b) => ({ b, d: proj(b.x + b.w / 2, b.y + b.d / 2)[2] })).sort((a, b) => b.d - a.d);
      for (const { b } of sorterade) { const c = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.d], [b.x, b.y + b.d]];
        for (let k = 0; k < 4; k++) { const [x1, y1] = c[k], [x2, y2] = c[(k + 1) % 4], m1 = proj(x1, y1), m2 = proj(x2, y2), t1 = proj(x1, y1, b.h), t2 = proj(x2, y2, b.h);
          const normal = (m2[0] - m1[0]) * (t1[1] - m1[1]) - (m2[1] - m1[1]) * (t1[0] - m1[0]); if (normal > 0) continue;
          g.beginPath(); g.moveTo(m1[0], m1[1]); g.lineTo(m2[0], m2[1]); g.lineTo(t2[0], t2[1]); g.lineTo(t1[0], t1[1]); g.closePath(); g.fillStyle = k % 2 ? P.sidaA : P.sidaB; g.fill();
          if (P.fonster && b.h > 9) { g.fillStyle = `${P.fonster}${.35 + (b.f % 3) * .15})`; for (let r = 1; r < b.h / 4; r++) for (let q = 1; q < 4; q++) { if ((r * 7 + q * 3 + b.f) % 4) continue; const u = q / 4, hh = r * 4, [wx, wy] = proj(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, hh); g.fillRect(wx - .7, wy - .7, 1.4, 1.4); } } }
        poly(c, b.h); g.fillStyle = P.tak; g.fill(); }
      // rundan: upphöjt band i fartens färger, det som inte är sprunget (under uppspelning) dämpat
      const sp = spel ? Math.min(1, (nu0 - spel.t0) / spel.T) : 1, slut = Math.floor(sp * v.length);
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const pass of [0, 1]) for (let i = 0; i < v.length; i++) { const p1 = rutt[i], p2 = rutt[i + 1] || p1, [a, b] = proj(p1[0], p1[1], 1.6), [c2, d2] = proj(p2[0], p2[1], 1.6), z = fartZon(v[i])[1], s0 = proj(p1[0], p1[1])[3];
        g.globalAlpha = (i < slut ? 1 : .16) * (pass ? 1 : ljus ? .22 : .35); g.strokeStyle = F[z]; g.lineWidth = pass ? Math.max(2, 3.6 * s0 * 1.3) : Math.max(6, 11 * s0 * 1.3); g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d2); g.stroke(); }
      g.globalAlpha = 1;
      // ett ljus som löper längs banan när den inte spelas upp
      if (!spel && !lugn) { const k = Math.floor(((nu0 / 5200) % 1) * v.length); for (let j = 0; j < 6; j++) { const i = (k - j + v.length) % v.length, p2 = rutt[i + 1] || rutt[i], [a, b] = proj(rutt[i][0], rutt[i][1], 1.8), [c2, d2] = proj(p2[0], p2[1], 1.8);
        g.globalAlpha = (1 - j / 6) * .85; g.strokeStyle = '#fff'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d2); g.stroke(); } g.globalAlpha = 1; }
      // belöningarna: en nål med partnerns logga i en vit bricka – låst = grå med lås, upplåst = mint med glöd
      const ul = upplast(l);
      for (const x of bel.slice().sort((a, b) => proj(b.p[0], b.p[1])[2] - proj(a.p[0], a.p[1])[2])) { const ok = ul.has(x.b.id), [a, b] = proj(x.p[0], x.p[1], 1.6), [c2, d2] = proj(x.p[0], x.p[1], 36), rr = 14;
        if (ok) { const gl = g.createRadialGradient(c2, d2, 0, c2, d2, 26); gl.addColorStop(0, 'rgba(126,224,195,.55)'); gl.addColorStop(1, 'rgba(126,224,195,0)'); g.fillStyle = gl; g.beginPath(); g.arc(c2, d2, 26, 0, 6.283); g.fill(); }
        g.strokeStyle = ok ? '#7ee0c3' : (ljus ? 'rgba(11,21,32,.35)' : 'rgba(255,255,255,.35)'); g.lineWidth = 1.4; g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d2 + rr); g.stroke();
        g.beginPath(); g.arc(c2, d2, rr, 0, 6.283); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2; g.strokeStyle = ok ? '#2fbf95' : (ljus ? 'rgba(11,21,32,.18)' : 'rgba(255,255,255,.5)'); g.stroke();
        if (x.img.complete && x.img.naturalWidth) { const iw = x.img.naturalWidth, ih = x.img.naturalHeight, sk = Math.min(21 / iw, 12 / ih); g.globalAlpha = ok ? 1 : .45; g.drawImage(x.img, c2 - iw * sk / 2, d2 - ih * sk / 2, iw * sk, ih * sk); g.globalAlpha = 1; }
        if (!ok) { const lx = c2 + 11, ly = d2 - 11; g.beginPath(); g.arc(lx, ly, 6.5, 0, 6.283); g.fillStyle = ljus ? '#5f6a76' : '#2a3b4c'; g.fill(); g.fillStyle = '#fff'; g.fillRect(lx - 2.6, ly - .4, 5.2, 4); g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.beginPath(); g.arc(lx, ly - .6, 1.9, Math.PI, 0); g.stroke(); }
        else { const lx = c2 + 11, ly = d2 - 11; g.beginPath(); g.arc(lx, ly, 6.5, 0, 6.283); g.fillStyle = '#2fbf95'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(lx - 3, ly); g.lineTo(lx - 1, ly + 2.2); g.lineTo(lx + 3.2, ly - 2.4); g.stroke(); } }
      // nålar för platserna – start och mål med pulserande ring på marken
      l.platser.forEach(([x, y, t, s]) => { const start = s === 'b', [a, b] = proj(x, y), [c2, d2] = proj(x, y, start ? 22 : 16);
        if (start) { const fas = ((nu0 / 2200) % 1); poly(Array.from({ length: 24 }, (_, i) => [x + Math.cos(i / 24 * 6.283) * (4 + fas * 16), y + Math.sin(i / 24 * 6.283) * (4 + fas * 16)])); g.strokeStyle = `rgba(126,224,195,${(1 - fas) * .8})`; g.lineWidth = 2; g.stroke(); }
        g.strokeStyle = ljus ? 'rgba(11,21,32,.45)' : 'rgba(255,255,255,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d2); g.stroke();
        g.beginPath(); g.arc(c2, d2, start ? 5 : 3.6, 0, 6.283); g.fillStyle = start ? '#7ee0c3' : (ljus ? '#fff' : '#e8eef2'); g.fill(); g.lineWidth = 1.6; g.strokeStyle = start ? '#0b1520' : (ljus ? '#20303c' : '#0b1520'); g.stroke();
        g.font = `600 ${start ? 10.5 : 10}px Manrope, system-ui, sans-serif`; const tw = g.measureText(t).width, tx = Math.min(W - 8 - tw / 2, Math.max(8 + tw / 2, c2)); g.textAlign = 'center'; g.lineWidth = 3.4; g.lineJoin = 'round'; g.strokeStyle = P.textKant; g.strokeText(t, tx, d2 - 9); g.fillStyle = P.text; g.fillText(t, tx, d2 - 9); });
      // löparen under uppspelningen – belöningar som passeras låses upp
      if (spel) { for (const x of bel) if (sp >= x.t - .001 && !spel.passerat.has(x.b.id)) { spel.passerat.add(x.b.id); if (lasUpp(l, x.b)) visaUpplast(l, x.b); } const i = Math.min(v.length - 1, slut), q = (sp * v.length) - i, x = rutt[i][0] + (rutt[Math.min(i + 1, v.length)][0] - rutt[i][0]) * q, y = rutt[i][1] + (rutt[Math.min(i + 1, v.length)][1] - rutt[i][1]) * q, z = fartZon(v[i]), [a, b] = proj(x, y, 2.5);
        const glod = g.createRadialGradient(a, b, 0, a, b, 16); glod.addColorStop(0, F[z[1]]); glod.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glod; g.globalAlpha = .7; g.beginPath(); g.arc(a, b, 16, 0, 6.283); g.fill(); g.globalAlpha = 1;
        g.beginPath(); g.arc(a, b, 5, 0, 6.283); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = F[z[1]]; g.stroke();
        spel.info && (spel.info.innerHTML = `<b class="tal">${fmt(sp * l.km, 1)}</b><small>km</small><span class="lp-zon" data-z="${z[1]}">${z[2]} · ${fmt(v[i], 1)} km/h</span>`);
        if (sp >= 1) { const k = spel.knapp; spel = null; if (k) k.innerHTML = `${ik('spela')}Spela upp igen`; } }
      // dimma mot horisonten
      const dm = g.createLinearGradient(0, 0, 0, H * .35); dm.addColorStop(0, `${P.dimma}1)`); dm.addColorStop(1, `${P.dimma}0)`); g.fillStyle = dm; g.fillRect(0, 0, W, H * .35);
    }
    function steg(nu0) {
      if (!cv.isConnected || arkLager.hidden) { ro.disconnect(); raf = 0; return; } const t = (nu0 - t0) / 1000, e0 = Math.min(1, t / 1.8), ease = 1 - (1 - e0) ** 3;
      cam.tilt = .2 + ease * .78; cam.yaw = -.32 + ease * .2 + (lugn ? 0 : Math.sin(t * .16) * .2);
      rita(nu0); if (!lugn || spel || e0 < 1) raf = requestAnimationFrame(steg);
    }
    if (lugn) { cam.tilt = .98; cam.yaw = -.12; rita(performance.now()); } else raf = requestAnimationFrame(steg);
    const ro = new ResizeObserver(() => { storlek(); if (lugn) rita(performance.now()); }); ro.observe(cv);
    return { spela(knapp, info) { spel = { t0: performance.now(), T: lugn ? 1 : 9000, knapp, info, passerat: new Set() }; if (knapp) knapp.innerHTML = `${ik('klocka')}Spelar upp …`; if (lugn) { spel.t0 -= 1; rita(performance.now()); } else if (!raf) raf = requestAnimationFrame(steg); },
      stopp() { cancelAnimationFrame(raf); ro.disconnect(); } };
  }
  let karta3dNu = null;

  /* ---- 13 arken ---- */
  const arkLager = $('#ark');
  let arkOppnat = 0; // klicket som följer ett tryck (pekskärm) får inte stänga arket som trycket öppnade
  function ark(html, { efter } = {}) {
    arkOppnat = performance.now(); clearTimeout(stangArk.t);
    const a = $('.ark', arkLager), byte = !arkLager.hidden && !arkLager.hasAttribute('data-stanger'); // ett ark som ersätter ett öppet ark glider inte upp igen
    $('.ark-innehall', arkLager).innerHTML = html;
    $$('.ark-innehall > .ark-handtag', arkLager).forEach((h) => h.remove()); // arket har redan ett handtag
    a.style.transform = ''; a.style.transition = ''; $('.ark-sloja', arkLager).style.opacity = ''; a.scrollTop = 0;
    if (!byte) { a.style.animation = 'none'; void a.offsetWidth; a.style.animation = ''; }
    arkLager.hidden = false; delete arkLager.dataset.stanger; delete arkLager.dataset.dragen; app.dataset.arkOppet = '';
    forbered(arkLager); efter && efter(a);
    setTimeout(() => a.querySelector('button:not([data-stang-ark]), input, button')?.focus({ preventScroll: true }), 380);
  }
  // Stängs neråt från där arket står (även mitt i ett drag); slöjan tonar ut i samma takt.
  function stangArk() {
    if (arkLager.hidden || arkLager.hasAttribute('data-stanger')) return;
    arkLager.dataset.stanger = ''; delete arkLager.dataset.dragen; delete app.dataset.arkOppet;
    clearTimeout(stangArk.t);
    stangArk.t = setTimeout(() => { arkLager.hidden = true; delete arkLager.dataset.stanger; const a = $('.ark', arkLager); a.style.transform = ''; a.style.transition = ''; $('.ark-sloja', arkLager).style.opacity = ''; }, lugn ? 0 : 340);
  }
  const TYPER = ['Värk', 'Stelhet', 'Hugg', 'Domning', 'Svullnad'], SEDAN = ['Idag', 'Några dagar', '1–2 veckor', 'Mer än 2 veckor'];
  function ontArk(id, { fraga: iFraga = false } = {}) {
    const lista = iFraga ? st.svar.ont : st.profil.ont;
    const z = lista.find((x) => x.id === id) || { id, niva: 4, typ: 'Värk', sedan: 'Några dagar' };
    kropp?.markera?.(id);
    // Nivån: stort tal + ord i nivåns färg, reglaget med en skala 0–10 under; typ och "sedan när" i jämna rutnät (5 och 2 × 2).
    ark(`<div class="ark-rubrik"><span class="ikonruta" data-ton="rod">${ik('plaster')}</span><div><span class="ogon utan">${iFraga ? 'Ont' : 'Ont · smärtdagbok'}</span><h2>${e(regionNamn(id))}</h2></div>
        <button class="ikonknapp" data-stang-ark aria-label="Stäng">${ik('stang')}</button></div>
      <div class="ark-falt kv-niva-falt"><span class="etikett">Hur ont gör det?</span>
        <div class="kv-niva-visning" data-ton="${nivaTon(z.niva)}"><div class="stor-niva tal" data-niva-tal>${z.niva}<small>/10</small></div><span class="kv-niva-ord" data-niva-ord>${NIVA_ORD(z.niva)}</span></div>
        <input class="reglage" data-varm type="range" min="0" max="10" step="1" value="${z.niva}" data-ont-niva aria-label="Smärtnivå 0 till 10">
        <div class="kv-skala" aria-hidden="true">${Array.from({ length: 11 }, (_, n) => `<i${n % 5 ? '' : ' data-tal'}>${n % 5 ? '' : n}</i>`).join('')}</div>
        <div class="kv-skala-ord" aria-hidden="true"><span>Inget</span><span>Värsta tänkbara</span></div></div>
      <div class="ark-falt"><span class="etikett">Hur känns det?</span><div class="kv-val kv-val-5">${TYPER.map((t) => `<button class="chip chip-val" data-g="ont-val" data-falt="typ" data-v="${t}" aria-pressed="${z.typ === t}">${t}</button>`).join('')}</div></div>
      <div class="ark-falt"><span class="etikett">Sedan när?</span><div class="kv-val kv-val-2">${SEDAN.map((t) => `<button class="chip chip-val" data-g="ont-val" data-falt="sedan" data-v="${t}" aria-pressed="${z.sedan === t}">${t}</button>`).join('')}</div></div>
      ${!iFraga && elit() ? `<div class="ark-falt"><div class="dela-rad kv-skada"><span class="ikonruta" data-ton="rod">${ik('plaster')}</span><div><b>Registrera som skada</b><small>Skaderegistret · varning efter 14 dagar</small></div><button class="vaxel" role="switch" aria-checked="${!!st.skador.find((s) => s.region === id && !s.slut)}" data-g="ont-skada" aria-label="Registrera som skada"></button></div></div>` : ''}
      <div class="ark-knappar"><button class="knapp knapp-primar knapp-bred" data-g="ont-spara" data-id="${id}" data-fraga="${iFraga ? 1 : 0}">Spara ${ik('bock')}</button>
        ${lista.find((x) => x.id === id) ? `<button class="knapp knapp-text" data-g="ont-ta-bort" data-id="${id}" data-fraga="${iFraga ? 1 : 0}">Inget ont här längre</button>` : ''}</div>
      ${z.niva >= 7 || z.sedan === 'Mer än 2 veckor' ? `<div class="notis kv-ark-notis">${ik('info')}<span>Har det gjort ont länge eller är det starkt? Kontakta vården – appen ställer ingen diagnos.</span></div>` : ''}
      ${!iFraga && lista.find((x) => x.id === id) ? planHtml({ id, z }) : ''}`,
    { efter: (a) => { a.dataset.typ = z.typ; a.dataset.sedan = z.sedan;
      const r = $('[data-ont-niva]', a), t = $('[data-niva-tal]', a), o = $('[data-niva-ord]', a), vis = $('.kv-niva-visning', a);
      r.addEventListener('input', () => { reglageFarg(r); const n = +r.value; t.innerHTML = `${n}<small>/10</small>`; o.textContent = NIVA_ORD(n); vis.dataset.ton = nivaTon(n); }); } });
  }
  const CHECKIN = [['somn', 'Sömn', 'mane', 'Hur sov du?', 'Dåligt', 'Mycket bra'], ['energi', 'Energi', 'batteri', 'Hur mycket energi har du?', 'Slut', 'Full'], ['omhet', 'Ömhet', 'kropp', 'Hur öm är kroppen?', 'Inte alls', 'Mycket'],
    ['stress', 'Stress', 'vag', 'Hur stressad känner du dig?', 'Lugn', 'Mycket'], ['humor', 'Humör', 'leende', 'Hur är humöret?', 'Lågt', 'Toppen']];
  function checkinArk() {
    const c = senasteCheckin() || { somn: 7, energi: 7, omhet: 3, stress: 4, humor: 7 };
    const df = dagsform(c);
    ark(`<div class="ark-rubrik jg-ark-rubrik"><span class="ikonruta">${ik('puls')}</span><div><span class="ogon utan">Check-in · 30 sekunder</span><h2>Hur mår du idag?</h2></div><button class="ikonknapp" data-stang-ark aria-label="Stäng">${ik('stang')}</button></div>
      <div class="jg-ci-summa" aria-live="polite"><div><span class="jg-etikett">Dagsform</span><b class="tal" data-ci-summa>${df}</b></div><div class="matare"><i data-ci-matare style="--v:${df}%"></i></div></div>
      ${CHECKIN.map(([k, t, i, f, l, h], n) => `<div class="ark-falt jg-ci" style="--n:${n}"><label for="ci-${k}"><span class="jg-ci-namn"><span class="jg-ci-ikon">${ik(i)}</span>${t}</span><span class="jg-ci-tal tal" data-ci-tal="${k}">${c[k]}<small>/10</small></span></label>
        <input class="reglage" id="ci-${k}" type="range" min="1" max="10" value="${c[k]}" data-ci="${k}" ${k === 'omhet' || k === 'stress' ? 'data-varm' : ''} aria-label="${f}"><div class="jg-ci-skala"><span>${l}</span><span>${h}</span></div></div>`).join('')}
      <div class="ark-knappar"><button class="knapp knapp-primar knapp-bred" data-g="checkin-spara">Spara check-in ${ik('bock')}</button></div>`,
    { efter: (a) => $$('[data-ci]', a).forEach((r) => r.addEventListener('input', () => { reglageFarg(r); $(`[data-ci-tal="${r.dataset.ci}"]`, a).innerHTML = `${r.value}<small>/10</small>`;
      const v = {}; $$('[data-ci]', a).forEach((x) => { v[x.dataset.ci] = +x.value; }); const d = dagsform(v); $('[data-ci-summa]', a).textContent = d; $('[data-ci-matare]', a).style.setProperty('--v', `${d}%`); })) });
  }
  const PASSTYPER = () => (LANDS ? (elit() ? ['Klassiskt', 'Skate', 'Rullskidor', 'Intervaller', 'Styrka', 'Tävling'] : ['Klassiskt', 'Skate', 'Rullskidor', 'Löpning', 'Styrka', 'Annat'])
    : elit() ? ['Lagträning', 'Match', 'Styrka', 'Löpning', 'Återhämtning', 'Annat'] : ['Promenad', 'Löpning', 'Styrka', 'Cykel', 'Simning', 'Annat']);
  function passArk({ typ = null, min = 60, plan = false, rubrik = 'Logga ett pass' } = {}) {
    const typer = typ && !PASSTYPER().includes(typ) ? [typ, ...PASSTYPER()] : PASSTYPER(), forval = typ || typer[0], rpe0 = 6;
    ark(`<div class="ark-rubrik jg-ark-rubrik"><span class="ikonruta" data-ton="is">${ik(typ ? typIkon(typ) : elit() ? 'boll' : 'sko')}</span><div><span class="ogon utan">${plan ? 'Från schemat' : elit() ? 'Aktivitetsregistrering' : 'Rörelse'}</span><h2>${rubrik}</h2></div><button class="ikonknapp" data-stang-ark aria-label="Stäng">${ik('stang')}</button></div>
      <div class="ark-falt"><span class="etikett">Typ</span><div class="jg-typer">${typer.map((t, i) => `<button class="chip chip-val" style="--n:${i}" data-g="pass-typ" data-v="${t}" aria-pressed="${t === forval}">${t}</button>`).join('')}</div></div>
      <div class="ark-falt jg-ci"><label for="pass-min"><span class="jg-ci-namn"><span class="jg-ci-ikon">${ik('kalender')}</span>Tid</span><span class="jg-ci-tal tal" data-pass-min-tal>${min}<small> min</small></span></label><input class="reglage" id="pass-min" type="range" min="10" max="150" step="5" value="${min}" data-pass-min>
        <div class="jg-ci-skala"><span>10 min</span><span>150 min</span></div></div>
      <div class="ark-falt jg-ci"><label for="pass-rpe"><span class="jg-ci-namn"><span class="jg-ci-ikon">${ik('puls')}</span>Ansträngning (RPE)</span><span class="jg-ci-tal tal" data-pass-rpe-tal>6<small>/10</small></span></label><input class="reglage" data-varm id="pass-rpe" type="range" min="1" max="10" value="6" data-pass-rpe>
        <div class="jg-ci-skala"><span>Mycket lätt</span><span>Maximal</span></div></div>
      <div class="jg-au"><div><span class="jg-etikett">Belastning</span><b class="tal"><span data-pass-au>${min * rpe0}</span><small> AU</small></b></div><span class="jg-au-text">minuter × RPE${elit() ? '<br>räknas in i akut:kronisk belastning' : ''}</span></div>
      <div class="ark-knappar"><button class="knapp knapp-primar knapp-bred" data-g="pass-spara" ${plan ? 'data-plan="1"' : ''}>${plan ? 'Checka in' : 'Spara passet'} ${ik('bock')}</button></div>`,
    { efter: (a) => { a.dataset.typ = forval; reglageFarg($('[data-pass-min]', a)); reglageFarg($('[data-pass-rpe]', a)); const m = $('[data-pass-min]', a), r = $('[data-pass-rpe]', a);
      const upd = () => { reglageFarg(m); reglageFarg(r); $('[data-pass-min-tal]', a).innerHTML = `${m.value}<small> min</small>`; $('[data-pass-rpe-tal]', a).innerHTML = `${r.value}<small>/10</small>`; $('[data-pass-au]', a).textContent = m.value * r.value; };
      m.addEventListener('input', upd); r.addEventListener('input', upd); } });
  }
  function loggaArk() {
    const ds = dagStr(idag()), ci = st.checkin.find((x) => x.datum === ds), pass = st.pass.filter((x) => x.datum === ds);
    const plan0 = planFor(idag()), visaPlan = plan0 && !pass.length && !hoppad(ds);
    const val = [...(visaPlan ? [['ts-checka', typIkon(plan0.typ), 'ok', 'Checka in dagens pass', `${plan0.typ} · ${plan0.min} min kl ${plan0.tid}`, false]] : []), ['checkin', 'puls', '', 'Check-in', ci ? `Gjord · dagsform ${dagsform(ci)}` : 'Sömn, energi, ömhet', !!ci],
      ['pass-ny', elit() ? 'boll' : 'sko', 'is', elit() ? 'Träning eller match' : 'Träningspass', pass.length ? `${pass.length} idag · ${pass.reduce((s, x) => s + x.min, 0)} min` : 'Tid och ansträngning', pass.length > 0],
      ['lopp-ark', 'plats', 'is', 'Lopp och rundor', `${loppNu().namn} · rundan på karta`, false], ['ont-ny', 'plaster', 'rod', elit() ? 'Ont eller skada' : 'Ont någonstans', 'Tryck på kroppen', false],
      ...(visaPlan ? [] : [['screening-boka', 'dokument', 'gul', 'Förscreening', 'Inför testdagen', false]])];
    ark(`<div class="ark-rubrik jg-ark-rubrik"><span class="ikonruta">${ik('plus')}</span><div><span class="ogon utan">Logga</span><h2>Vad vill du lägga in?</h2></div><button class="ikonknapp" data-stang-ark aria-label="Stäng">${ik('stang')}</button></div>
      <div class="snabbval jg-snabbval">${val.map(([g, i, ton, t, u, klar], n) => `<button data-g="${g}" style="--n:${n}" ${klar ? 'data-klar' : ''}><span class="jg-sv-topp"><span class="ikonruta" data-ton="${ton}">${ik(i)}</span><span class="jg-sv-pil">${ik(klar ? 'bock' : 'pil')}</span></span><span><b>${t}</b><small>${e(u)}</small></span></button>`).join('')}</div>`);
  }

  /* ---- 14 händelser ---- */
  const G = {
    // Välkommen glider undan först (kroppen följer med), sedan kommer fråga 1 – inga två vyer ovanpå varandra
    borja: (b) => { const v = b.closest('.skarm'); if (!v || v.dataset.gar) return; v.dataset.gar = ''; summa(); setTimeout(() => gaFraga(1), lugn ? 0 : 340); },
    'fraga-nasta': () => gaFraga(fragaNu() + 1),
    // Från fråga 1 tillbaka till välkommen: frågan tonar undan helt först, sedan kommer välkommen – aldrig två vyer ovanpå varandra
    'fraga-bak': () => { if (fragaNu() > 1) return gaFraga(fragaNu() - 1, 'bak'); const v = nu; if (!v || v.dataset.gar) return; v.dataset.gar = ''; setTimeout(() => gaFraga(0, 'bak'), lugn ? 0 : 300); },
    kon: (b) => { st.svar.kon = b.dataset.v; $$('[data-g=kon]', nu).forEach((x) => x.setAttribute('aria-pressed', x === b)); segmentMarkor(b.parentElement); $('[data-g="fraga-nasta"]', nu).disabled = false; },
    pass: (b) => { st.svar.pass = b.dataset.v; $$('[data-g=pass]', nu).forEach((x) => x.setAttribute('aria-pressed', x === b)); $('[data-g="fraga-nasta"]', nu).disabled = false; }, // inget automatiskt hopp – man går vidare med Nästa
    mal: (b) => { const m = st.svar.mal, v = b.dataset.v; const i = m.indexOf(v); if (i >= 0) m.splice(i, 1); else { m.push(v); if (m.length > 2) m.shift(); }
      $$('[data-g=mal]', nu).forEach((x) => x.setAttribute('aria-pressed', m.includes(x.dataset.v))); $('[data-g="fraga-nasta"]', nu).disabled = !m.length; },
    'ont-bort': (b) => { st.svar.ont = st.svar.ont.filter((z) => z.id !== b.dataset.id); uppdateraOntFraga(); },
    'ont-val': (b) => { const a = $('.ark', arkLager); a.dataset[b.dataset.falt] = b.dataset.v; $$(`[data-falt="${b.dataset.falt}"]`, a).forEach((x) => x.setAttribute('aria-pressed', x === b)); },
    'ont-skada': (b) => b.setAttribute('aria-checked', b.getAttribute('aria-checked') !== 'true'),
    'ont-spara': (b) => {
      const a = $('.ark', arkLager), iFraga = b.dataset.fraga === '1', lista = iFraga ? st.svar.ont : st.profil.ont, id = b.dataset.id;
      const z = { id, niva: +$('[data-ont-niva]', a).value, typ: a.dataset.typ, sedan: a.dataset.sedan };
      if (!iFraga) { st.ontLogg = st.ontLogg || []; st.ontLogg.push({ id, niva: z.niva, datum: dagStr(idag()) }); }
      const i = lista.findIndex((x) => x.id === id); if (z.niva === 0) { if (i >= 0) lista.splice(i, 1); } else if (i >= 0) lista[i] = z; else lista.push(z);
      const skada = $('[data-g="ont-skada"]', a);
      if (skada) { const fanns = st.skador.find((s) => s.region === id && !s.slut);
        if (skada.getAttribute('aria-checked') === 'true' && !fanns) st.skador.push({ region: id, start: dagStr(dagar(-({ Idag: 0, 'Några dagar': 3, '1–2 veckor': 10, 'Mer än 2 veckor': 16 }[z.sedan] || 0))), typ: z.typ, aterfall: false });
        if (skada.getAttribute('aria-checked') !== 'true' && fanns) fanns.slut = dagStr(idag()); }
      spara(); stangArk(); kropp?.markera?.(null); kroppZoner();
      if (iFraga) uppdateraOntFraga(); else { hem(flik, { in: 'tona' }); toast(z.niva ? `${regionNamn(id)} sparad` : 'Borttaget'); }
    },
    'ont-ta-bort': (b) => { const iFraga = b.dataset.fraga === '1'; const lista = iFraga ? st.svar.ont : st.profil.ont; const i = lista.findIndex((x) => x.id === b.dataset.id); if (i >= 0) lista.splice(i, 1);
      const s = st.skador.find((x) => x.region === b.dataset.id && !x.slut); if (s) s.slut = dagStr(idag());
      spara(); stangArk(); kropp?.markera?.(null); kroppZoner(); if (iFraga) uppdateraOntFraga(); else hem(flik, { in: 'tona' }); },
    'pl-bock': (b) => { st.planKlar = st.planKlar || {}; const k = dagStr(idag()) + b.dataset.k, pa = !st.planKlar[k]; if (pa) st.planKlar[k] = true; else delete st.planKlar[k]; spara();
      b.setAttribute('aria-pressed', pa); if (pa) { summa(); const kvar = $$('.pl-bock', b.closest('.pl-gor')).filter((x) => x.getAttribute('aria-pressed') !== 'true').length; toast(kvar ? `Bra – ${kvar} övning${kvar > 1 ? 'ar' : ''} kvar idag` : 'Dagens övningar är gjorda'); if (!kvar) { const r0 = b.getBoundingClientRect(); konfetti(`${r0.left}px`, `${r0.top}px`); } } },
    'pl-schema': () => { const s0 = schema(); const d = VECKA_ORDNING.find((x) => !s0[x]); if (d === undefined) return toast('Schemat är fullt – övningarna passar som uppvärmning');
      s0[d] = { typ: 'Rörlighet', min: 15, tid: '07:00' }; spara(); toast(`Övningarna ligger på ${DAGNAMN[d].toLowerCase()} kl 07:00`); },
    'pl-fraga': (b) => toast(`Meddelandet till ${b.dataset.vem.toLowerCase()} skickas i nästa version`),
    'pl-dela': (b) => { st.dela.team = !st.dela.team; spara(); b.setAttribute('aria-pressed', st.dela.team); b.innerHTML = `${ik('skold')}${st.dela.team ? 'Delas med teamet' : 'Dela med teamet'}`; toast(st.dela.team ? 'Teamet ser din plan och dina värden' : 'Planen delas inte längre'); },
    'ont-ny': () => { stangArk(); if (flik !== 'kropp') hem('kropp'); toast('Tryck på kroppen där det känns'); },
    'niva-bak': () => gaFraga(5, 'bak'),
    'valj-niva': (b, ev) => {
      st.svar.niva = b.dataset.v; $$('[data-g="valj-niva"]', nu).forEach((x) => x.setAttribute('aria-pressed', x === b)); $('[data-g="skapa"]', nu).disabled = false;
      bytNiva(b.dataset.v, ev.clientX || innerWidth / 2, ev.clientY || innerHeight / 2); spara();
    },
    skapa: () => skapar(),
    flik: (b) => hem(b.dataset.v),
    checkin: () => checkinArk(),
    dag: (b) => { const ds = b.dataset.d, d = new Date(ds), pass = st.pass.filter((x) => x.datum === ds), ci = st.checkin.find((x) => x.datum === ds);
      const namn = d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
      if (ds > dagStr(idag())) return toast(`${namn}: inget planerat än`);
      toast(`${namn}: ${pass.length ? pass.map((x) => `${x.typ} ${x.min} min`).join(', ') : 'vilodag'}${ci ? ` · dagsform ${dagsform(ci)}` : ''}`); },
    forbered: (b) => { st.forbered = st.forbered || {}; st.forbered[b.dataset.k] = !st.forbered[b.dataset.k]; b.setAttribute('aria-pressed', st.forbered[b.dataset.k]); spara(); summa();
      const n = FORBERED.filter(([k]) => st.forbered[k]).length, sek = b.closest('.sc-forbered'); $('.tal', sek).textContent = `${n}/${FORBERED.length}`; $('.matare i', sek).style.setProperty('--v', `${n / FORBERED.length * 100}%`);
      if (n === FORBERED.length) { const r0 = b.getBoundingClientRect(); konfetti(`${r0.left + r0.width / 2}px`, `${r0.top}px`); toast('Du är redo för testdagen'); } },
    'kalender-fil': () => { const d = dagar(14), ds = dagStr(d).replace(/-/g, ''); const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Uperformance//Halsoappen//SV', 'BEGIN:VEVENT', `UID:testdag-${ds}@uperformance`, `DTSTART:${ds}T083000`, `DTEND:${ds}T103000`, 'SUMMARY:Testdag – Uperformance', 'DESCRIPTION:Stationerna A–C. Plats meddelas.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'testdag-uperformance.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Testdagen sparas i kalendern'); },
    'boka-om': () => toast('Ombokning öppnas i nästa version'),
    formular: () => formularArk(),
    'formular-fortsatt': () => { stangArk(); toast('Formuläret öppnas i nästa version'); },
    snabbval: (b) => sidaArk(b.dataset.k),
    ovningar: (b) => ovningsArk(b.dataset.id),
    'ovning-klar': (b) => { const p = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', p); if (p) summa(); },
    vrid: (b) => { const t = $('[data-vy-text]', b), bak = t.textContent === 'Bak'; kropp?.vy?.(bak ? 'bak' : 'fram'); t.textContent = bak ? 'Fram' : 'Bak'; },
    snabb: (b) => { const s = SNABB.find((x) => x[0] === b.dataset.k); if (!s) return; const c = { datum: dagStr(idag()), ...s[2] };
      st.checkin = st.checkin.filter((x) => x.datum !== c.datum); st.checkin.push(c); spara(); const r0 = b.getBoundingClientRect(); konfetti(`${r0.left + r0.width / 2}px`, `${r0.top}px`);
      setTimeout(() => { hem('idag', { in: 'tona' }); toast(`${s[1]} – dagsform ${dagsform(c)}`); }, lugn ? 0 : 380); },
    'checkin-spara': () => {
      const a = $('.ark', arkLager), c = { datum: dagStr(idag()) }; CHECKIN.forEach(([k]) => { c[k] = +$(`[data-ci="${k}"]`, a).value; });
      st.checkin = st.checkin.filter((x) => x.datum !== c.datum); st.checkin.push(c); spara(); stangArk(); hem(flik || 'idag', { in: 'tona' }); toast(`Dagsform ${dagsform(c)} – sparad`); konfetti('50%', '22%');
    },
    'pass-ny': () => passArk(),
    'pass-typ': (b) => { const a = $('.ark', arkLager); a.dataset.typ = b.dataset.v; $$('[data-g="pass-typ"]', a).forEach((x) => x.setAttribute('aria-pressed', x === b)); },
    'pass-spara': (b) => { const a = $('.ark', arkLager), plan = b.dataset.plan === '1'; st.pass.push({ datum: dagStr(idag()), typ: a.dataset.typ, min: +$('[data-pass-min]', a).value, rpe: +$('[data-pass-rpe]', a).value, ...(plan ? { plan: true } : {}) });
      st.hoppat = (st.hoppat || []).filter((x) => x !== dagStr(idag())); spara(); stangArk(); gomNotis(); hem(flik || 'idag', { in: 'tona' }); toast(plan || planFor(idag()) ? reaktion() : 'Passet är sparat'); konfetti('50%', '30%'); },
    'ts-checka': (b) => { gomNotis(); if (b.closest('.ark')) { stangArk(); return setTimeout(() => checkaArk(), lugn ? 0 : 360); } checkaArk({ extra: b.dataset.extra === '1' }); },
    'ts-hoppa': () => { const ds = dagStr(idag()); st.hoppat = [...new Set([...(st.hoppat || []), ds])]; spara(); gomNotis(); hem('idag', { in: 'tona' }); toast(['Vila gott – vi ses nästa pass', 'Överhoppat – nästa pass står kvar', 'Överhoppat. Nästa pass gäller.'][TONER.findIndex(([k]) => k === coach().ton)]); },
    'ts-angra': () => { st.hoppat = (st.hoppat || []).filter((x) => x !== dagStr(idag())); spara(); hem('idag', { in: 'tona' }); },
    'ts-dag': (b) => { const ds = b.dataset.d, x = veckoLage().find((v) => v.ds === ds); if (!x) return; const namn = DAGNAMN[x.d.getDay()];
      if (x.idag && x.plan && x.lage === 'idag') return checkaArk();
      toast(x.gjort.length ? `${namn}: ${x.gjort.map((p) => `${p.typ} ${p.min} min`).join(', ')}` : x.plan ? `${namn}: ${x.plan.typ} ${x.plan.min} min kl ${x.plan.tid}${x.lage === 'missad' ? ' – missad' : x.lage === 'hoppad' ? ' – överhoppad' : ''}` : `${namn}: vila`); },
    'ts-schema': () => schemaArk(),
    'ts-redigera': (b) => dagArk(+b.dataset.d),
    'ts-typ': (b) => { const a = $('.ark', arkLager); a.dataset.typ = b.dataset.v; $$('[data-g="ts-typ"]', a).forEach((x) => x.setAttribute('aria-pressed', x === b)); $('.ts-dagfalt', a).hidden = !b.dataset.v; },
    'ts-tid': (b) => { const a = $('.ark', arkLager); a.dataset.tid = b.dataset.v; $$('[data-g="ts-tid"]', a).forEach((x) => x.setAttribute('aria-pressed', x === b)); },
    'ts-dag-spara': (b) => { const a = $('.ark', arkLager), d = +b.dataset.d, s = schema(); s[d] = a.dataset.typ ? { typ: a.dataset.typ, min: +$('[data-ts-min]', a).value, tid: a.dataset.tid } : null; spara(); schemaArk(); toast(`${DAGNAMN[d]} sparad`); },
    'ts-aterstall': () => { st.schema = standardSchema(st.profil); spara(); schemaArk(); toast('Schemat följer din profil'); },
    'ts-klar': () => { stangArk(); hem(flik || 'idag', { in: 'tona' }); },
    'coach-ark': () => coachArk(),
    'coach-ton': (b) => { coach().ton = b.dataset.v; spara(); const a = $('.ark', arkLager); $$('[data-g="coach-ton"]', a).forEach((x) => x.setAttribute('aria-pressed', x === b)); segmentMarkor(b.parentElement);
      $('[data-ton-text]', a).textContent = TONER.find(([k]) => k === b.dataset.v)[2]; const f = $('[data-forhand]', a); f.innerHTML = forhandHtml(); f.animate?.([{ opacity: .3, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out' }); },
    'coach-pamin': (b) => { const c = coach(); c.pamin = !c.pamin; spara(); b.setAttribute('aria-checked', c.pamin); $('.vaxel', b).setAttribute('aria-checked', c.pamin); $('[data-fore-falt]', arkLager).hidden = !c.pamin; toast(c.pamin ? 'Påminnelser på' : 'Påminnelser av'); },
    'coach-fore': (b) => { coach().fore = +b.dataset.v; spara(); $$('[data-g="coach-fore"]', arkLager).forEach((x) => x.setAttribute('aria-pressed', x === b)); },
    'coach-test': () => { stangArk(); setTimeout(() => notis(), lugn ? 0 : 420); },
    'coach-klar': () => { stangArk(); hem(flik || 'idag', { in: 'tona' }); },
    'screening-boka': () => { stangArk(); toast('Förscreeningen öppnas i nästa version'); },
    vy: (b) => { kropp?.vy?.(b.dataset.v); $$('[data-g=vy]', nu).forEach((x) => x.setAttribute('aria-pressed', x === b)); segmentMarkor(b.parentElement); },
    zon: (b) => ontArk(b.dataset.id),
    'kropp-lage': (b) => { if (b.dataset.v === kroppLage || G['kropp-lage'].pagar) return; const g = b.parentElement, m = $('.kv-lage-markor', g), n = KV_LAGEN.indexOf(b.dataset.v);
      $$('[data-g="kropp-lage"]', g).forEach((x) => x.setAttribute('aria-pressed', x === b));
      if (m && !lugn) { const fore = getComputedStyle(m).transform; m.style.animation = 'none'; m.style.transform = fore; void m.offsetWidth; m.style.transform = `translateX(calc(${n} * (100% + 4px)))`; }
      kroppLage = b.dataset.v; kroppLageForra = kroppLage; G['kropp-lage'].pagar = true; setTimeout(() => { G['kropp-lage'].pagar = false; hem('kropp', { in: 'mjuk' }); }, lugn ? 0 : 340); },
    'lopp-ark': () => { stangArk(); setTimeout(() => loppArk(), arkLager.hidden ? 0 : 360); },
    'lopp-flik': (b) => { if (b.getAttribute('aria-pressed') === 'true') return; const g = b.parentElement; $$('button', g).forEach((x) => x.setAttribute('aria-pressed', x === b)); segmentMarkor(g);
      cancelAnimationFrame(spokRaf); const inne = $('.lp-inne', arkLager); if (inne) inne.dataset.gar = ''; clearTimeout(G['lopp-flik'].t); G['lopp-flik'].t = setTimeout(() => loppArk(b.dataset.v, { bara: true }), lugn ? 0 : 180); },
    'lopp-spela': (b) => { if (karta3dNu) return karta3dNu.spela(b, $('[data-lp-live]', arkLager)); const svg = $('.lp-kartram .lp-karta', arkLager); if (svg) spelaRunda(svg, exempelRunda(loppNu()), loppNu(), b); },
    'bel-nollstall': () => { const s0 = loppSt(); if (s0.upplast) delete s0.upplast[loppNu().id]; spara(); loppArk('karta', { bara: true }); toast('Belöningarna är låsta igen – spela upp rundan'); },
    'bel-kod': (b) => { const k = b.dataset.kod; try { navigator.clipboard?.writeText(k); } catch (err) { /* ingen urklippstavla */ } b.classList.add('kopierad'); setTimeout(() => b.classList.remove('kopierad'), 1200); toast(`Koden ${k} är kopierad`); },
    paket: (b) => { st.paket = b.dataset.v; spara(); $$('.pk', b.parentElement).forEach((x) => x.setAttribute('aria-pressed', x === b)); summa(); },
    valla: (b) => { st.valla = +b.dataset.v; spara(); const k = b.closest('.ls-valla'); if (!k) return; const ny = document.createElement('div'); ny.innerHTML = vallaKort(0); const n = ny.firstElementChild; n.classList.remove('in'); k.replaceWith(n); summa(); },
    'lopp-garmin': () => toast('Kopplingen till klockan öppnas i nästa version'),
    'lopp-val': (b) => { const l = LOPP.find((x) => x.id === b.dataset.v); if (!l) return; const s0 = loppSt(); s0.id = l.id; s0.mal = Math.round(l.km * (LANDS ? (elit() ? 165 : 330) : elit() ? 260 : 330) / 60) * 60; spara();
      loppArk('karta'); toast(`${l.namn} är ditt lopp`); if (flik === 'idag') setTimeout(() => { const k = $('.lp-kort', nu); if (k) { k.outerHTML = loppKort(4); const ny = $('.lp-kort', nu); ny.classList.remove('in'); const x = $('.lp-karta', ny); if (x) fargaRunda(x, exempelRunda(l)); } }, 400); },
    'lopp-schema': () => { const s0 = schema(); s0[0] = { typ: 'Löpning', min: elit() ? 90 : 75, tid: '10:00' }; s0[4] = { typ: 'Löpning', min: 45, tid: '17:30' }; spara(); toast('Långpass på söndag och tempopass på torsdag är inlagda'); },
    grupp: (b) => { if (b.dataset.k) gruppArk(b.dataset.k); else kropp?.markera?.(null); },
    'byt-niva': (b, ev) => { if (st.profil.niva === b.dataset.v) return; st.profil.niva = b.dataset.v; Object.assign(st, exempeldata(st.profil)); st.schema = null; st.hoppat = []; spara();
      $$('[data-g="byt-niva"]', nu).forEach((x) => x.setAttribute('aria-pressed', x === b)); segmentMarkor(b.parentElement);
      const r = b.getBoundingClientRect(); bytNiva(b.dataset.v, r.left + r.width / 2, r.top + r.height / 2); setTimeout(() => hem('jag', { in: 'tona' }), lugn ? 0 : 450); },
    'jag-mal': (b) => { const m = st.profil.mal, v = b.dataset.v, i = m.indexOf(v); if (i >= 0) m.splice(i, 1); else m.push(v); b.setAttribute('aria-pressed', m.includes(v)); spara(); },
    'mal-ark': () => malArk(),
    'mal-klar': () => { stangArk(); hem('jag', { in: 'tona' }); },
    medalj: (b) => { const u = utmarkelser().find((x) => x[0] === b.dataset.k); if (u) toast(u[4] ? `${u[1]} – klar` : `${u[1]}: ${u[2]}`); },
    notiser: (b) => { st.notiser = st.notiser === false; const pa = st.notiser !== false; b.setAttribute('aria-checked', pa); $('.vaxel', b)?.setAttribute('aria-checked', pa); spara(); toast(pa ? 'Notiser på' : 'Notiser av'); },
    'jag-inst': (b) => toast({ paminn: 'Tiden för påminnelsen väljs i nästa version', export: 'Exporten öppnas i nästa version', integritet: 'Samtycket visas i nästa version' }[b.dataset.k] || 'Kommer i nästa version'),
    dela: (b) => { st.dela[b.dataset.v] = !st.dela[b.dataset.v]; b.setAttribute('aria-checked', st.dela[b.dataset.v]); spara();
      const nod = b.closest('.jg-nod'); if (nod) { nod.previousElementSibling?.toggleAttribute('data-av', !st.dela[b.dataset.v]); const s = $('small', nod); if (s) s.textContent = `Hälsodata${st.dela[b.dataset.v] ? '' : ' · delas inte'}`; } toast(st.dela[b.dataset.v] ? 'Delas med ditt team' : 'Delas inte längre'); },
    'borja-om': () => { st = nytt(); spara(); kroppForm$(); flik = null; document.body.dataset.niva = 'elit'; kropp?.satLage?.('elit'); kroppZoner(); splash(); },
  };
  function uppdateraOntFraga() {
    spara(); kroppZoner();
    const l = $('[data-ont-lista]', nu); if (l) l.innerHTML = ontChips();
    const k = $('[data-g="fraga-nasta"]', nu); if (k) k.innerHTML = `${st.svar.ont.length ? 'Klart – nästa' : 'Jag har inte ont'} ${ik('pil')}`;
  }
  document.addEventListener('click', (ev) => {
    if (performance.now() - senasteByte < 420 && ev.target.closest('.skarm')) { ev.preventDefault(); ev.stopPropagation(); return; } // spökklick efter vybyte
    if (ev.target.closest('[data-stang-ark]')) { if (ev.target.closest('.ark-sloja') && performance.now() - arkOppnat < 500) return; stangArk(); kropp?.markera?.(null); return; }
    const b = ev.target.closest('[data-g]'); if (b && G[b.dataset.g]) { if (b.matches('.knapp-primar, .flik-plus, .val, .niva-kort')) summa(); G[b.dataset.g](b, ev); return; }
    const f = ev.target.closest('[data-flik]'); if (f) { if (f.dataset.flik !== flik) hem(f.dataset.flik); else nu?.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (ev.target.closest('[data-logga]')) loggaArk();
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { stangArk(); kropp?.markera?.(null); } });
  // Nivåkorten lutar efter fingret/musen och ljuset följer med.
  document.addEventListener('pointermove', (ev) => {
    const k = ev.target.closest?.('[data-tilt]'); if (!k || lugn) return;
    const r = k.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
    k.style.setProperty('--ry', `${(x - .5) * 10}deg`); k.style.setProperty('--rx', `${(.5 - y) * 8}deg`); k.style.setProperty('--mx', `${x * 100}%`); k.style.setProperty('--my', `${y * 100}%`);
  });
  document.addEventListener('pointerout', (ev) => { const k = ev.target.closest?.('[data-tilt]'); if (k && !k.contains(ev.relatedTarget)) { k.style.setProperty('--rx', '0deg'); k.style.setProperty('--ry', '0deg'); } });
  // Dra ner arket för att stänga det.
  let drag = null;
  // Arket följer fingret (uppåt med motstånd), slöjan tonar efter hur långt det dragits. Släpp: långt nog eller
  // snabbt nedåt → stängs därifrån, annars fjädrar det tillbaka.
  arkLager.addEventListener('pointerdown', (ev) => {
    const a = $('.ark', arkLager); if (!a || arkLager.hasAttribute('data-stanger')) return;
    const handtag = ev.target.closest('.ark-handtag, .ark-rubrik') || (ev.clientY - a.getBoundingClientRect().top < 36);
    if (!handtag && a.scrollTop > 0) return; if (!handtag && ev.target.closest('input,button,select,textarea,[data-hjul]')) return; if (!ev.target.closest('.ark')) return;
    drag = { y: ev.clientY, a, d: 0, t: performance.now(), v: 0, h: a.offsetHeight, handtag, igang: false };
  });
  addEventListener('pointermove', (ev) => {
    if (!drag) return; const r = ev.clientY - drag.y;
    if (!drag.igang) { if (Math.abs(r) < 6) return; if (r < 0 && !drag.handtag) { drag = null; return; } drag.igang = true; arkLager.dataset.dragen = ''; drag.a.style.transition = 'none'; }
    const d = r >= 0 ? r : -Math.sqrt(-r) * 2.2, nuT = performance.now();
    drag.v = (d - drag.d) / Math.max(1, nuT - drag.t); drag.t = nuT; drag.d = d;
    drag.a.style.transform = `translateY(${d}px)`;
    $('.ark-sloja', arkLager).style.opacity = String(1 - klamp(d / drag.h, 0, 1) * .85);
  });
  const slappArk = () => {
    if (!drag) return; const { a, d, v, h, igang } = drag; drag = null; if (!igang) return;
    if (d > Math.min(130, h * .4) || (d > 30 && v > .55)) { stangArk(); kropp?.markera?.(null); return; }
    delete arkLager.dataset.dragen;
    a.style.transition = 'transform .5s var(--fjader-mjuk)'; a.style.transform = '';
    const s = $('.ark-sloja', arkLager); s.style.transition = 'opacity .3s var(--mjuk)'; s.style.opacity = '';
    setTimeout(() => { a.style.transition = ''; s.style.transition = ''; }, 520);
  };
  addEventListener('pointerup', slappArk); addEventListener('pointercancel', slappArk);
  addEventListener('resize', flikMarkor);
  // Visningssidan (index.html) kan styra prototypen: { up: 'niva', v } eller { up: 'om' }.
  addEventListener('message', (ev) => {
    const m = ev.data || {}; if (ev.origin !== location.origin) return;
    if (m.up === 'om') G['borja-om']();
    if (m.up === 'niva' && st.profil) { st.profil.niva = m.v; Object.assign(st, exempeldata(st.profil)); spara(); bytNiva(m.v, innerWidth / 2, innerHeight / 2); setTimeout(() => hem(flik || 'idag', { in: 'tona' }), 400); }
  });

  /* ---- 14b snöfall över hela appen på vintern (bakom innehållet, lugnt) ---- */
  (() => { const l = $('#sno'); if (!l || lugn || himmelLage().arstid !== 'vinter') return; document.body.dataset.arstid = 'vinter';
    // kraftigt snöfall i tre djup: långt bort (små, långsamma), mitten och nära (stora, mjuka, snabbare)
    const lag = [[50, 1.6, 2.4, .5, 14, 5], [40, 2.6, 3.6, .75, 9, 4], [14, 5, 8, .55, 6, 3]];
    let k = 0; l.innerHTML = lag.map(([n, s0, s1, o, t, dt], d) => Array.from({ length: n }, () => { const i = k++;
      return `<i data-d="${d}" style="--x:${((i * 37.7) % 100).toFixed(1)}%;--s:${(s0 + ((i * 13) % 10) / 10 * (s1 - s0)).toFixed(1)}px;--o:${(o * (.7 + ((i * 7) % 10) / 33)).toFixed(2)};--t:${(t + ((i * 11) % 10) / 10 * dt).toFixed(1)}s;--d:${(-((i * 1.37) % 14)).toFixed(1)}s;--v:${(i % 2 ? 1 : -1) * (10 + (i % 5) * 7)}px"></i>`; }).join('')).join(''); })();

  /* ---- 15 start ---- */
  if (st.profil) document.body.dataset.niva = st.profil.niva;
  splash();
})();
