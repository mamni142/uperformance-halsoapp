/* Uperformance hälsoapp – 3D-kroppen (avataren). Ren WebGL, inga beroenden, inget byggsteg. Bygger på app/avatar.js
   (samma teknik: SDF → nät i en Worker, glas med fresnel, konturlinjer, värme, spegling, skanningens tvärsnitt).
   Användning: const api = UPKropp.montera(el, { lage: 'motionar' | 'elit', kropp: 'man' | 'kvinna', interaktiv, autoVrid, etiketter }).
   1. Kroppen (≈1,80 m, y uppåt, ansiktet mot +z, personens VÄNSTRA sida = +x) är ellipsoider och "round cones" som
      smälts ihop mjukt (DELAR). Neutral stående pose: båda fötterna i golvet, armarna lätt ut från kroppen.
      Två former via parametrar: axlar, midja, höfter, bröst, muskelteckning.
   2. En Worker gör om SDF:en till ett nät (surface nets) och klassar varje hörn till en region (klassa) – samma
      funktion som avgör vad ett tryck träffar, så värmen och träffen alltid stämmer.
   3. Värmen per region (niva 0–10) räknas i hörnshadern ur en uniform-lista: färg mint → bärnsten → korall,
      starkast i regionens mitt. Fokus (markera) = pulserande ringar på huden kring regionens punkt.
   4. Två paletter i samma shader: 'elit' (mörkt glashologram, additivt ljus) och 'motionar' (frostat porslin med
      navy kontur och mint linjer, mjuk skugga på golvet). Bytet tonar uniformen uLjust på 600 ms.
   5. Ritar bara när behållaren syns och fliken är synlig; minskad rörelse = stillbild som ritas om vid ändring.
   6. Mannen är en riktig 3D-modell (modell/kropp-man.bin, avsnitt 6b) som delas med Catmull-Clark i en Worker; SDF-kroppen
      ovan är kvar för kvinnan, för 2D-reserven utan WebGL och om modellen inte går att ladda. */
(() => {
  'use strict';
  if (window.UPKropp) return;

  /* ---- 1. vektorhjälp ---------------------------------------------------------------------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const norm = (a) => mul(a, 1 / (len(a) || 1));
  const lerp = (a, b, t) => add(a, mul(sub(b, a), t));
  const klamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const mjuk = (x) => x * x * (3 - 2 * x);
  const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const spegla = (p) => [-p[0], p[1], p[2]];

  /* ---- 2. regionerna (V = personens vänstra sida, +x) ----------------------------------------- */
  const REGIONER = [
    { id: 'huvud', namn: 'Huvud', sida: 'bada' }, { id: 'nacke', namn: 'Nacke', sida: 'bak' },
    { id: 'axel-v', namn: 'Vänster axel', sida: 'bada' }, { id: 'axel-h', namn: 'Höger axel', sida: 'bada' },
    { id: 'brost', namn: 'Bröst', sida: 'fram' }, { id: 'ovre-rygg', namn: 'Övre rygg', sida: 'bak' },
    { id: 'landrygg', namn: 'Ländrygg', sida: 'bak' }, { id: 'mage', namn: 'Mage', sida: 'fram' },
    { id: 'armbage-v', namn: 'Vänster armbåge', sida: 'bada' }, { id: 'armbage-h', namn: 'Höger armbåge', sida: 'bada' },
    { id: 'handled-v', namn: 'Vänster handled', sida: 'bada' }, { id: 'handled-h', namn: 'Höger handled', sida: 'bada' },
    { id: 'hoft-v', namn: 'Vänster höft', sida: 'bada' }, { id: 'hoft-h', namn: 'Höger höft', sida: 'bada' },
    { id: 'ljumske-v', namn: 'Vänster ljumske', sida: 'fram' }, { id: 'ljumske-h', namn: 'Höger ljumske', sida: 'fram' },
    { id: 'lar-v', namn: 'Framsida lår, vänster', sida: 'fram' }, { id: 'lar-h', namn: 'Framsida lår, höger', sida: 'fram' },
    { id: 'baklar-v', namn: 'Baksida lår, vänster', sida: 'bak' }, { id: 'baklar-h', namn: 'Baksida lår, höger', sida: 'bak' },
    { id: 'kna-v', namn: 'Vänster knä', sida: 'fram' }, { id: 'kna-h', namn: 'Höger knä', sida: 'fram' },
    { id: 'vad-v', namn: 'Vänster vad', sida: 'bak' }, { id: 'vad-h', namn: 'Höger vad', sida: 'bak' },
    { id: 'fotled-v', namn: 'Vänster fotled', sida: 'bada' }, { id: 'fotled-h', namn: 'Höger fotled', sida: 'bada' },
  ];
  const NR = REGIONER.length;
  const MAXZ = 12; // högst så många regioner med värme samtidigt (de starkaste)
  const RID = Object.fromEntries(REGIONER.map((r, i) => [r.id, i]));

  // Kroppsformerna (måtten i meter för en man på 1,80 m; kvinnan skalas till 1,68 m och får egna proportioner):
  // axel = skuldergördelns bredd, midja, hoft = bäcken/trochanter, brost = bröst (kvinna), muskel = muskelteckning (0–1),
  // arm/ben = muskelvolym, hals = halsens grovlek, hojd = skala mot 1,80 m
  const FORMER = {
    man: { axel: 1, midja: 1, hoft: 1, brost: 0, muskel: 1, arm: 1, ben: 1, hals: 1, hojd: 1 },
    kvinna: { axel: 0.87, midja: 0.87, hoft: 1.05, brost: 1, muskel: 0.38, arm: 0.84, ben: 0.95, hals: 0.84, hojd: 1.68 / 1.8 },
  };

  /* ---- 3. kodgenerering för SDF:en (samma som app/avatar.js) -------------------------------- */
  const n7 = (x) => `(${+x.toPrecision(7)})`;
  const delKod = (d) => {
    if (d.typ === 'k') {
      const ba = sub(d.b, d.a), l2 = dot(ba, ba), rr = d.ra - d.rb, a2 = l2 - rr * rr, il2 = 1 / l2, k2 = Math.sign(rr) * rr * rr;
      return `{const px=qx-${n7(d.a[0])},py=qy-${n7(d.a[1])},pz=qz-${n7(d.a[2])};const y=px*${n7(ba[0])}+py*${n7(ba[1])}+pz*${n7(ba[2])},z=y-${n7(l2)};`
        + `const xx=px*${n7(l2)}-${n7(ba[0])}*y,xy=py*${n7(l2)}-${n7(ba[1])}*y,xz=pz*${n7(l2)}-${n7(ba[2])}*y;const x2=xx*xx+xy*xy+xz*xz,y2=y*y*${n7(l2)},z2=z*z*${n7(l2)},k=${n7(k2)}*x2;`
        + `t=Math.sign(z)*${n7(a2)}*z2>k?Math.sqrt(x2+z2)*${n7(il2)}-${n7(d.rb)}:Math.sign(y)*${n7(a2)}*y2<k?Math.sqrt(x2+y2)*${n7(il2)}-${n7(d.ra)}:(Math.sqrt(x2*${n7(a2 * il2)})+y*${n7(rr)})*${n7(il2)}-${n7(d.ra)};}`;
    }
    const [r0, r1, r2] = d.r;
    const lokal = d.b
      ? `const lx=dx*${n7(d.b.u[0])}+dy*${n7(d.b.u[1])}+dz*${n7(d.b.u[2])},ly=dx*${n7(d.b.w[0])}+dy*${n7(d.b.w[1])}+dz*${n7(d.b.w[2])},lz=dx*${n7(d.b.v[0])}+dy*${n7(d.b.v[1])}+dz*${n7(d.b.v[2])};`
      : 'const lx=dx,ly=dy,lz=dz;';
    return `{const dx=qx-${n7(d.c[0])},dy=qy-${n7(d.c[1])},dz=qz-${n7(d.c[2])};${lokal}`
      + `const a=lx*${n7(1 / r0)},b=ly*${n7(1 / r1)},c=lz*${n7(1 / r2)},k0=Math.sqrt(a*a+b*b+c*c);`
      + `const e=lx*${n7(1 / (r0 * r0))},f=ly*${n7(1 / (r1 * r1))},g=lz*${n7(1 / (r2 * r2))},k1=Math.sqrt(e*e+f*f+g*g);`
      + 't=k0*(k0-1)/(k1>1e-9?k1:1e-9);}';
  };
  const smin = (dst, src, k) => (k > 0 ? `{const h=Math.max(${n7(k)}-Math.abs(${dst}-${src}),0)*${n7(1 / k)};${dst}=Math.min(${dst},${src})-h*h*${n7(k * 0.25)};}` : `${dst}=Math.min(${dst},${src});`);
  const smax = (dst, src, k) => `{const h=Math.max(${n7(k)}-Math.abs(${dst}-${src}),0)*${n7(1 / k)};${dst}=Math.max(${dst},${src})+h*h*${n7(k * 0.25)};}`;
  // Ortonormal bas för en ellipsoid: w = långa axeln (r[1]), f = ungefär "framåt" (r[2]), u = w × v (r[0])
  const bas = (axel, fram) => {
    const w = norm(axel);
    let f0 = fram || (Math.abs(w[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1]);
    let v = sub(f0, mul(w, dot(f0, w))); if (len(v) < 1e-4) v = Math.abs(w[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    v = norm(sub(v, mul(w, dot(v, w))));
    return { u: cross(w, v), w, v };
  };

  /* ---- 4. kroppen ------------------------------------------------------------------------------
     En anatomisk studiefigur: först stommen per grupp (bröstkorg, buk, bäcken, skalle, lårben …) som smälts ihop
     mjukt, sedan musklerna som läggs PÅ stommens yta (mus/yta: punkten hittas längs en riktning ut från stommen och
     muskeln sticker upp en given höjd) med litet k så att gränserna syns, och till sist grunda fåror (linea alba,
     bukrutorna, ryggrännan) som skärs ur med given bredd och djup. Allt i meter för en man på 1,80 m; kvinnan skalas
     i SDF:en (karta(p) = s · karta0(p / s)) och har egna bredder, bröst och mjukare muskelteckning. */
  function byggKropp(formNamn) {
    const F = FORMER[formNamn] || FORMER.man;
    const ax = F.axel, mi = F.midja, hf = F.hoft, mu = F.muskel, ar = F.arm, bn = F.ben, SK = F.hojd;
    const kvinna = F.brost > 0;
    const DELAR = [];
    let skar = false, stom = false;
    const km = (k) => Math.min(0.06, k * 1.6 * (1 + 1.2 * (1 - mu))); // k för muskler: mjuka övergångar, mjukast för kvinnoformen
    const hm = (h) => h * 0.78 * (0.6 + 0.4 * mu); // musklernas höjd över stommen: antydd, inte bubblig
    const ny = (d) => { d.ur = skar; d.stomme = stom; d.f = new Function('qx', 'qy', 'qz', `let t=0;${delKod(d)}return t;`); DELAR.push(d); return d; };
    const ell = (grupp, k, c, r, w, f) => ny({ grupp, typ: 'e', k, c, r, b: w ? bas(w, f) : null });
    const kon = (grupp, k, a, b, ra, rb) => ny({ grupp, typ: 'k', k, a, b, ra, rb });
    const S_ = (f) => (...x) => { stom = true; const d = f(...x); stom = false; return d; }; // stommen
    const sEll = S_(ell), sKon = S_(kon);
    const ur = (f) => (...x) => { skar = true; const d = f(...x); skar = false; return d; };
    // Avståndet till en grupps stomme (eller allt som lagts till i gruppen) – vanligt min, används bara vid bygget
    // alla = gruppens verkliga yta hittills (samma smin/smax som SDF-koden), annars bara stommen (vanligt min)
    const smJ = (a2, b2, k) => { if (k <= 0) return Math.min(a2, b2); const h = Math.max(k - Math.abs(a2 - b2), 0) / k; return Math.min(a2, b2) - h * h * k * 0.25; };
    const avst = (grupper, p, alla) => {
      let d = 9;
      for (const g of grupper) {
        let v = null;
        for (const x of DELAR) {
          if (x.grupp !== g || (!alla && (x.ur || !x.stomme))) continue;
          const t = x.f(p[0], p[1], p[2]);
          if (v === null) v = t; else if (!alla) v = Math.min(v, t); else if (x.ur) v = -smJ(-v, t, x.k); else v = smJ(v, t, x.k);
        }
        if (v !== null) d = Math.min(d, v);
      }
      return d;
    };
    // Punkten på ytan längs riktningen n från c: strålen skickas utifrån (c + 0,3 n) in mot c, så att det alltid
    // blir den yttersta ytan i den riktningen
    const yta = (grupper, c, n, alla) => {
      const g = Array.isArray(grupper) ? grupper : [grupper];
      let t = 0.3;
      for (let i = 0; i < 160 && t > -0.05; i++) { const d = avst(g, add(c, mul(n, t)), alla); if (Math.abs(d) < 2e-5) break; t -= Math.max(d * 0.9, -0.004); }
      return add(c, mul(n, t));
    };
    // Muskel på ytan: r = [bredd, längd (längs w), tjocklek (längs n)], sticker upp h över stommen
    const pa = (g, k, c, n0, h, r, w, bas0) => {
      const n = norm(n0), s = yta(bas0 || g, c, n);
      return ell(g, k, add(s, mul(n, h - r[2])), r, w, n);
    };
    // Fåra: grund ränna från a till b (punkter inne i kroppen), skärs ur ytan längs n med bredd och djup
    const fara = (g, k, a, b, n0, bredd, djup, alla = true) => {
      const n = norm(n0), w2 = bredd / 2, r = (w2 * w2 + djup * djup) / (2 * djup);
      // i bitar om högst 2,5 cm så att rännan följer ytans rundning (punkterna hittas före skärningen)
      const bitar = Math.max(1, Math.ceil(len(sub(b, a)) / 0.025));
      const P = []; for (let i = 0; i <= bitar; i++) P.push(add(yta(g, lerp(a, b, i / bitar), n, alla), mul(n, r - djup)));
      skar = true; for (let i = 0; i < bitar; i++) kon(g, k, P[i], P[i + 1], r, r); skar = false;
    };
    const fara1 = (g, k, c, n0, r3, djup, w, alla = true) => { // grop/kort fåra som ellipsoid
      const n = norm(n0), s = yta(g, c, n, alla);
      skar = true; ell(g, k, add(s, mul(n, r3[2] - djup)), r3, w, n); skar = false;
    };
    // Ledram längs en ben/arm-del: at(t) = punkt på andelen t från P mot Q; dir(v) = riktning vinkelrätt mot leden,
    // v = 0° fram, 90° ut från kroppens mitt, 180° bak, −90° in mot mitten
    const led = (P, Q, fram0, sida = 1) => {
      const nd = norm(sub(Q, P)), fram = norm(sub(fram0, mul(nd, dot(fram0, nd)))), ut = mul(cross(fram, nd), sida);
      return {
        P, Q, ned: nd, fram, ut, L: len(sub(Q, P)),
        at: (t, o = 0, f = 0) => add(add(lerp(P, Q, t), mul(ut, o)), mul(fram, f)),
        dir: (v) => { const a = (v * Math.PI) / 180; return add(mul(fram, Math.cos(a)), mul(ut, Math.sin(a))); },
      };
    };
    const mus = (g, k, fr, t, v, h, r, bas0) => { const n = fr.dir(v); return pa(g, k, fr.at(t), n, h, r, fr.ned, bas0); };

    /* Huvud och hals (grupp huvud, speglas) – en skyltdocka/marmorbyst med riktiga mått: hjässa 1,80 m, haka ≈ 1,575 m
       (huvudet 0,225 m ≈ 1/8 av längden), bredd 0,155 m, djup 0,20 m. Formerna ger skuggan under ögonbrynen –
       inga gropar för ögon eller mun, inga läppar. Halsen ungefär lika bred som käken i profil. */
    sEll('huvud', 0, [0, 1.71, -0.022], [0.076, 0.09, 0.096]); // kraniet (brett, runt bakhuvud)
    sEll('huvud', 0.05, [0, 1.66, 0.012], [0.064, 0.075, 0.068]); // ansiktets stomme (framkant z ≈ 0,08)
    ell('huvud', 0.03, [0, 1.735, 0.04], [0.058, 0.04, 0.056]); // pannan (sluttar bakåt upptill)
    ell('huvud', 0.022, [0, 1.699, 0.08], [0.05, 0.012, 0.02], [1, 0, 0], [0, 0, 1]); // ögonbrynsbågen – ger skuggan under
    kon('huvud', 0.045, [0.055, 1.645, -0.02], [0.022, 1.59, 0.058], 0.016, 0.015); // käklinjen: mjuk vinkel mot hakan
    ell('huvud', 0.04, [0, 1.618, 0.07], [0.03, 0.028, 0.024]); // munpartiet (en mjuk rundning, ingen mun)
    ell('huvud', 0.02, [0, 1.594, 0.078], [0.022, 0.019, 0.02]); // hakan (bred och rund)
    kon('huvud', 0.014, [0, 1.69, 0.082], [0, 1.652, 0.1], 0.011, 0.0145); // (radierna räknar med speglingens mjuka mittlinje) // näsan: rygg ned mot en mjuk, rund spets (inga näsborrar)
    pa('huvud', 0.02, [0.03, 1.666, -0.022], [1, 0, 0.05], 0.006, [0.013, 0.024, 0.01], [0, 1, 0.12]); // örat (litet, tätt mot huvudet)
    sKon('huvud', 0.07, [0, 1.45, -0.02], [0, 1.615, -0.028], 0.068 * F.hals, 0.058 * F.hals); // halsen (kraftig)
    pa('huvud', 0.06, [0.03, 1.53, -0.02], [0.3, 0.12, -1], hm(0.006), [0.03, 0.07, 0.03], [0, 1, 0]); // nackmusklerna mot trapezius
    kon('huvud', 0.05, [0.048, 1.632, -0.032], [0.024, 1.48, 0.046], 0.013 * F.hals, 0.011 * F.hals); // kappmuskeln (SCM), mjuk

    /* Bröstkorg och skuldergördel (grupp brost, speglas) */
    sEll('brost', 0, [0, 1.34, -0.024], [0.146 * ax, 0.185, 0.11]); // bröstkorgen
    sEll('brost', 0.05, [0, 1.43, -0.03], [0.17 * ax, 0.062, 0.088]); // övre bröstkorgen
    kon('brost', 0.05, [0.024, 1.466, 0.048], [0.15 * ax, 1.482, -0.006], 0.012, 0.012); // nyckelbenet: bara en svag rundad linje
    kon('brost', 0.07, [0.03, 1.55, -0.048], [0.158 * ax, 1.478, -0.032], 0.04 * (0.75 + 0.25 * mu), 0.026); // kappmuskeln, övre – en lugn sluttning
    pa('brost', km(0.02), [0.04, 1.43, -0.02], [0.1, 0.25, -1], hm(0.003), [0.06, 0.07, 0.04], [1, -0.1, 0]); // kappmuskeln, mellersta
    pa('brost', km(0.03), [0.086 * ax, 1.375, -0.02], [0.3, 0.05, -1], hm(0.011), [0.05, 0.065, 0.045], [0.45, 1, 0]); // skulderbladet (platt, svag upphöjning)
    // latissimus: från armhålan ned mot midjan (V-formen bakifrån)
    pa('brost', km(0.05), [0.1, 1.33, -0.03], [0.85, 0, -0.55], hm(0.014), [0.042, 0.1, 0.04], [-0.3, 1, 0]);
    // stora bröstmuskeln: bred platta från bröstbenet mot överarmen med tydlig nederkant
    pa('brost', 0.06, [0.07 * ax, 1.375, 0], [0.15, 0.05, 1], hm(0.014), [0.07, 0.09 * ax, 0.065], [1, 0.22, -0.2]); // bred, platt platta, mjuk nedre kant
    for (let i = 0; i < 3; i++) pa('brost', km(0.01), [0.06, 1.27 - i * 0.034, 0], [0.82, -0.1, 0.55], hm(0.0025), [0.013, 0.02, 0.014], [0.55, 1, 0]); // serratus
    if (kvinna) pa('brost', 0.045, [0.066, 1.29, 0], [0.22, -0.12, 1], 0.03, [0.054, 0.05, 0.042], [0.1, 1, 0.35]); // bröstet (mjukt, naturligt)

    /* Buken och ländryggen (grupp mage, speglas) */
    sEll('mage', 0, [0, 1.1, -0.008], [0.132 * mi, 0.17, 0.092]); // kärnan
    // raka bukmuskeln: två halvor (dalen emellan blir linea alba) i tre fält per sida – mjuka övergångar
    if (kvinna) pa('mage', 0.03, [0, 1.12, 0], [0, 0, 1], 0.006, [0.055 * mi, 0.15, 0.03]); // kvinnoformen: en slät platta utan mittfåra
    else for (const [y, l] of [[1.2, 0.05], [1.13, 0.045], [1.055, 0.055]]) pa('mage', km(0.014), [0.026 * mi, y, 0], [0.12, 0, 1], hm(0.008), [0.028 * mi, l, 0.028]);
    pa('mage', km(0.024), [0.08, 1.05, 0], [1, 0, 0.4], hm(0.011), [0.035, 0.07, 0.028]); // sneda bukmuskeln
    pa('mage', km(0.02), [0.04, 1.2, 0], [0.2, 0, -1], hm(0.012), [0.026, 0.08, 0.028]); // ryggresaren, övre
    pa('mage', km(0.02), [0.041, 1.05, 0], [0.2, 0, -1], hm(0.017), [0.028, 0.09, 0.03]); // ryggresaren, nedre
    fara1('mage', 0.004, [0, 1.045, 0], [0, 0, 1], [0.006, 0.008, 0.008], 0.0035); // naveln

    /* Bäckenet och sätet (grupp backen, speglas) – slät och neutral */
    sEll('backen', 0, [0, 0.915, -0.012], [0.128 * hf, 0.11, 0.094]); // bäckenet (smalare upptill – ingen kant mot midjan)
    sEll('backen', 0.05, [0, 0.915, 0.024], [0.09 * hf, 0.07, 0.055]); // nedre buken
    sEll('backen', 0.035, [0, 0.862, 0.004], [0.046, 0.042, 0.058]); // grenen (slät)
    pa('backen', 0.05, [0.09 * hf, 0.915, 0], [1, 0, -0.2], 0.004, [0.045, 0.08, 0.06]); // gluteus medius/trochanter
    pa('backen', 0.045, [0.062 * hf, 0.875, -0.02], [0.18, -0.1, -1], kvinna ? 0.05 : 0.045, [0.072 * hf, 0.086, 0.085], [0.08, 1, 0]); // stora sätesmuskeln (jämn rundad form)

    /* Armarna (grupp overarm/underarm, speglas): A-position ~25°, lätt böjd armbåge, handflatan mot låret */
    const S = [0.176 * ax, 1.447, -0.018];
    const E = add(S, mul(norm([0.41, -0.91, -0.06]), 0.29 * (kvinna ? 0.97 : 1)));
    const W = add(E, mul(norm([0.47, -0.86, 0.2]), 0.255 * (kvinna ? 0.97 : 1)));
    const UA = led(S, E, [0, 0, 1]), FA = led(E, W, [0, 0, 1]);
    const HD = norm([0.4, -0.91, 0.1]);
    const HA = led(W, add(W, mul(HD, 0.19)), [0, 0.1, 1]); // handens ram: fram = tummens sida, ut = handryggen
    sKon('overarm', 0, add(S, [0.004, 0.004, 0]), E, 0.045 * ar, 0.033 * ar); // överarmens stomme
    sEll('overarm', 0.03, add(S, [0.012, 0.012, 0]), [0.048 * ar, 0.036, 0.05 * ar]); // axelns topp
    sEll('overarm', 0.016, E, [0.032 * ar, 0.033, 0.029 * ar], UA.ned, UA.fram); // armbågen
    // deltoideus: en jämn rund kappa över axeln (de tre delarna smälter ihop – inga bulor)
    mus('overarm', 0.04, UA, 0.16, 90, hm(0.014) * ar, [0.04, 0.09, 0.035]);
    mus('overarm', 0.04, UA, 0.14, 35, hm(0.012) * ar, [0.036, 0.082, 0.032]);
    mus('overarm', 0.04, UA, 0.16, 145, hm(0.012) * ar, [0.036, 0.082, 0.032]);
    mus('overarm', km(0.012), UA, 0.57, 0, hm(0.016) * ar, [0.026, 0.1, 0.026]); // biceps
    mus('overarm', km(0.012), UA, 0.47, -165, hm(0.015) * ar, [0.027, 0.115, 0.026]); // triceps, långa huvudet
    mus('overarm', km(0.012), UA, 0.4, 135, hm(0.011) * ar, [0.021, 0.085, 0.022]); // triceps, laterala huvudet
    mus('overarm', km(0.012), UA, 0.74, 75, hm(0.006) * ar, [0.017, 0.055, 0.016]); // brachialis
    pa('overarm', 0.012, UA.at(1), UA.dir(180), 0.006, [0.014, 0.018, 0.012], UA.ned); // armbågsutskottet
    sKon('underarm', 0, E, W, 0.033 * ar, 0.02 * ar); // underarmens stomme
    sEll('underarm', 0.014, W, [0.016, 0.02, 0.026], FA.ned, FA.fram); // handleden
    mus('underarm', km(0.014), FA, 0.22, 50, hm(0.014) * ar, [0.026, 0.1, 0.026]); // brachioradialis
    mus('underarm', km(0.014), FA, 0.3, -45, hm(0.012) * ar, [0.026, 0.11, 0.024]); // böjarna
    mus('underarm', km(0.014), FA, 0.32, 135, hm(0.008) * ar, [0.022, 0.1, 0.02]); // sträckarna
    sEll('underarm', 0.014, HA.at(0.24), [0.0155, 0.05, 0.04], HA.ned, HA.fram); // handflatan
    const FD = norm(add(HA.ned, mul(HA.ut, -0.2)));
    ell('underarm', 0.012, HA.at(0.66, -0.005, -0.004), [0.011, 0.052, 0.035], FD, HA.fram); // fingrarna
    ell('underarm', 0.014, HA.at(0.2, -0.008, 0.024), [0.014, 0.03, 0.017], HA.ned, HA.fram); // tumvalken
    kon('underarm', 0.012, HA.at(0.1, -0.004, 0.032), HA.at(0.46, -0.016, 0.046), 0.0122, 0.0085); // tummen

    /* Benen (grupp lar/vad/fot per sida): fötterna axelbrett, tårna lätt utåt */
    const BEN = {};
    const ben = (sida) => {
      const s = sida > 0 ? 'V' : 'H', g1 = `lar${s}`, g2 = `vad${s}`, g3 = `fot${s}`;
      const Hp = [0.086 * hf * sida, 0.918, 0];
      const K = [0.102 * sida, 0.505, 0.012];
      const A = [0.126 * sida, 0.083, -0.012];
      const lar = led(Hp, K, [0, 0, 1], sida), vad = led(K, A, [0, 0, 1], sida);
      const ff = norm([0.15 * sida, 0, 1]), fu = [0, 1, 0], fs = mul(cross(fu, ff), sida);
      const f = (a, u, o) => add(A, add(add(mul(ff, a), mul(fu, u)), mul(fs, o)));
      const fe = (g, k, a, u, o, r) => ell(g, k, f(a, u, o), r, fu, ff); // r = [sida, upp, fram]
      sKon(g1, 0, add(Hp, [0.014 * sida, 0.03, -0.006]), K, 0.076 * bn, 0.048); // lårets stomme
      sEll(g1, 0.03, lar.at(1, 0, -0.002), [0.047, 0.05, 0.044], lar.ned, lar.fram); // knät (lårbenets knotor)
      mus(g1, km(0.012), lar, 0.42, 0, hm(0.015) * bn, [0.03, 0.17, 0.028]); // rectus femoris
      mus(g1, km(0.015), lar, 0.5, 70, hm(0.018) * bn, [0.04, 0.19, 0.032]); // vastus lateralis
      mus(g1, km(0.012), lar, 0.8, -45, hm(0.018) * bn, [0.032, 0.072, 0.03]); // vastus medialis (droppen)
      mus(g1, km(0.02), lar, 0.24, -100, hm(0.022) * bn, [0.045, 0.13, 0.036]); // adduktorerna
      mus(g1, km(0.02), lar, 0.1, 80, hm(0.006), [0.024, 0.065, 0.02]); // tensor fasciae latae
      mus(g1, km(0.012), lar, 0.5, 150, hm(0.016) * bn, [0.03, 0.17, 0.028]); // biceps femoris
      mus(g1, km(0.012), lar, 0.5, -150, hm(0.016) * bn, [0.03, 0.17, 0.028]); // semitendinosus
      mus(g1, 0.012, lar, 0.985, 0, 0.007, [0.023, 0.026, 0.014]); // knäskålen
      sKon(g2, 0, vad.at(0.03), A, 0.05, 0.022); // underbenets stomme
      sEll(g2, 0.03, A, [0.026, 0.03, 0.029], vad.ned, vad.fram); // fotleden (smälter in, ingen krage)
      kon(g2, 0.025, vad.at(0.035, 0, 0.042), vad.at(0.11, 0, 0.034), 0.011, 0.01); // knäskålssenan
      mus(g2, km(0.018), vad, 0.28, -150, hm(0.036), [0.034, 0.105, 0.04]); // vaden, inre huvudet (lägre)
      mus(g2, km(0.018), vad, 0.23, 150, hm(0.03), [0.029, 0.09, 0.036]); // vaden, yttre huvudet (högre)
      mus(g2, km(0.018), vad, 0.52, 180, hm(0.013), [0.045, 0.12, 0.026]); // soleus
      { // tibialis anterior som "round cone" längs skenbenet (exakt avstånd – en lång smal ellipsoid gav en prick vid spetsen)
        // tunnas ut och sjunker in i stommen mot fotleden, så att slutet inte blir ett steg
        const n = vad.dir(30), a1 = yta(g2, vad.at(0.18), n), a3 = yta(g2, vad.at(0.85), n);
        kon(g2, 0.035, add(a1, mul(n, 0.006 - 0.016)), add(a3, mul(n, -0.003 - 0.008)), 0.016, 0.008);
      }
      kon(g2, 0.022, vad.at(0.62, 0, -0.026), f(-0.05, -0.018, 0), 0.0105, 0.0095); // hälsenan
      sEll(g3, 0, f(-0.04, -0.048, 0), [0.03, 0.034, 0.036], fu, ff); // hälen
      fe(g3, 0.03, 0.05, -0.048, 0.003, [0.036, 0.03, 0.078]); // mellanfoten
      fe(g3, 0.024, 0.135, -0.064, 0.005, [0.043, 0.02, 0.04]); // trampdynan
      fe(g3, 0.012, 0.172, -0.071, 0.008, [0.037, 0.0135, 0.026]); // tårna
      fe(g3, 0.012, 0.176, -0.069, -0.022, [0.0125, 0.0135, 0.022]); // stortån
      fe(g3, 0.018, 0.002, 0.002, -0.024, [0.008, 0.012, 0.01]); // inre fotknölen
      fe(g3, 0.018, -0.01, -0.01, 0.024, [0.008, 0.012, 0.01]); // yttre fotknölen
      ur(fe)(g3, 0.014, 0.05, -0.088, -0.036, [0.02, 0.022, 0.05]); // fotvalvet
      BEN[s] = { H: Hp, K, A, lar, vad, ff, fu, fs };
    };
    ben(1); ben(-1);

    const GRUPPER = [
      { namn: 'brost', k: 0, spegel: true }, { namn: 'mage', k: 0.1, spegel: true }, { namn: 'backen', k: 0.09, spegel: true },
      { namn: 'huvud', k: 0.03, spegel: true }, { namn: 'overarm', k: 0.055, spegel: true }, { namn: 'underarm', k: 0.016, spegel: true },
      { namn: 'larV', k: 0.034 }, { namn: 'larH', k: 0.034 }, { namn: 'vadV', k: 0.02 }, { namn: 'vadH', k: 0.02 },
      { namn: 'fotV', k: 0.035 }, { namn: 'fotH', k: 0.035 },
    ];
    const GRANS = 0.12; // måste vara större än gruppernas största k, annars blir det en skarv där lådan tar över
    for (const g of GRUPPER) {
      const lo = [9, 9, 9], hi = [-9, -9, -9];
      const ta = (p, e) => { for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i] - e[i]); hi[i] = Math.max(hi[i], p[i] + e[i]); } };
      for (const d of DELAR.filter((x) => x.grupp === g.namn && !x.ur)) {
        if (d.typ === 'k') { ta(d.a, [d.ra, d.ra, d.ra]); ta(d.b, [d.rb, d.rb, d.rb]); continue; }
        const e = d.b ? [0, 1, 2].map((i) => Math.hypot(d.b.u[i] * d.r[0], d.b.w[i] * d.r[1], d.b.v[i] * d.r[2])) : d.r;
        ta(d.c, e);
      }
      g.c = mul(add(lo, hi), 0.5); g.h = add(mul(sub(hi, lo), 0.5), [0.008, 0.008, 0.008]);
    }
    const LADA0 = (() => {
      const lo = [9, 9, 9], hi = [-9, -9, -9];
      for (const g of GRUPPER) for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) for (const m of g.spegel ? [-1, 1] : [1]) {
        const p = [(g.c[0] + sx * g.h[0]) * m, g.c[1] + sy * g.h[1], g.c[2] + sz * g.h[2]];
        for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
      }
      return { lo: add(lo, [-0.02, -0.02, -0.02]), hi: add(hi, [0.02, 0.02, 0.02]) };
    })();
    const LADA = { lo: mul(LADA0.lo, SK), hi: mul(LADA0.hi, SK) };

    // En grupps kod: punkten speglas (|x|) för symmetriska grupper, lådan avgör om detaljerna behövs
    const gruppKropp = (gr) => {
      const ds = DELAR.filter((x) => x.grupp === gr.namn);
      // mjukt |x| (radie ~9 mm; delar på mittlinjen behöver radie > 9 mm) så att speglingen inte ger en kant mitt på kroppen
      const sp = gr.spegel ? 'qx=Math.sqrt(x*x+0.000081);' : 'qx=x;';
      const box = `{const ex=Math.abs(qx-${n7(gr.c[0])})-${n7(gr.h[0])},ey=Math.abs(qy-${n7(gr.c[1])})-${n7(gr.h[1])},ez=Math.abs(qz-${n7(gr.c[2])})-${n7(gr.h[2])};`
        + 'const mx=ex>0?ex:0,my=ey>0?ey:0,mz=ez>0?ez:0;b=Math.sqrt(mx*mx+my*my+mz*mz)+Math.min(Math.max(ex,ey,ez),0);}';
      const sfar = (d) => (d.typ === 'k' ? [lerp(d.a, d.b, 0.5), len(sub(d.b, d.a)) / 2 + Math.max(d.ra, d.rb)] : [d.c, Math.max(...d.r)]);
      const vakt = (d) => { const [c, r] = sfar(d); return `{const sx=qx-${n7(c[0])},sy=qy-${n7(c[1])},sz=qz-${n7(c[2])},lb=Math.sqrt(sx*sx+sy*sy+sz*sz)-${n7(r * 1.35 + 0.02)};`
        + (d.ur ? `if(lb<${n7(d.k)}-g){` : `if(lb<g+${n7(d.k)}){`); };
      const detalj = `if(b<${GRANS}){` + delKod(ds[0]) + 'g=t;' + ds.slice(1).map((d) => vakt(d) + delKod(d) + (d.ur ? `t=-t;${smax('g', 't', d.k)}` : smin('g', 't', d.k)) + '}}').join('') + 'b=g>b?g:b;}'; // aldrig närmare än lådan: ellipsoidernas närmevärde underskattar långt bort (gav skarvar)
      return `${sp}qy=y;qz=z;${box}${detalj}`;
    };
    // Hela kroppen: punkten skalas till mannens mått (1,80 m) och avståndet tillbaka
    const KARTA_KOD = `function(x0,y0,z0){const x=x0*${n7(1 / SK)},y=y0*${n7(1 / SK)},z=z0*${n7(1 / SK)};let qx=0,qy=0,qz=0,d=0,b=0,t=0,g=0;\n`
      + GRUPPER.map((gr, i) => gruppKropp(gr) + (i ? smin('d', 'b', gr.k) : 'd=b;')).join('\n') + `\n${smax('d', '(-y)', 0.004)}return d*${n7(SK)};}`;
    const GRUPP_KOD = GRUPPER.map((gr) => `function(x,y,z){let qx=0,qy=0,qz=0,b=0,t=0,g=0;${gruppKropp(gr)}return b;}`);
    const karta = new Function(`return ${KARTA_KOD}`)();
    const GF = GRUPP_KOD.map((k) => new Function(`return ${k}`)());
    const kartaV = (p) => karta(p[0], p[1], p[2]);
    const karta0 = (p) => karta(p[0] * SK, p[1] * SK, p[2] * SK) / SK;
    const pytan = (p, nn) => { let q = p; for (let j = 0; j < 14; j++) q = sub(q, mul(nn, karta0(q))); return q; };

    // Lederna och gränserna som klassningen behöver (ren data i mannens mått – skickas till Workern som JSON)
    const benJ = (b) => ({ H: b.H, K: b.K, A: b.A, fram: b.lar.fram, ut: b.lar.ut });
    const J = { id: RID, sk: SK, S, E, W: HA.at(0.4), hals: 1.592, axelX: 0.132 * ax, ljumskeX: 0.07 * hf, ben: { V: benJ(BEN.V), H: benJ(BEN.H) } };

    // Regionernas punkt på huden (c inne i kroppen, n = riktningen ut), radien för värmen – i mannens mått, skalas sist
    const ANK = {};
    const satt = (id, c, nn, R) => { const n0 = norm(nn); ANK[id] = { p: mul(pytan(c, n0), SK), n: n0, R: R * SK }; };
    const satt2 = (id, c, nn, R) => { satt(`${id}-v`, c, nn, R); satt(`${id}-h`, spegla(c), spegla(nn), R); };
    satt('huvud', [0, 1.72, 0], [0, 0.25, 1], 0.12);
    satt('nacke', [0, 1.53, -0.02], [0, 0.1, -1], 0.07);
    satt('brost', [0, 1.35, 0], [0, 0, 1], 0.15);
    satt('ovre-rygg', [0, 1.36, -0.03], [0, 0, -1], 0.16);
    satt('landrygg', [0, 1.04, -0.02], [0, 0, -1], 0.11);
    satt('mage', [0, 1.11, 0.02], [0, 0, 1], 0.12);
    satt2('axel', add(S, [0.012, 0.006, 0]), [0.85, 0.55, 0.15], 0.085);
    satt2('armbage', E, [0.9, 0.35, -0.3], 0.065);
    satt2('handled', W, [0.9, 0.35, 0.3], 0.055);
    satt2('hoft', [0.13 * hf, 0.925, -0.005], [1, 0.1, 0.15], 0.085);
    satt2('ljumske', [0.066 * hf, 0.86, 0.03], [0.25, -0.2, 1], 0.06);
    for (const [s, b] of [['v', BEN.V], ['h', BEN.H]]) {
      satt(`lar-${s}`, b.lar.at(0.45, 0, 0.01), b.lar.fram, 0.13);
      satt(`baklar-${s}`, b.lar.at(0.5, 0, -0.02), mul(b.lar.fram, -1), 0.13);
      satt(`kna-${s}`, b.K, b.vad.fram, 0.068);
      satt(`vad-${s}`, b.vad.at(0.3, 0, -0.02), mul(b.vad.fram, -1), 0.095);
      satt(`fotled-${s}`, b.A, add(b.fs, mul(b.ff, 0.4)), 0.058);
    }
    const ankLista = REGIONER.map((r) => ANK[r.id]);
    // Måtten för kameran: hjässan och händernas yttersta punkt
    const ytter = add(HA.at(1), [0.02, 0, 0]);
    const MATT = { topp: 1.8 * SK, bredd: ytter[0] * SK };
    const BENS = { V: { A: mul(BEN.V.A, SK) }, H: { A: mul(BEN.H.A, SK) } };
    return { form: formNamn, karta, kartaV, GF, J, KARTA_KOD, GRUPP_KOD, LADA, ANK: ankLista, BEN: BENS, MATT, natCache: {} };
  }
  // Modellens kropp före och efter laddningen: samma fält som SDF-kroppen använder i montera (MATT, BEN, ANK) + M (nätet)
  const modellKropp = (namn) => {
    const ank = {}, sp = (p) => [-p[0], p[1], p[2]], n3 = (a) => norm(a);
    const satt = (id, c, n, R) => { ank[id] = { p: c, n: n3(n), R }; };
    ankPunkter(LM, satt, (id, c, n, R) => { satt(`${id}-v`, c, n, R); satt(`${id}-h`, sp(c), sp(n), R); }, lerp);
    return { form: namn, mesh: true, M: null, ANK: REGIONER.map((r) => ank[r.id]), MATT: { topp: 1.8, bredd: 0.48 },
      BEN: { V: { A: LM.A }, H: { A: sp(LM.A) } } };
  };
  const KROPPAR = {};
  const kropp = (namn) => KROPPAR[namn] || (KROPPAR[namn] = byggKropp(FORMER[namn] ? namn : 'man'));

  /* ---- 5. klassning: punkt på huden → region (körs i Workern för varje hörn och i huvudtråden vid tryck).
     Den grupp vars SDF ligger närmast avgör kroppsdelen; läget längs leden och fram/bak avgör regionen.
     Punkten kommer i skalade koordinater och räknas om till mannens mått (J.sk). ---------- */
  function klassa(x0, y0, z0, GF, J) {
    const R = J.id, x = x0 / J.sk, y = y0 / J.sk, z = z0 / J.sk;
    let bi = 0, bd = 1e9;
    for (let i = 0; i < GF.length; i++) { const d = GF[i](x, y, z); if (d < bd) { bd = d; bi = i; } }
    const ax = x < 0 ? -x : x, s = x >= 0 ? '-v' : '-h';
    const langs = (px, py, pz, a, b) => { const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2]; return ((px - a[0]) * bx + (py - a[1]) * by + (pz - a[2]) * bz) / (bx * bx + by * by + bz * bz); };
    switch (bi) {
      case 3: return y > J.hals - z * 0.25 ? R.huvud : R.nacke;
      case 0:
        if (y > 1.5 && ax < 0.085) return R.nacke;
        if (ax > J.axelX && y > 1.38) return R[`axel${s}`];
        return z > -0.012 ? R.brost : R['ovre-rygg'];
      case 1: return z > 0.012 ? R.mage : R.landrygg;
      case 2:
        if (z < -0.025) return y > 0.975 ? R.landrygg : R[`hoft${s}`];
        return ax < J.ljumskeX ? R[`ljumske${s}`] : R[`hoft${s}`];
      case 4: return langs(ax, y, z, J.S, J.E) < 0.55 ? R[`axel${s}`] : R[`armbage${s}`];
      case 5: return langs(ax, y, z, J.E, J.W) < 0.35 ? R[`armbage${s}`] : R[`handled${s}`];
      case 6: case 7: {
        const b = J.ben[bi === 6 ? 'V' : 'H'], s2 = bi === 6 ? '-v' : '-h';
        const t = langs(x, y, z, b.H, b.K);
        if (t > 0.86) return R[`kna${s2}`];
        const dx = x - (b.H[0] + (b.K[0] - b.H[0]) * t), dy = y - (b.H[1] + (b.K[1] - b.H[1]) * t), dz = z - (b.H[2] + (b.K[2] - b.H[2]) * t);
        const fr = dx * b.fram[0] + dy * b.fram[1] + dz * b.fram[2], ut = dx * b.ut[0] + dy * b.ut[1] + dz * b.ut[2];
        if (t < 0.24 && ut > 0.035) return R[`hoft${s2}`];
        if (t < 0.2 && ut < -0.015 && fr > -0.02) return R[`ljumske${s2}`];
        return fr > -0.012 ? R[`lar${s2}`] : R[`baklar${s2}`];
      }
      case 8: case 9: {
        const b = J.ben[bi === 8 ? 'V' : 'H'], s2 = bi === 8 ? '-v' : '-h';
        const t = langs(x, y, z, b.K, b.A);
        if (t < 0.13) return R[`kna${s2}`];
        if (t > 0.86) return R[`fotled${s2}`];
        return R[`vad${s2}`];
      }
      default: return R[`fotled${bi === 10 ? '-v' : '-h'}`];
    }
  }

  /* ---- 6. nätet: surface nets i smala skikt (från app/avatar.js). Bygget delas i lodräta skivor (cellager c0 … c1−1)
     som flera Workers gör samtidigt; varje skiva räknar också lagret under sig (c0−1) så att skarvarna kan svetsas ihop
     (forsta/sista = cell → hörn i skivans första och sista lager). ----------------- */
  function byggNat(karta, h, lo, hi, c0 = 0, c1 = 1e9) {
    const G = 4;
    const nx = Math.ceil((hi[0] - lo[0]) / h) + 1, ny = Math.ceil((hi[1] - lo[1]) / h) + 1, nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
    const gx = Math.ceil((nx - 1) / G), gy = Math.ceil((ny - 1) / G), gz = Math.ceil((nz - 1) / G), gh = G * h;
    const aktiv = new Uint8Array(gx * gy * gz), troskel = 0.87 * gh * 1.15 + 1.5 * h;
    const gj0 = Math.max(0, (((c0 - 1) / G) | 0) - 1), gj1 = Math.min(gy, ((Math.min(c1, ny) / G) | 0) + 2);
    for (let j = gj0; j < gj1; j++) for (let k = 0; k < gz; k++) for (let i = 0; i < gx; i++) {
      if (Math.abs(karta(lo[0] + (i + 0.5) * gh, lo[1] + (j + 0.5) * gh, lo[2] + (k + 0.5) * gh)) < troskel) aktiv[(j * gz + k) * gx + i] = 1;
    }
    const NL = nx * nz, CW = nx - 1, CL = (nx - 1) * (nz - 1);
    let vA = new Float32Array(NL), vB = new Float32Array(NL), cA = new Int32Array(CL).fill(-1), cB = new Int32Array(CL).fill(-1);
    const behov = new Uint8Array(NL), blockLager = new Uint8Array(gx * gz);
    let pos = new Float32Array(3 << 16), nv = 0, ind = new Uint32Array(6 << 16), ni = 0;
    const nyttHorn = (x, y, z) => { if (nv * 3 + 3 > pos.length) { const p = new Float32Array(pos.length * 2); p.set(pos); pos = p; } pos[nv * 3] = x; pos[nv * 3 + 1] = y; pos[nv * 3 + 2] = z; return nv++; };
    const quad = (a, b, c, d) => {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      if (ni + 6 > ind.length) { const x = new Uint32Array(ind.length * 2); x.set(ind); ind = x; }
      const d1 = (pos[a * 3] - pos[c * 3]) ** 2 + (pos[a * 3 + 1] - pos[c * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[c * 3 + 2]) ** 2;
      const d2 = (pos[b * 3] - pos[d * 3]) ** 2 + (pos[b * 3 + 1] - pos[d * 3 + 1]) ** 2 + (pos[b * 3 + 2] - pos[d * 3 + 2]) ** 2;
      if (d1 < d2) { ind[ni++] = a; ind[ni++] = b; ind[ni++] = c; ind[ni++] = a; ind[ni++] = c; ind[ni++] = d; }
      else { ind[ni++] = a; ind[ni++] = b; ind[ni++] = d; ind[ni++] = b; ind[ni++] = c; ind[ni++] = d; }
    };
    const fyll = (j, v) => {
      v.fill(1); behov.fill(0); blockLager.fill(0);
      for (const cj of [((j - 1) / G) | 0, (j / G) | 0]) {
        if (cj < 0 || cj >= gy || (cj === ((j - 1) / G | 0) && j === 0)) continue;
        for (let k = 0; k < gz; k++) for (let i = 0; i < gx; i++) if (aktiv[(cj * gz + k) * gx + i]) blockLager[k * gx + i] = 1;
      }
      for (let ck = 0; ck < gz; ck++) for (let ci = 0; ci < gx; ci++) {
        if (!blockLager[ck * gx + ci]) continue;
        for (let k = ck * G; k <= Math.min(nz - 1, ck * G + G); k++) for (let i = ci * G; i <= Math.min(nx - 1, ci * G + G); i++) behov[k * nx + i] = 1;
      }
      const y = lo[1] + j * h;
      for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) if (behov[k * nx + i]) v[k * nx + i] = karta(lo[0] + i * h, y, lo[2] + k * h);
    };
    const KX = [0, 1, 0, 1, 0, 1, 0, 1], KY = [0, 0, 0, 0, 1, 1, 1, 1], KZ = [0, 0, 1, 1, 0, 0, 1, 1];
    const KANTER = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7];
    const val = new Float32Array(8);
    const js = Math.max(1, c0), je = Math.min(ny - 1, c1);
    let forsta = null;
    fyll(js - 1, vB);
    for (let j = js; j <= je; j++) {
      let t = vA; vA = vB; vB = t; fyll(j, vB);
      let c = cA; cA = cB; cB = c; cB.fill(-1);
      const cj = ((j - 1) / G) | 0;
      for (let ck = 0; ck < gz; ck++) for (let ci = 0; ci < gx; ci++) {
        if (!aktiv[(cj * gz + ck) * gx + ci]) continue;
        for (let k = ck * G; k < Math.min(nz - 1, ck * G + G); k++) for (let i = ci * G; i < Math.min(nx - 1, ci * G + G); i++) {
          const o = k * nx + i;
          val[0] = vA[o]; val[1] = vA[o + 1]; val[2] = vA[o + nx]; val[3] = vA[o + nx + 1];
          val[4] = vB[o]; val[5] = vB[o + 1]; val[6] = vB[o + nx]; val[7] = vB[o + nx + 1];
          let m = 0; for (let q = 0; q < 8; q++) if (val[q] < 0) m |= 1 << q;
          if (m === 0 || m === 255) continue;
          let sx = 0, sy = 0, sz = 0, nk = 0;
          for (let e = 0; e < 24; e += 2) {
            const a = KANTER[e], b = KANTER[e + 1], va = val[a], vb = val[b];
            if ((va < 0) === (vb < 0)) continue;
            const u = va / (va - vb);
            sx += KX[a] + (KX[b] - KX[a]) * u; sy += KY[a] + (KY[b] - KY[a]) * u; sz += KZ[a] + (KZ[b] - KZ[a]) * u; nk++;
          }
          cB[k * CW + i] = nyttHorn(lo[0] + (i + sx / nk) * h, lo[1] + (j - 1 + sy / nk) * h, lo[2] + (k + sz / nk) * h);
        }
      }
      if (j - 1 < c0) { forsta = cB.slice(); continue; }
      for (let k = 0; k < nz - 1; k++) for (let i = 0; i < nx - 1; i++) {
        const ci = k * CW + i; if (cB[ci] < 0) continue;
        const o = k * nx + i, s = vA[o] < 0;
        if (i > 0 && k > 0 && s !== (vB[o] < 0)) quad(cB[ci - CW - 1], cB[ci - CW], cB[ci], cB[ci - 1]);
        if (k > 0 && s !== (vA[o + 1] < 0)) quad(cA[ci - CW], cB[ci - CW], cB[ci], cA[ci]);
        if (i > 0 && s !== (vA[o + nx] < 0)) quad(cA[ci - 1], cA[ci], cB[ci], cB[ci - 1]);
      }
    }
    const ut = new Float32Array(nv * 7), e = 0.0012;
    const grad = (x, y, z, g) => {
      const a = karta(x + e, y - e, z - e), b = karta(x - e, y - e, z + e), c = karta(x - e, y + e, z - e), d = karta(x + e, y + e, z + e);
      g[0] = a - b - c + d; g[1] = -a - b + c + d; g[2] = -a + b - c + d;
      const l = Math.hypot(g[0], g[1], g[2]) || 1; g[0] /= l; g[1] /= l; g[2] /= l;
    };
    const g = [0, 0, 0];
    for (let v = 0; v < nv; v++) {
      let x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
      const d0 = karta(x, y, z); grad(x, y, z, g); x -= g[0] * d0; y -= g[1] * d0; z -= g[2] * d0;
      let o = 0, w = 1;
      for (let s = 1; s <= 2; s++) { const hh = 0.022 * s; o += (hh - karta(x + g[0] * hh, y + g[1] * hh, z + g[2] * hh)) * w; w *= 0.55; }
      pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
      ut.set([x, y, z, g[0], g[1], g[2], Math.max(0, Math.min(1, 1 - o * 4.5))], v * 7);
    }
    for (let i = 0; i < ni; i += 3) {
      const a = ind[i] * 7, b = ind[i + 1] * 7, c = ind[i + 2] * 7;
      const ux = ut[b] - ut[a], uy = ut[b + 1] - ut[a + 1], uz = ut[b + 2] - ut[a + 2];
      const vx = ut[c] - ut[a], vy = ut[c + 1] - ut[a + 1], vz = ut[c + 2] - ut[a + 2];
      const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      if (fx * (ut[a + 3] + ut[b + 3] + ut[c + 3]) + fy * (ut[a + 4] + ut[b + 4] + ut[c + 4]) + fz * (ut[a + 5] + ut[b + 5] + ut[c + 5]) < 0) { const t = ind[i + 1]; ind[i + 1] = ind[i + 2]; ind[i + 2] = t; }
    }
    return { data: ut, index: ind.slice(0, ni), horn: nv, forsta, sista: cB.slice() };
  }
  // En skiva av nätet + regionen per hörn (körs i Workern): 8 tal per hörn (position, normal, ocklusion, region)
  function byggDel(karta, GF, J, h, lo, hi, c0, c1) {
    const r = byggNat(karta, h, lo, hi, c0, c1), ut = new Float32Array(r.horn * 8);
    for (let v = 0; v < r.horn; v++) {
      for (let k = 0; k < 7; k++) ut[v * 8 + k] = r.data[v * 7 + k];
      ut[v * 8 + 7] = klassa(r.data[v * 7], r.data[v * 7 + 1], r.data[v * 7 + 2], GF, J);
    }
    return { data: ut, index: r.index, horn: r.horn, forsta: r.forsta, sista: r.sista, c0 };
  }
  // Skivorna svetsas ihop (skivans första lager = förra skivans sista) och kurvaturen räknas på hela nätet:
  // hur normalerna vrider sig mot grannarna, två varv utjämning. Negativ i fårorna mellan musklerna, positiv på
  // musklernas rundning – shadern tecknar konturerna med den, som en anatomisk studie. 9 tal per hörn.
  function slaIhop(delar) {
    delar.sort((a, b) => a.c0 - b.c0);
    let n = 0, ni = 0; const bas0 = [];
    for (const d of delar) { bas0.push(n); n += d.horn; ni += d.index.length; }
    const pos = new Float32Array(n * 8), ind = new Uint32Array(ni), om = new Int32Array(n);
    let o = 0;
    delar.forEach((d, w) => {
      pos.set(d.data, bas0[w] * 8);
      for (let v = 0; v < d.horn; v++) om[bas0[w] + v] = bas0[w] + v;
      if (w > 0 && d.forsta) {
        const f = delar[w - 1].sista;
        for (let c = 0; c < d.forsta.length; c++) if (d.forsta[c] >= 0 && f[c] >= 0) om[bas0[w] + d.forsta[c]] = bas0[w - 1] + f[c];
      }
      for (let i = 0; i < d.index.length; i++) ind[o++] = om[bas0[w] + d.index[i]];
    });
    // hörnen som svetsades bort används inte längre – packa om
    const anv = new Uint8Array(n); for (let i = 0; i < ni; i++) anv[ind[i]] = 1;
    const nytt = new Int32Array(n); let m = 0; for (let v = 0; v < n; v++) nytt[v] = anv[v] ? m++ : -1;
    for (let i = 0; i < ni; i++) ind[i] = nytt[ind[i]];
    const d = new Float32Array(m * 8); for (let v = 0; v < n; v++) if (nytt[v] >= 0) d.set(pos.subarray(v * 8, v * 8 + 8), nytt[v] * 8);
    const sum = new Float32Array(m), vikt = new Float32Array(m);
    for (let i = 0; i < ni; i += 3) for (let e = 0; e < 3; e++) {
      const a = ind[i + e], b = ind[i + (e + 1) % 3], A = a * 8, Bb = b * 8;
      const ex = d[Bb] - d[A], ey = d[Bb + 1] - d[A + 1], ez = d[Bb + 2] - d[A + 2], l2 = ex * ex + ey * ey + ez * ez + 1e-12;
      const k = ((d[Bb + 3] - d[A + 3]) * ex + (d[Bb + 4] - d[A + 4]) * ey + (d[Bb + 5] - d[A + 5]) * ez) / l2;
      sum[a] += k; vikt[a] += 1; sum[b] += k; vikt[b] += 1;
    }
    let kv = new Float32Array(m); for (let v = 0; v < m; v++) kv[v] = vikt[v] ? sum[v] / vikt[v] : 0;
    for (let varv = 0; varv < 2; varv++) {
      sum.fill(0); vikt.fill(0);
      for (let i = 0; i < ni; i += 3) for (let e = 0; e < 3; e++) { const a = ind[i + e], b = ind[i + (e + 1) % 3]; sum[a] += kv[b]; vikt[a]++; sum[b] += kv[a]; vikt[b]++; }
      const nk = new Float32Array(m); for (let v = 0; v < m; v++) nk[v] = (kv[v] + (vikt[v] ? sum[v] / vikt[v] : 0)) * 0.5; kv = nk;
    }
    const ut = new Float32Array(m * 9);
    for (let v = 0; v < m; v++) { ut.set(d.subarray(v * 8, v * 8 + 8), v * 9); ut[v * 9 + 8] = Math.tanh(kv[v] / 45); }
    return { data: ut, index: ind, horn: m };
  }
  // Hela nätet i en tråd (reserv utan Worker, och för test i node)
  function byggAllt(karta, GF, J, h, lo, hi) { return slaIhop([byggDel(karta, GF, J, h, lo, hi, 0, 1e9)]); }

  // Cachen: nätet sparas i IndexedDB per kroppsform och upplösning (nyckeln = en hash av SDF-koden), så att det bara
  // byggs första gången på en enhet. Frivilligt – går IndexedDB inte (privat läge) byggs nätet som vanligt.
  const NAT_DB = 'up-halsa-kropp', NAT_VER = 4;
  const hash = (t) => { let a = 0x811c9dc5; for (let i = 0; i < t.length; i++) { a ^= t.charCodeAt(i); a = Math.imul(a, 0x01000193) >>> 0; } return a.toString(36) + t.length.toString(36); };
  const idb = (fn) => new Promise((klar) => {
    let klart = false; const sluta = (v) => { if (!klart) { klart = true; klar(v); } };
    setTimeout(() => sluta(null), 800);
    try {
      const rq = indexedDB.open(NAT_DB, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('nat');
      rq.onerror = () => sluta(null);
      rq.onsuccess = () => { try { fn(rq.result, sluta); } catch (_) { sluta(null); } };
    } catch (_) { sluta(null); }
  });
  const lasCache = (nyckel) => idb((db, klar) => {
    const g = db.transaction('nat', 'readonly').objectStore('nat').get(nyckel);
    g.onsuccess = () => { const r = g.result; db.close(); klar(r && r.data instanceof Float32Array && r.index instanceof Uint32Array ? r : null); };
    g.onerror = () => { db.close(); klar(null); };
  });
  const skrivCache = (nyckel, r) => idb((db, klar) => {
    const t = db.transaction('nat', 'readwrite'), st = t.objectStore('nat');
    // gamla versioner av samma form och upplösning tas bort (nyckeln börjar likadant)
    const del = nyckel.slice(0, nyckel.lastIndexOf(':') + 1);
    const c = st.openCursor();
    c.onsuccess = () => { const x = c.result; if (!x) { const { ms, cache, ...spar } = r; st.put(spar, nyckel); return; } if (String(x.key).startsWith(del) || !String(x.key).startsWith(`${NAT_VER}:`)) x.delete(); x.continue(); };
    t.oncomplete = () => { db.close(); klar(true); }; t.onerror = () => { db.close(); klar(null); };
  });
  const natFor = (K, h) => K.natCache[h] || (K.natCache[h] = (async () => {
    const t0 = performance.now();
    const nyckel = `${NAT_VER}:${K.form}:${h}:${hash(K.KARTA_KOD)}`;
    const cachad = await lasCache(nyckel);
    if (cachad) { cachad.ms = performance.now() - t0; cachad.cache = true; return cachad; }
    const lo = K.LADA.lo, hi = K.LADA.hi, lager = Math.ceil((hi[1] - lo[1]) / h);
    const antal = Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 4) - 1));
    const SKIVOR = Math.max(1, Math.min(lager >> 3, antal * 3)); // fler skivor än arbetare: de blir klara olika fort
    const uppgifter = []; for (let i = 0; i < SKIVOR; i++) uppgifter.push([Math.round((lager * i) / SKIVOR), Math.round((lager * (i + 1)) / SKIVOR)]);
    const lokalt = () => new Promise((klar) => {
      const delar = []; let i = 0;
      const steg = () => { const [a, b] = uppgifter[i++]; delar.push(byggDel(K.karta, K.GF, K.J, h, lo, hi, a, b)); if (i < uppgifter.length) setTimeout(steg, 0); else klar(slaIhop(delar)); };
      setTimeout(steg, 0);
    });
    let r;
    try {
      r = await new Promise((klar, fel) => {
        const kod = `'use strict';const karta=${K.KARTA_KOD};const GF=[${K.GRUPP_KOD.join(',')}];const J=${JSON.stringify(K.J)};\n`
          + `${byggNat.toString()}\n${klassa.toString()}\n${byggDel.toString()}\n`
          + 'onmessage=(e)=>{const d=e.data;const r=byggDel(karta,GF,J,d.h,d.lo,d.hi,d.c0,d.c1);const tr=[r.data.buffer,r.index.buffer,r.sista.buffer];if(r.forsta)tr.push(r.forsta.buffer);postMessage(r,tr);};';
        const url = URL.createObjectURL(new Blob([kod], { type: 'text/javascript' }));
        const arbetare = [], delar = []; let nasta = 0, klara = 0, avbrutet = false;
        const stang = () => { for (const w of arbetare) w.terminate(); URL.revokeObjectURL(url); };
        const ge = (w) => { if (nasta >= uppgifter.length) return; const [c0, c1] = uppgifter[nasta++]; w.postMessage({ h, lo, hi, c0, c1 }); };
        for (let i = 0; i < Math.min(antal, uppgifter.length); i++) {
          const w = new Worker(url); arbetare.push(w);
          w.onmessage = (e) => { if (avbrutet) return; delar.push(e.data); klara++; if (klara === uppgifter.length) { stang(); klar(slaIhop(delar)); } else ge(w); };
          w.onerror = (e) => { e.preventDefault(); if (avbrutet) return; avbrutet = true; stang(); fel(e); };
          ge(w);
        }
      });
    } catch (_) { r = await lokalt(); }
    r.ms = performance.now() - t0;
    skrivCache(nyckel, r);
    return r;
  })());

  /* ---- 6b. modellen: ett riktigt nät av en man (modell/kropp-man.bin) i stället för SDF:en --------------------
     Filen är buren (8 830 hörn, 8 828 fyrhörningar, normaliserad: 1,80 m, fötterna på y = 0, ansiktet mot +z,
     personens vänstra sida = +x) med ocklusion per hörn (byggs av _underlag/halsoapp-modell/bygg-kropp.mjs).
     Här delas den med Catmull-Clark (niva gånger), får normaler, kurvatur och region per hörn och ett rutnät över
     trianglarna för strålträffar (tryck, skymda etiketter och regionernas punkter på huden). byggModell körs i en
     Worker (funktionerna skickas som text) och resultatet cachas i IndexedDB som SDF-nätet. Regionerna avgörs av
     ben (linjestycken med radie) i normaliserade koordinater: närmaste benyta ger kroppsdelen, läget längs benet och
     fram/bak ger regionen (samma regler som klassa). Saknas filen används SDF-kroppen (och alltid för 'kvinna'). */
  const MODELL = { man: { fil: 'modell/kropp-man.bin', ver: 1 } };
  // Lederna i modellens mått (vänster sida, +x; den högra speglas) – uppmätta ur snitten (_underlag/halsoapp-modell/snitt.mjs)
  const LM = {
    S: [0.185, 1.43, -0.035], E: [0.315, 1.165, -0.09], W: [0.418, 0.955, -0.03], T: [0.432, 0.77, 0.01],
    Hp: [0.09, 0.93, 0], K: [0.135, 0.52, 0.02], A: [0.19, 0.095, -0.045], Ta: [0.215, 0.025, 0.11],
  };
  function byggModell(buf, niva, LM, RID) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x314b5055) throw new Error('fel format'); // 'UPK1'
    const nv0 = dv.getUint32(4, true), nf0 = dv.getUint32(8, true);
    const lo = [0, 1, 2].map((k) => dv.getFloat32(12 + k * 4, true)), st = [0, 1, 2].map((k) => dv.getFloat32(24 + k * 4, true));
    const qp = new Uint16Array(buf, 36, nv0 * 3), qf = new Uint16Array(buf, 36 + nv0 * 6, nf0 * 4), qa = new Uint8Array(buf, 36 + nv0 * 6 + nf0 * 8, nv0);
    // hörnen: x, y, z, ocklusion (ocklusionen delas som positionen)
    let P = new Float32Array(nv0 * 4), Q = Uint32Array.from(qf);
    for (let v = 0; v < nv0; v++) { for (let k = 0; k < 3; k++) P[v * 4 + k] = lo[k] + qp[v * 3 + k] * st[k]; P[v * 4 + 3] = qa[v] / 255; }
    // Catmull-Clark för ett slutet fyrhörningsnät, 4 tal per hörn
    const dela = (pos, q) => {
      const nv = pos.length / 4, nf = q.length / 4, kant = new Map(), ek = new Uint32Array(nf * 4);
      const ka = [], kb = [], kf0 = [], kf1 = [];
      for (let f = 0; f < nf; f++) for (let i = 0; i < 4; i++) {
        const a = q[f * 4 + i], b = q[f * 4 + ((i + 1) & 3)], k = a < b ? a * nv + b : b * nv + a;
        let e = kant.get(k);
        if (e === undefined) { e = ka.length; kant.set(k, e); ka.push(a); kb.push(b); kf0.push(f); kf1.push(-1); } else kf1[e] = f;
        ek[f * 4 + i] = e;
      }
      const ne = ka.length, fo = nv + ne, R = new Float32Array((nv + ne + nf) * 4);
      for (let f = 0; f < nf; f++) for (let k = 0; k < 4; k++) R[(fo + f) * 4 + k] = (pos[q[f * 4] * 4 + k] + pos[q[f * 4 + 1] * 4 + k] + pos[q[f * 4 + 2] * 4 + k] + pos[q[f * 4 + 3] * 4 + k]) * 0.25;
      for (let e = 0; e < ne; e++) for (let k = 0; k < 4; k++) {
        const m = pos[ka[e] * 4 + k] + pos[kb[e] * 4 + k];
        R[(nv + e) * 4 + k] = kf1[e] < 0 ? m * 0.5 : (m + R[(fo + kf0[e]) * 4 + k] + R[(fo + kf1[e]) * 4 + k]) * 0.25;
      }
      const Fs = new Float64Array(nv * 4), Rs = new Float64Array(nv * 4), val = new Uint32Array(nv), fval = new Uint32Array(nv);
      for (let f = 0; f < nf; f++) for (let i = 0; i < 4; i++) { const v = q[f * 4 + i]; fval[v]++; for (let k = 0; k < 4; k++) Fs[v * 4 + k] += R[(fo + f) * 4 + k]; }
      for (let e = 0; e < ne; e++) for (const v of [ka[e], kb[e]]) { val[v]++; for (let k = 0; k < 4; k++) Rs[v * 4 + k] += (pos[ka[e] * 4 + k] + pos[kb[e] * 4 + k]) * 0.5; }
      for (let v = 0; v < nv; v++) { const n = val[v]; for (let k = 0; k < 4; k++) R[v * 4 + k] = (Fs[v * 4 + k] / fval[v] + (2 * Rs[v * 4 + k]) / n + (n - 3) * pos[v * 4 + k]) / n; }
      const U = new Uint32Array(nf * 16);
      for (let f = 0; f < nf; f++) for (let i = 0; i < 4; i++) {
        const o = (f * 4 + i) * 4;
        U[o] = q[f * 4 + i]; U[o + 1] = nv + ek[f * 4 + i]; U[o + 2] = fo + f; U[o + 3] = nv + ek[f * 4 + ((i + 3) & 3)];
      }
      return [R, U];
    };
    for (let i = 0; i < niva; i++) [P, Q] = dela(P, Q);
    const nv = P.length / 4, nf = Q.length / 4;
    // normalerna (ytornas diagonalkryss = normal · 2 · area) och trianglarna (kortaste diagonalen)
    const nor = new Float32Array(nv * 3), ind = new Uint32Array(nf * 6);
    for (let f = 0; f < nf; f++) {
      const a = Q[f * 4], b = Q[f * 4 + 1], c = Q[f * 4 + 2], d = Q[f * 4 + 3];
      const ux = P[c * 4] - P[a * 4], uy = P[c * 4 + 1] - P[a * 4 + 1], uz = P[c * 4 + 2] - P[a * 4 + 2];
      const vx = P[d * 4] - P[b * 4], vy = P[d * 4 + 1] - P[b * 4 + 1], vz = P[d * 4 + 2] - P[b * 4 + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const w of [a, b, c, d]) { nor[w * 3] += nx; nor[w * 3 + 1] += ny; nor[w * 3 + 2] += nz; }
      const o = f * 6;
      if (ux * ux + uy * uy + uz * uz <= vx * vx + vy * vy + vz * vz) { ind[o] = a; ind[o + 1] = b; ind[o + 2] = c; ind[o + 3] = a; ind[o + 4] = c; ind[o + 5] = d; }
      else { ind[o] = a; ind[o + 1] = b; ind[o + 2] = d; ind[o + 3] = b; ind[o + 4] = c; ind[o + 5] = d; }
    }
    for (let v = 0; v < nv; v++) { const l = Math.hypot(nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]) || 1; nor[v * 3] /= l; nor[v * 3 + 1] /= l; nor[v * 3 + 2] /= l; }
    // kurvaturen: hur normalerna vrider sig längs kanterna, några varv utjämning (som SDF-nätet, slaIhop)
    const sum = new Float32Array(nv), vikt = new Float32Array(nv);
    const kanter = (fn) => { for (let f = 0; f < nf; f++) for (let i = 0; i < 4; i++) fn(Q[f * 4 + i], Q[f * 4 + ((i + 1) & 3)]); };
    kanter((a, b) => {
      const ex = P[b * 4] - P[a * 4], ey = P[b * 4 + 1] - P[a * 4 + 1], ez = P[b * 4 + 2] - P[a * 4 + 2], l2 = ex * ex + ey * ey + ez * ez + 1e-12;
      const k = ((nor[b * 3] - nor[a * 3]) * ex + (nor[b * 3 + 1] - nor[a * 3 + 1]) * ey + (nor[b * 3 + 2] - nor[a * 3 + 2]) * ez) / l2;
      sum[a] += k; vikt[a]++; sum[b] += k; vikt[b]++;
    });
    let kv = new Float32Array(nv); for (let v = 0; v < nv; v++) kv[v] = vikt[v] ? sum[v] / vikt[v] : 0;
    for (let varv = 0; varv < 2 + niva; varv++) {
      sum.fill(0); vikt.fill(0);
      kanter((a, b) => { sum[a] += kv[b]; vikt[a]++; sum[b] += kv[a]; vikt[b]++; });
      const nk = new Float32Array(nv); for (let v = 0; v < nv; v++) nk[v] = (kv[v] + (vikt[v] ? sum[v] / vikt[v] : 0)) * 0.5; kv = nk;
    }
    // regionerna: närmaste ben (avståndet till linjestycket minus radien)
    const sp = (p) => [-p[0], p[1], p[2]];
    const BEN = [
      ['huvud', [0, 1.615, 0.025], [0, 1.73, 0.01], 0.085, 0.085], ['hals', [0, 1.47, -0.035], [0, 1.6, -0.01], 0.062, 0.058],
      ['brost', [0, 1.24, -0.01], [0, 1.43, -0.02], 0.15, 0.15], ['mage', [0, 1.0, 0.02], [0, 1.24, 0], 0.135, 0.14],
      ['backen', [0, 0.885, 0], [0, 1.0, 0.01], 0.14, 0.135],
    ];
    for (const [s, f] of [['V', (p) => p], ['H', sp]]) BEN.push(
      [`overarm${s}`, f(LM.S), f(LM.E), 0.055, 0.042], [`underarm${s}`, f(LM.E), f(LM.W), 0.042, 0.03], [`hand${s}`, f(LM.W), f(LM.T), 0.034, 0.02],
      [`lar${s}`, f(LM.Hp), f(LM.K), 0.085, 0.056], [`vad${s}`, f(LM.K), f(LM.A), 0.055, 0.034], [`fot${s}`, f(LM.A), f(LM.Ta), 0.04, 0.03]);
    const langs = (p, a, b) => { const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2]; return ((p[0] - a[0]) * bx + (p[1] - a[1]) * by + (p[2] - a[2]) * bz) / (bx * bx + by * by + bz * bz); };
    // fram/bak: bålens mitt i djupled per höjd (z) ur snitten
    const ZM = [[0.85, 0.02], [0.95, 0.025], [1.05, 0.035], [1.15, 0.02], [1.25, -0.005], [1.4, -0.02], [1.5, -0.045]];
    const zMitt = (y) => {
      if (y <= ZM[0][0]) return ZM[0][1];
      for (let i = 1; i < ZM.length; i++) if (y <= ZM[i][0]) { const [a, za] = ZM[i - 1], [b, zb] = ZM[i]; return za + ((zb - za) * (y - a)) / (b - a); }
      return ZM[ZM.length - 1][1];
    };
    const klassaM = (p, n) => {
      let bi = 0, bd = 1e9, bt = 0;
      for (let i = 0; i < BEN.length; i++) {
        const [, a, b, ra, rb] = BEN[i], t0 = langs(p, a, b), t = Math.min(1, Math.max(0, t0));
        const d = Math.hypot(p[0] - a[0] - (b[0] - a[0]) * t, p[1] - a[1] - (b[1] - a[1]) * t, p[2] - a[2] - (b[2] - a[2]) * t) - (ra + (rb - ra) * t);
        if (d < bd) { bd = d; bi = i; bt = t0; }
      }
      const g = BEN[bi][0], x = p[0], y = p[1], z = p[2], ax = Math.abs(x), s = x >= 0 ? '-v' : '-h', s2 = g.endsWith('V') ? '-v' : '-h';
      const fram = z - zMitt(y) + n[2] * 0.03 > 0;
      switch (g) {
        case 'huvud': case 'hals': return y > 1.588 - z * 0.25 ? RID.huvud : RID.nacke;
        case 'brost':
          if (y > 1.48 && ax < 0.1) return RID.nacke;
          if (ax > 0.155 && y > 1.36) return RID[`axel${s}`];
          return fram ? RID.brost : RID['ovre-rygg'];
        case 'mage': return fram ? RID.mage : RID.landrygg;
        case 'backen':
          if (!fram) return y > 0.975 ? RID.landrygg : RID[`hoft${s}`];
          return ax < 0.105 ? RID[`ljumske${s}`] : RID[`hoft${s}`];
        default: break;
      }
      const typ = g.slice(0, -1), a = BEN[bi][1], b = BEN[bi][2];
      if (typ === 'overarm') return bt < 0.55 ? RID[`axel${s2}`] : RID[`armbage${s2}`];
      if (typ === 'underarm') return bt < 0.3 ? RID[`armbage${s2}`] : RID[`handled${s2}`];
      if (typ === 'hand') return RID[`handled${s2}`];
      if (typ === 'fot') return RID[`fotled${s2}`];
      if (typ === 'vad') return bt < 0.12 ? RID[`kna${s2}`] : bt > 0.86 ? RID[`fotled${s2}`] : RID[`vad${s2}`];
      // låret: t längs höft → knä, ut = bort från kroppens mitt, fr = framåt (+z) mot benets linje
      if (bt > 0.86) return RID[`kna${s2}`];
      const tc = Math.min(1, Math.max(0, bt)), cx = a[0] + (b[0] - a[0]) * tc, cz = a[2] + (b[2] - a[2]) * tc;
      const ut = (x - cx) * Math.sign(a[0] || 1), fr = z - cz + n[2] * 0.02;
      if (bt < 0.24 && ut > 0.045) return RID[`hoft${s2}`];
      if (bt < 0.16 && ut < -0.02 && fr > -0.02) return RID[`ljumske${s2}`];
      return fr > -0.008 ? RID[`lar${s2}`] : RID[`baklar${s2}`];
    };
    const data = new Float32Array(nv * 9);
    for (let v = 0; v < nv; v++) {
      const p = [P[v * 4], P[v * 4 + 1], P[v * 4 + 2]], n = [nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]];
      data[v * 9] = p[0]; data[v * 9 + 1] = p[1]; data[v * 9 + 2] = p[2]; data[v * 9 + 3] = n[0]; data[v * 9 + 4] = n[1]; data[v * 9 + 5] = n[2];
      data[v * 9 + 6] = Math.min(1, Math.max(0, P[v * 4 + 3] * 1.08));
      data[v * 9 + 7] = klassaM(p, n);
      data[v * 9 + 8] = Math.tanh(kv[v] / 45);
    }
    const rut = byggRut(data, ind);
    // regionernas punkt på huden: från c (inne i kroppsdelen) längs n ut till ytan
    const RN = Object.keys(RID).sort((a, b) => RID[a] - RID[b]);
    const ank = {};
    const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const satt = (id, c, nn, R) => {
      const n = norm3(nn), h = stralRut({ data, index: ind, rut }, c, n, 0.5);
      ank[id] = { p: h ? [c[0] + n[0] * h.t, c[1] + n[1] * h.t, c[2] + n[2] * h.t] : c, n, R };
    };
    const satt2 = (id, c, nn, R) => { satt(`${id}-v`, c, nn, R); satt(`${id}-h`, sp(c), sp(nn), R); };
    ankPunkter(LM, satt, satt2, lerp3);
    let topp = 0, bredd = 0; for (let v = 0; v < nv; v++) { topp = Math.max(topp, data[v * 9 + 1]); bredd = Math.max(bredd, Math.abs(data[v * 9])); }
    return { data, index: ind, horn: nv, rut, ank: RN.map((id) => ank[id]), matt: { topp, bredd: bredd + 0.02 } };
  }
  // Regionernas punkter: c inne i kroppsdelen, n = riktningen ut till huden, R = värmens radie
  function ankPunkter(LM, satt, satt2, lerp3) {
    satt('huvud', [0, 1.7, 0.03], [0, 0.25, 1], 0.12);
    satt('nacke', [0, 1.53, -0.03], [0, 0.1, -1], 0.07);
    satt('brost', [0, 1.35, 0], [0, 0, 1], 0.15);
    satt('ovre-rygg', [0, 1.36, -0.03], [0, 0, -1], 0.16);
    satt('landrygg', [0, 1.04, 0], [0, 0, -1], 0.11);
    satt('mage', [0, 1.11, 0.03], [0, 0, 1], 0.12);
    satt2('axel', [LM.S[0], LM.S[1] + 0.01, LM.S[2]], [0.8, 0.6, 0.1], 0.085);
    satt2('armbage', LM.E, [0.75, 0.25, -0.6], 0.065);
    satt2('handled', LM.W, [0.9, 0.3, 0.3], 0.055);
    satt2('hoft', [0.13, 0.93, -0.005], [1, 0.1, 0.15], 0.085);
    satt2('ljumske', [0.065, 0.865, 0.03], [0.25, -0.2, 1], 0.06);
    satt2('lar', lerp3(LM.Hp, LM.K, 0.45), [0, 0, 1], 0.13);
    satt2('baklar', lerp3(LM.Hp, LM.K, 0.5), [0, 0, -1], 0.13);
    satt2('kna', LM.K, [0, 0, 1], 0.068);
    satt2('vad', lerp3(LM.K, LM.A, 0.3), [0, 0, -1], 0.095);
    satt2('fotled', LM.A, [0.85, 0, 0.5], 0.058);
  }
  // Rutnät över trianglarna: cellernas början (start, en extra på slutet) och trianglarna per cell (lista)
  function byggRut(data, ind) {
    const nt = ind.length / 3, lo = [9, 9, 9], hi = [-9, -9, -9];
    for (let v = 0; v < data.length; v += 9) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], data[v + k]); hi[k] = Math.max(hi[k], data[v + k]); }
    const C = 0.03, g0 = lo.map((x) => x - 0.01), G = [0, 1, 2].map((k) => Math.max(1, Math.ceil((hi[k] - g0[k] + 0.01) / C)));
    const cel = (x, k) => Math.min(G[k] - 1, Math.max(0, Math.floor((x - g0[k]) / C)));
    const ram = new Int32Array(nt * 6), start = new Uint32Array(G[0] * G[1] * G[2] + 1);
    for (let t = 0; t < nt; t++) {
      for (let k = 0; k < 3; k++) {
        const a = data[ind[t * 3] * 9 + k], b = data[ind[t * 3 + 1] * 9 + k], c = data[ind[t * 3 + 2] * 9 + k];
        ram[t * 6 + k] = cel(Math.min(a, b, c), k); ram[t * 6 + 3 + k] = cel(Math.max(a, b, c), k);
      }
      for (let j = ram[t * 6 + 1]; j <= ram[t * 6 + 4]; j++) for (let k = ram[t * 6 + 2]; k <= ram[t * 6 + 5]; k++) for (let i = ram[t * 6]; i <= ram[t * 6 + 3]; i++) start[(j * G[2] + k) * G[0] + i + 1]++;
    }
    for (let i = 1; i < start.length; i++) start[i] += start[i - 1];
    const lista = new Uint32Array(start[start.length - 1]), fyllt = start.slice(0, -1);
    for (let t = 0; t < nt; t++) for (let j = ram[t * 6 + 1]; j <= ram[t * 6 + 4]; j++) for (let k = ram[t * 6 + 2]; k <= ram[t * 6 + 5]; k++) for (let i = ram[t * 6]; i <= ram[t * 6 + 3]; i++) lista[fyllt[(j * G[2] + k) * G[0] + i]++] = t;
    return { C, g0, G, start, lista };
  }
  // Strålen o + t·d (d normerad) mot trianglarna genom rutnätet (3D-DDA): närmaste träff inom tmax → { t, tri, u, w } eller null
  function stralRut(M, o, d, tmax) {
    const { C, g0, G, start, lista } = M.rut, data = M.data, ind = M.index;
    let t0 = 0, t1 = tmax;
    for (let k = 0; k < 3; k++) {
      const a = g0[k], b = g0[k] + G[k] * C;
      if (Math.abs(d[k]) < 1e-12) { if (o[k] < a || o[k] > b) return null; continue; }
      let ta = (a - o[k]) / d[k], tb = (b - o[k]) / d[k]; if (ta > tb) { const x = ta; ta = tb; tb = x; }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return null;
    }
    const c = [0, 1, 2].map((k) => Math.min(G[k] - 1, Math.max(0, Math.floor((o[k] + d[k] * t0 - g0[k]) / C))));
    const stg = [0, 1, 2].map((k) => (d[k] > 0 ? 1 : d[k] < 0 ? -1 : 0));
    const tN = [0, 1, 2].map((k) => (stg[k] === 0 ? 1e30 : (g0[k] + (c[k] + (stg[k] > 0 ? 1 : 0)) * C - o[k]) / d[k]));
    const tD = [0, 1, 2].map((k) => (stg[k] === 0 ? 1e30 : C / Math.abs(d[k])));
    let bast = null, bt = t1;
    for (let varv = 0; varv < 600; varv++) {
      const cell = (c[1] * G[2] + c[2]) * G[0] + c[0];
      for (let i = start[cell], e = start[cell + 1]; i < e; i++) {
        const tr = lista[i], A = ind[tr * 3] * 9, B = ind[tr * 3 + 1] * 9, Cc = ind[tr * 3 + 2] * 9;
        const e1x = data[B] - data[A], e1y = data[B + 1] - data[A + 1], e1z = data[B + 2] - data[A + 2];
        const e2x = data[Cc] - data[A], e2y = data[Cc + 1] - data[A + 1], e2z = data[Cc + 2] - data[A + 2];
        const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
        const det = e1x * px + e1y * py + e1z * pz; if (det > -1e-14 && det < 1e-14) continue;
        const iv = 1 / det, tx = o[0] - data[A], ty = o[1] - data[A + 1], tz = o[2] - data[A + 2];
        const u = (tx * px + ty * py + tz * pz) * iv; if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        const w = (d[0] * qx + d[1] * qy + d[2] * qz) * iv; if (w < 0 || u + w > 1) continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * iv;
        if (t > 1e-5 && t < bt) { bt = t; bast = { t, tri: tr, u, w }; }
      }
      const k = tN[0] < tN[1] ? (tN[0] < tN[2] ? 0 : 2) : tN[1] < tN[2] ? 1 : 2;
      if (bast && bt <= tN[k]) return bast; // träffen ligger i den här cellen – inget närmare finns längre fram
      if (tN[k] > t1) return bast;
      c[k] += stg[k]; if (c[k] < 0 || c[k] >= G[k]) return bast;
      tN[k] += tD[k];
    }
    return bast;
  }
  // Modellen för en kroppsform och delningsnivå (Worker + IndexedDB-cache); null = ingen modell (SDF-kroppen gäller)
  const modellFor = (namn, niva) => {
    const m = MODELL[namn];
    if (!m) return Promise.resolve(null);
    const nyckel = `${NAT_VER}:modell-${namn}:${niva}:${m.ver}`;
    const cache = m.cache || (m.cache = {});
    return cache[niva] || (cache[niva] = (async () => {
      const t0 = performance.now();
      const cachad = await lasCache(nyckel);
      if (cachad && cachad.rut && cachad.ank) { cachad.ms = performance.now() - t0; cachad.cache = true; return cachad; }
      const svar = await fetch(new URL(`${m.fil}?v=${m.ver}`, SKRIPT_URL || location.href).href);
      if (!svar.ok) throw new Error(`modellen saknas (${svar.status})`);
      const buf = await svar.arrayBuffer();
      let r;
      try {
        r = await new Promise((klar, fel) => {
          const kod = `'use strict';${ankPunkter.toString()}
${byggRut.toString()}\n${stralRut.toString()}\n${byggModell.toString()}\n`
            + 'onmessage=(e)=>{try{const d=e.data;const r=byggModell(d.buf,d.niva,d.LM,d.RID);postMessage(r,[r.data.buffer,r.index.buffer,r.rut.start.buffer,r.rut.lista.buffer]);}catch(x){postMessage({fel:String(x)});}};';
          const url = URL.createObjectURL(new Blob([kod], { type: 'text/javascript' }));
          const w = new Worker(url);
          const stang = () => { w.terminate(); URL.revokeObjectURL(url); };
          w.onmessage = (e) => { stang(); if (e.data.fel) fel(new Error(e.data.fel)); else klar(e.data); };
          w.onerror = (e) => { e.preventDefault(); stang(); fel(e); };
          w.postMessage({ buf: buf.slice(0), niva, LM, RID });
        });
      } catch (_) { r = byggModell(buf, niva, LM, RID); }
      r.ms = performance.now() - t0;
      skrivCache(nyckel, r);
      return r;
    })().catch((e) => { delete cache[niva]; throw e; }));
  };

  /* ---- 7. shaders ----------------------------------------------------------------------------- */
  const FARGER = `const vec3 MINT = vec3(0.494, 0.878, 0.765); const vec3 IS = vec3(0.655, 0.824, 1.0); const vec3 NAVY = vec3(0.094, 0.212, 0.325);
const vec3 INK = vec3(0.043, 0.082, 0.125); const vec3 ROD = vec3(0.93, 0.36, 0.30); const vec3 GUL = vec3(0.96, 0.69, 0.25); const vec3 VIT = vec3(1.0);
const vec3 MINTD = vec3(0.2, 0.66, 0.54);
float ringAA(float d, float px, float fw){ return 1.0 - smoothstep(px * fw * 0.5, px * fw * 0.5 + fw, abs(d)); }\n`;

  /* Tillbehör (landslaget): mössan och nummerlappen är skal som följer avatarens egen hud (hörnen flyttade ut längs
     normalen), tofsen ett klot. Egna shaders och buffertar – kroppen ritas exakt som förut. aAo = typ (0 mössa, 1 kant,
     2 tofs, 3 lapp), aReg/aKurv = u/v (lappens textur, mössans höjd). */
  const TB_VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute float aAo; attribute float aReg; attribute float aKurv;
uniform mat4 uVP, uM; varying vec3 vObj; varying vec3 vVar; varying vec3 vNor; varying float vTyp; varying vec2 vUV;
void main(){ vec4 w = uM * vec4(aPos, 1.0); vObj = aPos; vVar = w.xyz; vNor = (uM * vec4(aNor, 0.0)).xyz; vTyp = aAo; vUV = vec2(aReg, aKurv); gl_Position = uVP * w; }`;
  const TB_FS = `
#if __VERSION__ >= 300\n#define texture2D texture\n#endif\nuniform vec3 uKamPos, uLjus; uniform float uLjust, uAvsloj, uTid; uniform sampler2D uTex;
varying vec3 vObj; varying vec3 vVar; varying vec3 vNor; varying float vTyp; varying vec2 vUV;
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main(){
  if (vObj.y > uAvsloj) discard;
  vec3 n = normalize(vNor), v = normalize(uKamPos - vVar), l = normalize(-uLjus);
  vec3 bas; float glans = 0.12, rund = 18.0;
  if (vTyp < 0.5) { // stickad mössa: resårränder runt om, en gul rand och mjuk ull
    float vinkel = atan(vObj.x, vObj.z); float rib = 0.5 + 0.5 * sin(vinkel * 46.0);
    bas = mix(vec3(0.1, 0.4, 0.9), vec3(0.17, 0.52, 1.0), rib);
    float h = vUV.y; bas = mix(bas, vec3(1.0, 0.8, 0.0), smoothstep(0.052, 0.058, h) * (1.0 - smoothstep(0.072, 0.078, h)));
    bas *= 0.92 + 0.08 * hash(floor(vObj * 900.0)); glans = 0.05;
  } else if (vTyp < 1.5) { // uppvikt kant: tätare resår
    float vinkel = atan(vObj.x, vObj.z); bas = mix(vec3(0.07, 0.32, 0.78), vec3(0.13, 0.45, 0.95), 0.5 + 0.5 * sin(vinkel * 70.0)); glans = 0.05;
  } else if (vTyp < 2.5) { // tofsen: luddig gul ull
    float f = hash(floor(vObj * 1400.0)); bas = vec3(1.0, 0.8, 0.05) * (0.78 + 0.3 * f); n = normalize(n + (vec3(hash(vObj * 731.0), hash(vObj * 317.0), hash(vObj * 173.0)) - 0.5) * 0.9); glans = 0.0;
  } else if (vTyp > 3.5 && vTyp < 4.5) { // tubhalsduk: blå med gula ränder
    float r2 = fract(vUV.y * 34.0); bas = mix(vec3(0.1, 0.4, 0.9), vec3(1.0, 0.8, 0.05), step(0.72, r2)); bas *= 0.92 + 0.08 * sin(atan(vObj.x, vObj.z) * 60.0); glans = 0.04;
  } else if (vTyp > 4.5 && vTyp < 5.5) { // handskar: mörka med blå mudd
    bas = mix(vec3(0.06, 0.08, 0.13), vec3(0.1, 0.4, 0.9), smoothstep(0.035, 0.045, vUV.y)); glans = 0.3; rund = 24.0;
  } else if (vTyp > 5.5 && vTyp < 6.5) { // stavar: kolfiber, gult handtagsband och korg
    bas = vUV.y > 0.93 ? vec3(0.05) : vUV.y > 0.86 ? vec3(1.0, 0.8, 0.05) : vec3(0.16, 0.18, 0.22); glans = 0.6; rund = 40.0;
  } else if (vTyp > 6.5 && vTyp < 7.5) { // skidor: gul ovansida med blå mittrand, mörk kant
    bas = abs(vUV.x - 0.5) < 0.16 ? vec3(0.08, 0.36, 0.86) : vec3(1.0, 0.8, 0.05); if (n.y < 0.5) bas = vec3(0.08, 0.1, 0.14); glans = 0.5; rund = 36.0;
  } else { // nummerlappen: tryckt tyg med rundade hörn
    vec2 q = abs(vUV - 0.5) * 2.0; vec2 d = max(q - vec2(0.82, 0.78), 0.0); if (q.x > 1.0 || q.y > 1.0 || length(d / vec2(0.18, 0.22)) > 1.0) discard;
    bas = texture2D(uTex, vec2(vUV.x, 1.0 - vUV.y)).rgb; glans = 0.18; rund = 30.0;
  }
  float dif = max(dot(n, l), 0.0) * 0.7 + 0.45;
  float kant = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  float sp = pow(max(dot(reflect(-l, n), v), 0.0), rund) * glans;
  vec3 c = bas * dif + sp + kant * mix(vec3(0.35, 0.6, 1.0), vec3(0.5), uLjust) * 0.35;
  gl_FragColor = vec4(c, 1.0);
}`;
  const KROPP_VS = `${FARGER}
attribute vec3 aPos; attribute vec3 aNor; attribute float aAo; attribute float aReg; attribute float aKurv;
uniform mat4 uVP, uM; uniform float uAndas, uUt, uSpegel, uFokId;
uniform vec3 uZc[${MAXZ}]; uniform vec3 uZn[${MAXZ}]; uniform vec4 uZf[${MAXZ}]; uniform float uZr[${MAXZ}]; uniform float uZant;
varying vec3 vObj; varying vec3 vVar; varying vec3 vNor; varying float vAo; varying vec3 vVarm; varying float vE; varying float vFok; varying float vNiv; varying float vKurv;
void main(){
  // värmen: mjuka fläckar runt de aktiva regionernas punkter (fram/bak-regioner bara på huden som vetter samma håll)
  vec3 varm = vec3(0.0); float bast = 0.0; vE = 9.0; vNiv = 0.0;
  for (int i = 0; i < ${MAXZ}; i++) {
    if (float(i) >= uZant) break;
    float e = length(aPos - uZc[i]) / uZr[i];
    float g = exp(-e * e * 1.15);
    if (dot(uZn[i], uZn[i]) > 0.5) g *= smoothstep(-0.4, 0.4, dot(aNor, uZn[i]));
    float w = g * uZf[i].a;
    varm += uZf[i].rgb * w * (0.6 + 0.4 * uZf[i].a);
    if (w > bast) { bast = w; vE = e; vNiv = uZf[i].a; }
  }
  vVarm = min(varm, vec3(1.15));
  vFok = abs(aReg - uFokId) < 0.5 ? 1.0 : 0.0;
  float br = smoothstep(1.0, 1.2, aPos.y) * (1.0 - smoothstep(1.4, 1.5, aPos.y)) * (1.0 - smoothstep(0.15, 0.22, abs(aPos.x)));
  // skenets skal följer inte fina detaljer (fingrar, öron, ögonlock): där är kurvaturen hög
  float fin = smoothstep(0.4, 0.9, abs(aKurv));
  vec4 w = uM * vec4(aPos + aNor * (uAndas * br + uUt * (1.0 - 0.8 * fin)), 1.0);
  vec3 n = (uM * vec4(aNor, 0.0)).xyz;
  if (uSpegel > 0.5) { w.y = -w.y; n.y = -n.y; }
  vObj = aPos; vVar = w.xyz; vNor = n; vAo = aAo; vKurv = aKurv;
  gl_Position = uVP * w;
}`;
  const KROPP_FS = (lager) => `#define LAGER ${lager}
${FARGER}
uniform vec3 uKamPos, uLjus, uFokP, uFokFarg;
uniform float uTid, uSkan, uAvsloj, uLinje, uFokS, uFokR, uStyrka, uLjust;
varying vec3 vObj; varying vec3 vVar; varying vec3 vNor; varying float vAo; varying vec3 vVarm; varying float vE; varying float vFok; varying float vNiv; varying float vKurv;
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float brus(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 0.0)), h3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(h3(i + vec3(0.0, 0.0, 1.0)), h3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 1.0)), h3(i + vec3(1.0)), f.x), f.y), f.z);
}
float linjer(float y, float sp, float bredd){
  float w = max(fwidth(y), 1e-6);
  float d = abs(fract(y / sp + 0.5) - 0.5) * sp;
  return (1.0 - smoothstep(bredd * w * 0.5, bredd * w * 0.5 + w, d)) * (1.0 - smoothstep(0.16, 0.42, w / sp));
}
void main(){
  // skanningen: ovanför fronten syns kroppen som en svag siluett (bara framsidan, LAGER 0) – aldrig en halv kropp
#if LAGER == 1 || LAGER == 2 || LAGER == 3
  if (vObj.y > uAvsloj) discard;
#endif
#if LAGER == 4
  gl_FragColor = vec4(0.0);
#else
  vec3 n = normalize(vNor);
  vec3 v = normalize(uKamPos - vVar);
  float nv = dot(n, v);
  // värmen: flyter över huden (brus) + ringar som sprider sig från regionens mitt när nivån är hög
  float b = brus(vObj * 26.0 + vec3(0.0, -uTid * 0.32, uTid * 0.1)) * 0.65 + brus(vObj * 61.0 - vec3(uTid * 0.18)) * 0.35;
  vec3 z = vVarm * (0.72 + 0.56 * b);
  float fwE = fwidth(vE), puls = 0.0;
  for (int k = 0; k < 2; k++) {
    float ph = fract(uTid * 0.3 + float(k) * 0.5);
    puls += ringAA(vE - (0.2 + ph * 1.3), 1.4, fwE + 0.01) * (1.0 - ph) * (1.0 - ph) * smoothstep(0.0, 0.1, ph);
  }
  z += vVarm * puls * 0.7 * smoothstep(0.45, 0.8, vNiv);
  float zi = clamp(max(z.r, max(z.g, z.b)), 0.0, 1.0);
  vec3 zc = z / max(zi, 1e-3);
  // fokus: pulserande ringar på huden runt regionens punkt
  float fd = length(vObj - uFokP) / uFokR, fw = fwidth(fd);
  float fr = ringAA(fd - 1.0, 1.3, fw) * 0.75;
  for (int k = 0; k < 2; k++) {
    float ph = fract(uTid * 0.55 + float(k) * 0.5);
    fr += ringAA(fd - (0.12 + ph * 1.3), 1.6, fw) * (1.0 - ph) * (1.0 - ph) * smoothstep(0.0, 0.08, ph);
  }
  fr *= uFokS * (1.0 - smoothstep(1.5, 2.1, fd)) * (0.8 + 0.2 * vFok);
  float fy = vFok * uFokS * (1.0 - smoothstep(0.15, 1.05, fd)); // regionens ton tonar ut mot kanten – ingen hård gräns
#if LAGER == 3
  // skenet: skalets baksidor
  float g = pow(clamp(-nv, 0.0, 1.0), 2.0) * (1.0 - 0.7 * smoothstep(0.45, 0.9, abs(vKurv)));
  vec3 col = mix(MINT, IS, smoothstep(0.1, 1.7, vObj.y)) * (1.0 - 0.4 * uFokS) * 0.46 + z * 0.65 + uFokFarg * fy * 0.5;
  col += MINT * exp(-pow((vObj.y - uSkan) / 0.03, 2.0)) * 0.6;
  vec4 elit = vec4(col * g * uStyrka, 0.0);
  float gA = g * (zi * 0.45 + fy * 0.22);
  vec4 ljus = vec4(mix(zc, uFokFarg, fy / max(zi + fy, 1e-3)) * gA, gA);
  gl_FragColor = mix(elit, ljus, uLjust);
#else
#if LAGER == 1
  n = -n; nv = -nv;
#endif
  nv = clamp(nv, 0.0, 1.0);
  // fresnel – svagare där ytan vänder nedåt (under hakan), så att halsen inte får en lysande krage
  float fres = pow(1.0 - nv, 2.3) * (1.0 - 0.6 * smoothstep(0.25, 0.85, -n.y));
  fres *= 1.0 - 0.6 * smoothstep(0.5, 0.95, abs(vKurv)); // ögonlock, näsborrar och fingrar lyser inte som silhuetter
  float dif = clamp(dot(n, uLjus), 0.0, 1.0);
  float ao = vAo;
  vec3 hojd = mix(MINT, IS, smoothstep(0.1, 1.7, vObj.y));
  vec3 kant = mix(hojd, mix(MINT, IS, smoothstep(-0.6, 0.6, n.x)), 0.3);
  float l1 = linjer(vObj.y, uLinje, 0.8), l5 = linjer(vObj.y, uLinje * 5.0, 1.25);
  float lin = max(l1 * 0.12, l5 * 0.3); // skanlinjerna: diskreta, bara i elit
  // musklernas konturer: fårorna (negativ kurvatur) och rundningarna (positiv) ur nätet
  float fara = smoothstep(0.04, 0.55, -vKurv), rund = smoothstep(0.05, 0.6, vKurv);
  vec3 hv = normalize(uLjus + v);
  float spek = pow(clamp(dot(n, hv), 0.0, 1.0), 56.0) * ao;
  float dy = vObj.y - uSkan, fyy = fwidth(vObj.y);
  float skanLinje = ringAA(dy, 1.5, fyy), skanBand = exp(-dy * dy / 0.0022);
  float da = uAvsloj - vObj.y;
  // mjuk ljuskant i stället för ett skarpt plan; spok = 1 ovanför fronten (siluetten)
  float band = (1.0 - smoothstep(0.0, 0.12, da)) * step(0.0, da), front = exp(-da * da / 0.0012) * 0.55, spok = 1.0 - smoothstep(-0.06, -0.005, da);
  skanLinje = exp(-dy * dy / 0.0006) * 0.6;
  // ELIT: mörkt glashologram (additivt ljus)
  vec3 e = kant * (fres * 1.5 + 0.018 + 0.11 * dif * dif * ao) + kant * lin * (0.075 + 0.55 * fres + 0.1 * dif) + vec3(0.86, 0.95, 1.0) * spek * 0.34;
  e += kant * fara * (0.05 + 0.12 * fres) + kant * rund * dif * 0.04; // diskreta konturer (ingen lysande krage i vecken)
  e *= 1.0 - 0.45 * uFokS * (1.0 - vFok);
  e = mix(e, e * 0.3, zi) + z * (0.42 + 1.1 * fres + 1.5 * lin + 0.25 * dif) + mix(z, VIT, 0.45) * pow(zi, 4.0) * 0.45;
  e += uFokFarg * (fr * 1.25 + fy * (0.05 + 0.32 * fres + 0.6 * lin));
  e += mix(MINT, VIT, 0.45) * skanLinje * 0.9 + MINT * skanBand * 0.08;
  e += mix(MINT, VIT, 0.4) * front * 1.4 + kant * band * (lin * 0.8 + fres * 0.4);
#if LAGER == 0
  float a = (0.52 + 0.36 * fres) * (1.0 - band * 0.8);
  vec3 bas = mix(INK * 0.5, NAVY * 0.95, 0.08 + 0.92 * dif) * (0.45 + 0.55 * ao);
  bas = mix(bas, z * 0.22, 0.6 * zi);
  vec4 elit = vec4(bas * a + e, a);
  // MOTIONÄR: frostat porslin – mjuk skuggning, navy kontur i silhuetten, mint linjer, värmen som färgton
  vec3 por = vec3(0.975, 0.98, 0.985), skugg = vec3(0.74, 0.8, 0.86);
  // porslin: mjukt omslutande ljus (wrap) + svagt motljus underifrån, satinglans – stilrent, inga hårda övergångar
  float wrap = clamp((dot(n, uLjus) + 0.45) / 1.45, 0.0, 1.0);
  vec3 c = mix(skugg, por, clamp(0.18 + 0.85 * wrap * wrap * (3.0 - 2.0 * wrap), 0.0, 1.0)) * (0.8 + 0.2 * ao);
  c += vec3(0.02, 0.03, 0.035) * clamp(-n.y, 0.0, 1.0);
  c = mix(c, NAVY * 0.9 + skugg * 0.35, fara * 0.3) + vec3(0.03) * rund * dif;
  c += vec3(0.02, 0.035, 0.04) * fres;
  // inga skanlinjer i porslinet – bara en mjuk kontur i silhuetten
  c = mix(c, NAVY * 1.08, smoothstep(0.35, 1.0, pow(1.0 - nv, 2.0)) * 0.5);
  c += vec3(1.0) * pow(clamp(dot(n, hv), 0.0, 1.0), 22.0) * ao * 0.12;
  c = mix(c, zc * 0.93, clamp(zi * 0.82, 0.0, 0.9));
  c += zc * pow(zi, 3.0) * 0.12;
  vec3 fL = mix(uFokFarg, NAVY, 0.22);
  c = mix(c, fL, clamp(fr * 1.05 + fy * 0.18, 0.0, 1.0));
  c = mix(c, mix(MINTD, MINT, 0.5), clamp(skanLinje * 0.28 + skanBand * 0.04, 0.0, 1.0));
  c = mix(c, mix(MINTD, MINT, 0.5), clamp(front * 0.75 + band * 0.12, 0.0, 1.0)); // mjuk ljuskant
  float aL = (0.93 + 0.07 * fres) * (1.0 - band * 0.5);
  vec4 ljus = vec4(c * aL, aL);
  // siluetten ovanför skanningens front: elit = svag glaskant (additiv), motionär = genomskinlig navy kontur
  float sil = pow(1.0 - nv, 2.2);
  vec4 spokE = vec4(kant * (0.02 + 0.55 * sil), 0.0), aS = vec4(0.0);
  float aSp = 0.05 + 0.3 * sil; vec4 spokL = vec4(mix(skugg, NAVY, 0.55) * aSp, aSp);
  elit = mix(elit, spokE, spok); ljus = mix(ljus, spokL, spok);
  gl_FragColor = mix(elit, ljus, uLjust);
#elif LAGER == 1
  gl_FragColor = vec4(e * 0.26 * (1.0 - uLjust), 0.0);
#else
  float djup = exp(vVar.y * 5.5) * (1.0 - smoothstep(0.25, 0.75, length(vVar.xz)));
  gl_FragColor = vec4(e * uStyrka * djup * (1.0 - uLjust), 0.0);
#endif
#endif
#endif
}`;

  const GOLV_VS = `attribute vec2 aXZ; uniform mat4 uVP; varying vec2 vXZ;
void main(){ vXZ = aXZ * 1.3; gl_Position = uVP * vec4(vXZ.x, 0.0, vXZ.y, 1.0); }`;
  const GOLV_FS = `${FARGER}
uniform float uTid, uIntro, uLjust; uniform vec4 uFot; varying vec2 vXZ;
void main(){
  vec2 p = vXZ; float r = length(p); float fw = max(fwidth(r), 1e-5);
  float a = atan(p.y, p.x) / 6.2831853 + 0.5;
  float ut = mix(0.55, 1.0, uIntro);
  float r1 = ringAA(r - 0.3 * ut, 1.0, fw);
  float sa = fract((a + uTid * 0.012) * 72.0); float sw = fw / (6.2832 * max(r, 0.05) / 72.0);
  float streck = smoothstep(0.38 - sw, 0.38 + sw, abs(sa - 0.5) * 2.0);
  float r2 = ringAA(r - 0.42 * ut, 1.7, fw) * streck;
  float r3 = ringAA(r - 0.535 * ut, 0.9, fw);
  float ta = fract(a * 120.0), tw = fw / (6.2832 * max(r, 0.05) / 120.0);
  float tick = 1.0 - smoothstep(0.12, 0.12 + tw * 2.0, abs(ta - 0.5) * 2.0);
  float tb = smoothstep(0.6 * ut - fw, 0.6 * ut, r) * (1.0 - smoothstep(0.635 * ut, 0.635 * ut + fw, r));
  float lang = step(0.9, fract(a * 12.0 + 0.04));
  float tk = tick * tb * (0.18 + 0.2 * lang);
  float r4 = ringAA(r - 0.7 * ut, 0.8, fw), r5 = ringAA(r - 0.92 * ut, 0.8, fw);
  vec2 g = p * 10.0; vec2 gw = max(fwidth(g), vec2(1e-5)); vec2 gd = abs(fract(g + 0.5) - 0.5) / gw;
  float gr = (1.0 - min(min(gd.x, gd.y), 1.0)) * (1.0 - smoothstep(0.12, 0.85, r)) * (1.0 - smoothstep(0.1, 0.4, max(gw.x, gw.y)));
  vec2 f1 = p - uFot.xy, f2 = p - uFot.zw;
  float pol = exp(-dot(f1, f1) * 140.0) + exp(-dot(f2, f2) * 140.0);
  float sv = fract(a - uTid * 0.05);
  float svep = pow(sv, 10.0) * (1.0 - smoothstep(0.97, 1.0, sv)) * (1.0 - smoothstep(0.1, 0.6, r));
  float mask = (1.0 - smoothstep(0.55, 1.18, r)) * uIntro;
  // elit: mörk glasskiva med ringar, rutnät och ljuspöl under fötterna
  float f = exp(-r * r * 10.0) * 0.2 + r1 * 0.5 + r2 * 0.75 + r3 * 0.3 + tk + r4 * 0.16 + r5 * 0.07 + gr * 0.06 + pol * 0.22 + svep * 0.07;
  vec3 col = mix(MINT, IS, 0.2 + 0.35 * smoothstep(0.3, 0.95, r)) * f * mask;
  float alfa = 0.34 * (1.0 - smoothstep(0.42, 0.8, r)) * uIntro;
  vec4 elit = vec4(col + INK * 0.4 * alfa, alfa);
  // motionär: mjuk skugga (bred + kontaktskugga under fötterna) och tunna ringar i mint/navy
  float sk = (exp(-r * r * 13.0) * 0.13 + exp(-dot(f1, f1) * 420.0) * 0.2 + exp(-dot(f2, f2) * 420.0) * 0.2 + exp(-(p.x * p.x * 9.0 + p.y * p.y * 30.0)) * 0.06) * uIntro;
  float ri = (r1 * 0.5 + r2 * 0.42 + tk * 1.1 + r3 * 0.18 + r4 * 0.1 + gr * 0.12) * mask;
  vec3 rc = mix(MINTD, NAVY, 0.25 + 0.45 * smoothstep(0.35, 0.75, r));
  float aR = clamp(ri, 0.0, 1.0) * 0.7;
  vec3 pm = NAVY * 0.55 * sk * (1.0 - aR) + rc * aR;
  vec4 ljus = vec4(pm, sk + aR - sk * aR);
  gl_FragColor = mix(elit, ljus, uLjust);
}`;

  const PUNKT_VS = `attribute vec4 aP; uniform mat4 uVP; uniform float uTid, uPkt, uIntro, uYaw; varying float vA;
void main(){
  float hh = fract(aP.z + uTid * aP.w);
  float a = aP.x + uTid * 0.04 + uYaw * 0.6;
  vec4 c = uVP * vec4(cos(a) * aP.y, hh * 1.9, sin(a) * aP.y, 1.0);
  gl_Position = c;
  gl_PointSize = uPkt * (0.55 + fract(aP.z * 7.0) * 0.8) * (4.7 / c.w);
  vA = sin(hh * 3.14159) * (0.22 + 0.5 * fract(aP.x * 3.0)) * uIntro;
}`;
  const PUNKT_FS = `${FARGER}
uniform float uLjust; varying float vA;
void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0) discard; float a = 1.0 - r; a *= a * vA;
  gl_FragColor = mix(vec4(vec3(0.62, 0.93, 0.86) * a, 0.0), vec4(MINTD * a * 0.55, a * 0.55), uLjust); }`;

  const SKIVA_VS = `attribute vec2 aXZ; uniform mat4 uVP; uniform float uY, uR; varying vec2 vXZ;
void main(){ vXZ = aXZ * uR; gl_Position = uVP * vec4(vXZ.x, uY, vXZ.y, 1.0); }`;
  const SKIVA_FS = `${FARGER}
uniform float uLock, uStyrka, uLjust; varying vec2 vXZ;
void main(){
  float r = length(vXZ); float fw = max(fwidth(r), 1e-5);
  vec4 ut;
  if (uLock > 0.5) {
    float s = (vXZ.x + vXZ.y) * 110.0; float sw = fwidth(s);
    float st = 1.0 - smoothstep(0.18, 0.18 + sw * 1.5, abs(fract(s) - 0.5) * 2.0);
    vec3 col = mix(MINT, VIT, 0.3) * (0.08 + 0.05 * st);
    float aL = 0.05 + 0.04 * st; // tvärsnittet: bara en aning
    ut = mix(vec4(col, 0.0), vec4(MINTD * aL, aL), uLjust);
  } else {
    float a = atan(vXZ.y, vXZ.x) / 6.2831853 + 0.5;
    float ta = fract(a * 90.0), tw = fw / (6.2832 * max(r, 0.05) / 90.0);
    float tick = (1.0 - smoothstep(0.14, 0.14 + tw * 2.0, abs(ta - 0.5) * 2.0)) * smoothstep(0.5 - fw, 0.5, r) * (1.0 - smoothstep(0.53, 0.53 + fw, r));
    float m = (exp(-r * r * 9.0) * 0.06 + ringAA(r - 0.56, 1.1, fw) * 0.42 + tick * 0.28) * (1.0 - smoothstep(0.585, 0.615, r));
    m *= 0.35; // ringen runt kroppen: en svag antydan, inget skarpt plan
    ut = mix(vec4(MINT * m, 0.0), vec4(MINTD * m * 1.2, m * 1.2), uLjust);
  }
  gl_FragColor = ut * uStyrka;
}`;

  // Värmens färg i JS (etiketterna): samma ramp som shadern
  const TONER = { ok: [126, 224, 195], gul: [245, 176, 64], rod: [237, 92, 77] }, TON_NIVA = { ok: 0.4, gul: 0.65, rod: 0.9 };
  const rampJS = (t) => {
    const M = [126, 224, 195], Gu = [245, 176, 64], Ro = [237, 92, 77];
    const [a, b, u] = t < 0.5 ? [M, Gu, t * 2] : [Gu, Ro, t * 2 - 1];
    return a.map((x, i) => Math.round(x + (b[i] - x) * u));
  };

  /* ---- 8. stilmallen följer med (om sidan inte redan laddat kropp.css) -------------------------- */
  const SKRIPT_URL = (document.currentScript && document.currentScript.src) || '';
  const laddaCss = () => {
    if ([...document.styleSheets].some((s) => (s.href || '').includes('kropp.css')) || document.querySelector('link[href*="kropp.css"]')) return;
    if (!SKRIPT_URL) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('kropp.css', SKRIPT_URL).href;
    document.head.append(l);
  };

  /* ---- 9. montera --------------------------------------------------------------------------------- */
  function montera(el, opts = {}) {
    if (!el) throw new Error('UPKropp.montera: behållaren saknas');
    if (el.__upKropp) el.__upKropp.forstor();
    laddaCss();
    const o = { lage: 'elit', kropp: 'man', interaktiv: true, autoVrid: true, etiketter: true, ...opts };
    const medModell = !!MODELL[o.kropp] && !(window.UPKroppFelsok && window.UPKroppFelsok.sdf);
    let K = medModell ? modellKropp(o.kropp) : kropp(o.kropp);
    const lugn = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const NS = 'http://www.w3.org/2000/svg';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.classList.add('kr'); el.dataset.krLage = o.lage === 'motionar' ? 'motionar' : 'elit';
    let canvas = document.createElement('canvas'); canvas.className = 'kr-duk'; canvas.setAttribute('aria-hidden', 'true');
    const ledare = document.createElementNS(NS, 'svg'); ledare.setAttribute('class', 'kr-ledare'); ledare.setAttribute('aria-hidden', 'true');
    const lagerEt = document.createElement('div'); lagerEt.className = 'kr-etiketter';
    // Det som måste gälla även utan kropp.css (duken täcker behållaren exakt – annars stämmer inte tryckens koordinater)
    const DUK_STIL = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:pan-y;';
    canvas.style.cssText = DUK_STIL;
    ledare.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;';
    lagerEt.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;';
    el.append(canvas, ledare, lagerEt);
    if (!o.interaktiv) el.setAttribute('data-kr-stilla', '');

    /* kameran och modellen */
    const KAM = { pos: [0, 1.3, 4.7], mal: [0, 0.9, 0] };
    const KF = norm(sub(KAM.mal, KAM.pos)), KR = norm(cross(KF, [0, 1, 0])), KU = cross(KR, KF);
    const vy = { f: 900, cx: 0, cy: 0, f0: 900, cy0: 0 };
    const projicera = (pv) => { const d = sub(pv, KAM.pos); const z = dot(d, KF); return [vy.cx + (vy.f * dot(d, KR)) / z, vy.cy - (vy.f * dot(d, KU)) / z, z]; };
    const normProj = (pv) => { const d = sub(pv, KAM.pos); const z = dot(d, KF); return [dot(d, KR) / z, dot(d, KU) / z]; };
    const pose = { yaw: 0 };
    const rotY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]]; };
    const modell = (p) => rotY(p, pose.yaw);
    const modellMatris = () => { const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
    const vpMatris = (B0, H0) => {
      const a0 = add(mul(KR, (2 * vy.f) / B0), mul(KF, (2 * vy.cx) / B0 - 1));
      const a1 = add(mul(KU, (2 * vy.f) / H0), mul(KF, 1 - (2 * vy.cy) / H0));
      const nara = 1, fjarr = 14, A2 = (fjarr + nara) / (fjarr - nara), B2 = (-2 * fjarr * nara) / (fjarr - nara);
      const a2 = mul(KF, A2), a3 = KF;
      const c0 = -dot(a0, KAM.pos), c1 = -dot(a1, KAM.pos), c2 = -dot(a2, KAM.pos) + B2, c3 = -dot(a3, KAM.pos);
      return new Float32Array([a0[0], a1[0], a2[0], a3[0], a0[1], a1[1], a2[1], a3[1], a0[2], a1[2], a2[2], a3[2], c0, c1, c2, c3]);
    };
    // Strålen genom en skärmpunkt (CSS-px i behållaren) → träff på huden i objektrummet (eller null)
    const stral = (sx, sy) => {
      const rd = norm(add(KF, add(mul(KR, (sx - vy.cx) / vy.f), mul(KU, (vy.cy - sy) / vy.f))));
      const ro = rotY(KAM.pos, -pose.yaw), r = rotY(rd, -pose.yaw);
      if (K.mesh && !K.M) return null;
      if (K.mesh) { // nätet: närmaste triangel längs strålen; nära miss (fingret bredvid en tunn arm) = en av åtta strålar runt om
        const traff = (d) => { const h = stralRut(K.M, ro, d, 12); return h ? { ...h, p: add(ro, mul(d, h.t)) } : null; };
        let h = traff(r);
        if (!h) {
          const z = dot(sub(K.ANK[RID.mage].p, ro), r), rr = 0.013 / Math.max(1, z), u = norm(cross(r, [0, 1, 0])), w = cross(u, r);
          for (let i = 0; i < 8 && !h; i++) { const a = (i * Math.PI) / 4; h = traff(norm(add(r, add(mul(u, Math.cos(a) * rr), mul(w, Math.sin(a) * rr))))); }
        }
        if (!h) return null;
        const D = K.M.data, I = K.M.index, b = [1 - h.u - h.w, h.u, h.w], j = b[0] >= b[1] ? (b[0] >= b[2] ? 0 : 2) : b[1] >= b[2] ? 1 : 2;
        h.p.reg = D[I[h.tri * 3 + j] * 9 + 7];
        return h.p;
      }
      let t = Math.max(0, len(ro) - 1.3), bast = 1e9, bastP = null;
      for (let i = 0; i < 220 && t < len(ro) + 1.3; i++) {
        const p = add(ro, mul(r, t)), d = K.kartaV(p);
        if (p[1] > -0.01 && d < bast) { bast = d; bastP = p; }
        if (d < 0.0008) return p;
        t += Math.max(d * 0.9, 0.0015);
      }
      return bast < 0.013 ? bastP : null; // nära miss (fingertryck bredvid en tunn arm) räknas som träff
    };
    const skymd = (pObj) => {
      const ro = rotY(KAM.pos, -pose.yaw);
      const dv = sub(pObj, ro), L = len(dv), rd = mul(dv, 1 / L);
      if (K.mesh) return !!K.M && !!stralRut(K.M, ro, rd, L - 0.025);
      let t = Math.max(0, L - 0.95);
      for (let i = 0; i < 56 && t < L - 0.025; i++) { const d = K.karta(ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t); if (d < 0.0015) return true; t += Math.max(d * 0.9, 0.002); }
      return false;
    };
    const vander = (i) => { const a = K.ANK[i]; return dot(modell(a.n), norm(sub(KAM.pos, modell(a.p)))); };

    /* tillstånd */
    let B = 0, H = 0;
    const nivaMal = new Float32Array(NR), niva = new Float32Array(NR), fargZ = new Float32Array(NR * 3), textZ = new Array(NR).fill(null);
    const ZC = new Float32Array(MAXZ * 3), ZN = new Float32Array(MAXZ * 3), ZF = new Float32Array(MAXZ * 4), ZR = new Float32Array(MAXZ);
    const zonUniform = () => { // de aktiva regionerna (starkast först) → uniform-listorna
      const akt = []; for (let i = 0; i < NR; i++) if (niva[i] > 0.003) akt.push(i);
      akt.sort((a, b) => niva[b] - niva[a]); akt.length = Math.min(akt.length, MAXZ);
      akt.forEach((i, j) => {
        const a = K.ANK[i], r = REGIONER[i];
        ZC.set(a.p, j * 3); ZN.set(r.sida === 'bada' ? [0, 0, 0] : a.n, j * 3); ZR[j] = a.R * 1.3;
        ZF[j * 4] = fargZ[i * 3]; ZF[j * 4 + 1] = fargZ[i * 3 + 1]; ZF[j * 4 + 2] = fargZ[i * 3 + 2]; ZF[j * 4 + 3] = niva[i];
      });
      return akt.length;
    };
    const fokus = { id: -1, sid: -9, s: 0, zoom: 0, farg: [0.494, 0.878, 0.765], p: [0, -5, 0], R: 0.1 };
    const ljust = { v: o.lage === 'motionar' ? 1 : 0, fran: 0, till: 0, t0: 0 };
    ljust.fran = ljust.till = ljust.v;
    let fart = 0, tween = null, drar = false, senast = 0, kor = false, ram = 0, pausad = false, forstord = false;
    let natKlar = 0, natAntal = 0, natTyp = 0, synligNu = false;
    const auto = { pa: !!o.autoVrid && !lugn, efter: 0, bas: 0, fas: 0, vikt: 0 };
    let skan = null; // { t0, ms, klar }
    const lyssnare = new Set();
    const start = performance.now();

    /* layout: kroppen ryms i höjd och bredd (armarna), ~6 % luft upptill */
    const ordna = () => {
      B = el.clientWidth; H = el.clientHeight; if (!B || !H) return false;
      const vTopp = normProj([0, K.MATT.topp + 0.04, 0])[1], vFot = normProj([0, 0, 0.12])[1];
      const fH = (0.86 * H) / (vTopp - vFot);
      const fB = (B / 2 - 8) / normProj([K.MATT.bredd, 1.0, 0])[0];
      const f = Math.max(60, Math.min(fH, fB));
      vy.f0 = f; vy.cx = B / 2; vy.cy0 = H * 0.5 + (f * (vTopp + vFot)) / 2 - H * 0.01;
      vy.f = f; vy.cy = vy.cy0;
      ledare.setAttribute('viewBox', `0 0 ${B} ${H}`);
      return true;
    };
    const kamera = () => { // fokuszoom: något närmare och regionen mot mitten
      const z = mjuk(fokus.zoom);
      vy.f = vy.f0 * (1 + 0.14 * z);
      if (z < 1e-4) { vy.cy = vy.cy0; vy.f = vy.f0; return; }
      const np = normProj(modell(fokus.p))[1];
      const y0 = vy.cy0 - vy.f0 * np, mal = y0 + (H * 0.5 - y0) * z * 0.55;
      vy.cy = Math.min(mal + vy.f * np, H - 4 + vy.f * normProj([0, 0, 0.1])[1]);
      vy.cy = Math.max(vy.cy, H * 0.03 + vy.f * normProj([0, K.MATT.topp + 0.04, 0])[1]); // huvudet ryms alltid
    };

    /* etiketterna */
    const chips = new Map(); // id → { el, path, prick, b, h, y, sida, synlig, skymd, rakna }
    const byggChips = () => {
      for (const [i, c] of chips) if (!(nivaMal[i] > 0)) { c.el.remove(); c.path.remove(); c.prick.remove(); chips.delete(i); }
      if (!o.etiketter) return;
      for (let i = 0; i < NR; i++) {
        if (!(nivaMal[i] > 0)) continue;
        const nv = Math.round(nivaMal[i] * 10), rgb = [0, 1, 2].map((k) => Math.round(fargZ[i * 3 + k] * 255)).join(', ');
        const text = textZ[i] != null ? String(textZ[i]) : `${nv}/10`;
        let c = chips.get(i);
        if (!c) {
          const knapp = document.createElement('button'); knapp.type = 'button'; knapp.className = 'kr-chip'; knapp.dataset.id = REGIONER[i].id;
          knapp.innerHTML = '<i></i><span></span><b></b>'; knapp.style.position = 'absolute'; knapp.style.left = '0'; knapp.style.top = '0';
          knapp.addEventListener('click', () => { const a = projicera(modell(K.ANK[i].p)); meddela(REGIONER[i].id, { x: a[0], y: a[1] }); });
          lagerEt.append(knapp);
          const path = document.createElementNS(NS, 'path'), prick = document.createElementNS(NS, 'circle');
          prick.setAttribute('r', '2.6'); ledare.append(path, prick);
          c = { el: knapp, path, prick, b: 0, h: 0, y: 0, x: 0, sida: '', synlig: false, skymd: false, rakna: i % 4, d: '' };
          chips.set(i, c);
        }
        c.el.querySelector('span').textContent = REGIONER[i].namn;
        c.el.querySelector('b').textContent = text;
        c.el.setAttribute('aria-label', `${REGIONER[i].namn}, ${textZ[i] != null ? text : `${nv} av 10`}`);
        c.el.style.setProperty('--kr-farg', rgb);
        c.path.style.setProperty('--kr-farg', rgb); c.prick.style.setProperty('--kr-farg', rgb);
        c.b = 0;
      }
    };
    const visaChip = (c, ja) => {
      if (c.synlig === ja) return; c.synlig = ja;
      c.el.toggleAttribute('data-synlig', ja); c.path.toggleAttribute('data-synlig', ja); c.prick.toggleAttribute('data-synlig', ja);
      c.el.tabIndex = ja ? 0 : -1;
    };
    let rutaNr = 0;
    const placeraChips = (dt, avsloj) => {
      if (!chips.size) return;
      rutaNr++;
      const smal = B < 480, max = smal ? 3 : 6, kant = smal ? 6 : 12;
      const kand = [];
      for (const [i, c] of chips) {
        if (!c.b) { c.b = c.el.offsetWidth; c.h = c.el.offsetHeight; }
        const a = K.ANK[i], sp = projicera(modell(a.p));
        const v = vander(i);
        if ((rutaNr + c.rakna) % 4 === 0 || lugn) c.skymd = v > 0.05 && skymd(a.p);
        const ok = natKlar && avsloj > a.p[1] + 0.02 && v > 0.08 && !c.skymd;
        kand.push({ i, c, sp, ok, prio: nivaMal[i] + (i === fokus.id ? 2 : 0) });
      }
      const visas = kand.filter((k) => k.ok).sort((a, b) => b.prio - a.prio).slice(0, max);
      for (const k of kand) if (!visas.includes(k)) visaChip(k.c, false);
      for (const k of visas) {
        const c = k.c;
        if (!c.sida || (c.sida === 'v' && k.sp[0] > vy.cx + 18) || (c.sida === 'h' && k.sp[0] < vy.cx - 18)) c.sida = k.sp[0] < vy.cx ? 'v' : 'h';
        k.mal = k.sp[1] - c.h / 2;
      }
      for (const sida of ['v', 'h']) {
        const lista = visas.filter((k) => k.c.sida === sida).sort((a, b) => a.mal - b.mal);
        let y = kant;
        for (const k of lista) { k.ty = Math.max(k.mal, y); y = k.ty + k.c.h + 6; }
        let gans = H - kant; // underifrån: skjut upp det som hamnar nedanför
        for (let j = lista.length - 1; j >= 0; j--) { lista[j].ty = Math.min(lista[j].ty, gans - lista[j].c.h); gans = lista[j].ty - 6; }
        for (const k of lista) k.ty = Math.max(kant, k.ty);
        for (const k of lista) {
          const c = k.c, forst = !c.synlig;
          c.y = forst || lugn ? k.ty : c.y + (k.ty - c.y) * Math.min(1, dt * 12);
          c.x = sida === 'v' ? kant : B - kant - c.b;
          c.el.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0)`;
          const kx = sida === 'v' ? c.x + c.b : c.x, ky = c.y + c.h / 2, kna = sida === 'v' ? kx + 10 : kx - 10;
          const d = `M${kx.toFixed(1)} ${ky.toFixed(1)}H${kna.toFixed(1)}L${k.sp[0].toFixed(1)} ${k.sp[1].toFixed(1)}`;
          if (d !== c.d) { c.d = d; c.path.setAttribute('d', d); c.prick.setAttribute('cx', k.sp[0].toFixed(1)); c.prick.setAttribute('cy', k.sp[1].toFixed(1)); }
          c.el.toggleAttribute('data-fokus', k.i === fokus.id);
          visaChip(c, true);
        }
      }
    };

    /* WebGL */
    const OPT = { antialias: true, alpha: true, premultipliedAlpha: true, depth: true, stencil: true, preserveDrawingBuffer: false };
    let gl = canvas.getContext('webgl2', OPT);
    const gl2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', OPT) || canvas.getContext('experimental-webgl', OPT);
    let derivator = gl2, stora = gl2;
    if (gl && !gl2) { derivator = !!gl.getExtension('OES_standard_derivatives'); stora = !!gl.getExtension('OES_element_index_uint'); }
    let P = {}, natBuf = null, natInd = null, golvBuf = null, pBuf = null, P_ANTAL = 0, natData = null;
    const ATTR = { aPos: 0, aNor: 1, aAo: 2, aReg: 3, aKurv: 4, aXZ: 0, aP: 0 };
    const program = (vs, fs) => {
      const hogPrec = (() => { const p = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT); return p && p.precision > 0; })();
      const VSH = gl2 ? '#version 300 es\n#define attribute in\n#define varying out\n' : '';
      const FSH = gl2 ? '#version 300 es\nprecision highp float;\n#define varying in\nout vec4 utFarg;\n#define gl_FragColor utFarg\n'
        : `#extension GL_OES_standard_derivatives : enable\nprecision ${hogPrec ? 'highp' : 'mediump'} float;\n`;
      const sk = (typ, kod) => { const s = gl.createShader(typ); gl.shaderSource(s, kod); gl.compileShader(s); return s; };
      const v = sk(gl.VERTEX_SHADER, VSH + vs), f = sk(gl.FRAGMENT_SHADER, FSH + fs);
      const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f);
      for (const [namn, i] of Object.entries(ATTR)) gl.bindAttribLocation(p, i, namn);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        if (window.UPKroppLogg) console.warn(gl.getProgramInfoLog(p), gl.getShaderInfoLog(v), gl.getShaderInfoLog(f));
        return null;
      }
      const u = {}; const antal = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < antal; i++) { const info = gl.getActiveUniform(p, i); const namn = info.name.replace(/\[0\]$/, ''); u[namn] = gl.getUniformLocation(p, namn); }
      return { p, u };
    };
    const laddaNat = (r) => {
      natData = r;
      natBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, natBuf); gl.bufferData(gl.ARRAY_BUFFER, r.data, gl.STATIC_DRAW);
      natInd = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, natInd); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, r.index, gl.STATIC_DRAW);
      natAntal = r.index.length; natTyp = r.index instanceof Uint16Array ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT;
      if (opts.tillbehor === 'landslaget') byggTillbehor(r);
    };
    let tbBuf = null, tbInd = null, tbAntal = 0, tbTex = null;
    function byggTillbehor(r) {
      try {
        const D = r.data, I = r.index, nv = D.length / 9; let topp = -9, toppI = 0;
        for (let v = 0; v < nv; v++) if (D[v * 9 + 1] > topp) { topp = D[v * 9 + 1]; toppI = v; }
        const ut = [], ind = [], karta = new Map();
        // skalet: hörn i ett område flyttas ut längs normalen; trianglar där alla tre hörnen ingår följer med
        const skal = (valj, typFor, off, uvFor) => { karta.clear();
          for (let t = 0; t < I.length; t += 3) { const a = I[t], b = I[t + 1], c = I[t + 2]; if (!valj(a) || !valj(b) || !valj(c)) continue;
            for (const v of [a, b, c]) { if (!karta.has(v)) { const x = D[v * 9], y = D[v * 9 + 1], z = D[v * 9 + 2], nx = D[v * 9 + 3], ny = D[v * 9 + 4], nz = D[v * 9 + 5], o = off(v), [u, w] = uvFor(v);
              karta.set(v, ut.length / 9); ut.push(x + nx * o, y + ny * o, z + nz * o, nx, ny, nz, typFor(v), u, w); } ind.push(karta.get(v)); } } };
        // mössan: över en lutande kant (lägre bak, högre över pannan), kronan lite högre som en riktig mössa
        const kantY = (z) => topp - 0.098 + z * 0.26, hojd = (v) => D[v * 9 + 1] - kantY(D[v * 9 + 2]);
        const iHuvud = (v) => D[v * 9 + 1] > topp - 0.2 && Math.abs(D[v * 9]) < 0.13 && hojd(v) > 0;
        skal(iHuvud, (v) => (hojd(v) < 0.03 ? 1 : 0), (v) => { const h = hojd(v); return 0.011 + (h < 0.03 ? 0.006 : 0) + Math.max(0, h - 0.07) * 0.32; }, (v) => [0, hojd(v)]);
        // tofsen: ett klot ovanpå kronan
        const T = [D[toppI * 9], topp + 0.044, D[toppI * 9 + 2] - 0.012], R0 = 0.033, bas = ut.length / 9, ST = 16, SL = 24;
        for (let i = 0; i <= ST; i++) for (let j = 0; j <= SL; j++) { const th = i / ST * Math.PI, ph = j / SL * Math.PI * 2, nx = Math.sin(th) * Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.sin(ph);
          ut.push(T[0] + nx * R0, T[1] + ny * R0, T[2] + nz * R0, nx, ny, nz, 2, 0, 0); }
        for (let i = 0; i < ST; i++) for (let j = 0; j < SL; j++) { const a = bas + i * (SL + 1) + j, b = a + SL + 1; ind.push(a, a + 1, b, a + 1, b + 1, b); }
        // tubhalsduk runt halsen
        const iHals = (v) => { const y = D[v * 9 + 1]; return y > topp * 0.805 && y < topp * 0.855 && Math.abs(D[v * 9]) < 0.095; };
        skal(iHals, () => 4, () => 0.014, (v) => [0, D[v * 9 + 1]]);
        // handskar: händerna (låga, långt ut åt sidorna)
        const hand = { v: [0, 0, 0, 0, -9], h: [0, 0, 0, 0, -9] };
        const iHand = (v) => { const y = D[v * 9 + 1]; return y > topp * 0.4 && y < topp * 0.54 && Math.abs(D[v * 9]) > 0.215; };
        for (let v = 0; v < nv; v++) if (iHand(v)) { const sd = D[v * 9] > 0 ? 'v' : 'h', h = hand[sd]; h[0] += D[v * 9]; h[1] += D[v * 9 + 1]; h[2] += D[v * 9 + 2]; h[3]++; h[4] = Math.max(h[4], D[v * 9 + 1]); }
        skal(iHand, () => 5, () => 0.0065, (v) => [0, hand[D[v * 9] > 0 ? 'v' : 'h'][4] - D[v * 9 + 1]]);
        // cylinder mellan två punkter (stavarna) – v går från 0 (spets) till 1 (handtag)
        const cyl = (a, b, ra, rb, typ, v0 = 0, v1 = 1, seg = 12) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d), t = d.map((x) => x / L);
          const u0 = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], e1 = [t[1] * u0[2] - t[2] * u0[1], t[2] * u0[0] - t[0] * u0[2], t[0] * u0[1] - t[1] * u0[0]], l1 = Math.hypot(...e1); e1[0] /= l1; e1[1] /= l1; e1[2] /= l1;
          const e2 = [t[1] * e1[2] - t[2] * e1[1], t[2] * e1[0] - t[0] * e1[2], t[0] * e1[1] - t[1] * e1[0]], b0 = ut.length / 9;
          for (let k = 0; k <= 1; k++) for (let j = 0; j <= seg; j++) { const f = j / seg * Math.PI * 2, n = [0, 1, 2].map((i) => e1[i] * Math.cos(f) + e2[i] * Math.sin(f)), p = k ? b : a, rr = k ? rb : ra;
            ut.push(p[0] + n[0] * rr, p[1] + n[1] * rr, p[2] + n[2] * rr, n[0], n[1], n[2], typ, 0, k ? v1 : v0); }
          for (let j = 0; j < seg; j++) { const a0 = b0 + j, a1 = b0 + seg + 1 + j; ind.push(a0, a0 + 1, a1, a0 + 1, a1 + 1, a1); } };
        for (const sd of ['v', 'h']) { const h = hand[sd]; if (h[3] < 5) continue; const c = [h[0] / h[3], h[1] / h[3], h[2] / h[3]], ut0 = Math.sign(c[0]);
          const grepp = [c[0], c[1] + 0.075, c[2] + 0.01], spets = [c[0] + ut0 * 0.11, 0.0, c[2] + 0.16];
          cyl(spets, grepp, 0.006, 0.0085, 6, 0, 0.86, 10); cyl(grepp, [grepp[0], grepp[1] + 0.04, grepp[2]], 0.012, 0.011, 6, 0.93, 1, 10);
          const k0 = [spets[0] + (grepp[0] - spets[0]) * 0.09, spets[1] + (grepp[1] - spets[1]) * 0.09, spets[2] + (grepp[2] - spets[2]) * 0.09];
          cyl(k0, [k0[0], k0[1] + 0.008, k0[2]], 0.038, 0.012, 6, 0.95, 0.95, 16); }
        // nummerlappen på bröstet
        const X0 = 0.085, Y0 = topp * 0.655, Y1 = topp * 0.74;
        const iLapp = (v) => { const x = D[v * 9], y = D[v * 9 + 1], z = D[v * 9 + 2]; return Math.abs(x) < X0 + 0.02 && y > Y0 - 0.02 && y < Y1 + 0.02 && z > 0 && D[v * 9 + 5] > 0.3; };
        skal(iLapp, () => 3, () => 0.007, (v) => [(D[v * 9] + X0) / (2 * X0), (D[v * 9 + 1] - Y0) / (Y1 - Y0)]);
        // triangelns ordning: kontrollera att tofsens trianglar vetter utåt (samma som kroppens framsidor)
        tbBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tbBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ut), gl.STATIC_DRAW);
        const stor = ut.length / 9 > 65535; tbInd = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tbInd);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, stor ? new Uint32Array(ind) : new Uint16Array(ind), gl.STATIC_DRAW); tbAntal = ind.length; tbStor = stor;
        // lappens tryck: gul med blå kant, SVERIGE och nummer 1 (ingen förbundslogga)
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const g = cv.getContext('2d');
        g.fillStyle = '#ffd21a'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#0b4fae'; g.fillRect(0, 0, 256, 58); g.fillRect(0, 226, 256, 30);
        g.fillStyle = '#fff'; g.font = '800 40px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SVERIGE', 128, 31);
        g.fillStyle = '#0b2f6b'; g.font = '800 150px system-ui, sans-serif'; g.fillText('1', 128, 146);
        tbTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tbTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      } catch (err) { tbAntal = 0; }
    }
    let tbStor = false;
    const bygg = () => {
      P = {
        fram: program(KROPP_VS, KROPP_FS(0)), bak: program(KROPP_VS, KROPP_FS(1)), spegel: program(KROPP_VS, KROPP_FS(2)),
        sken: program(KROPP_VS, KROPP_FS(3)), djup: program(KROPP_VS, KROPP_FS(4)),
        golv: program(GOLV_VS, GOLV_FS), punkt: program(PUNKT_VS, PUNKT_FS), skiva: program(SKIVA_VS, SKIVA_FS),
      };
      if (Object.values(P).some((x) => !x)) return false;
      if (opts.tillbehor) P.tb = program(TB_VS, TB_FS) || undefined;
      golvBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, golvBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      P_ANTAL = Math.min(innerWidth, innerHeight) < 600 ? 26 : 40;
      const d = []; let fro = 7;
      const slump = () => { fro = (fro * 16807) % 2147483647; return fro / 2147483647; };
      for (let i = 0; i < P_ANTAL; i++) d.push(slump() * 6.2832, 0.26 + slump() * 0.42, slump(), 0.02 + slump() * 0.03);
      pBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(d), gl.STATIC_DRAW);
      if (natData) laddaNat(natData);
      gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clearStencil(0);
      return true;
    };
    let utan3d = !gl || !derivator || !bygg();

    const storlek = () => {
      if (!ordna()) return;
      let dpr = Math.min(devicePixelRatio || 1, 2);
      dpr = Math.min(dpr, Math.sqrt(3.2e6 / (B * H)));
      const b = Math.max(1, Math.round(B * dpr)), h = Math.max(1, Math.round(H * dpr));
      if (canvas.width !== b || canvas.height !== h) { canvas.width = b; canvas.height = h; }
    };
    const kroppAttr = () => {
      gl.bindBuffer(gl.ARRAY_BUFFER, natBuf); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, natInd);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 36, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 36, 24);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 36, 28);
      gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 36, 32);
    };
    const avAttr = () => { for (let i = 1; i <= 4; i++) gl.disableVertexAttribArray(i); };
    const satt = (pr, varden) => {
      gl.useProgram(pr.p);
      for (const [k, v] of Object.entries(varden)) {
        const u = pr.u[k]; if (!u) continue;
        if (typeof v === 'number') gl.uniform1f(u, v);
        else if (k === 'uZr') gl.uniform1fv(u, v);
        else if (k === 'uZc' || k === 'uZn') gl.uniform3fv(u, v);
        else if (k === 'uZf') gl.uniform4fv(u, v);
        else if (v.length === 16) gl.uniformMatrix4fv(u, false, v);
        else if (v.length === 4) gl.uniform4fv(u, v);
        else if (v.length === 3) gl.uniform3fv(u, v);
        else if (v.length === 2) gl.uniform2fv(u, v);
      }
    };

    /* skanningen: [avslöjande, skanplan, styrka, intro] */
    const INTRO = 1.7;
    const skanning = (nu) => {
      if (!natKlar) return [-1, -5, 0, 0];
      if (skan) {
        if (!skan.t0) skan.t0 = nu;
        const p = (nu - skan.t0) / skan.ms;
        if (p >= 1) { const k = skan.klar; skan = null; k(); }
        else if (lugn) return [9, -5, 0, 1];
        else if (p < 0.55) { const u = p / 0.55, y = -0.03 + easeIO(u) * 1.92; return [y, y, mjuk(klamp(u * 8, 0, 1)) * mjuk(klamp((1 - u) * 10, 0, 1)), 1]; }
        else { const u = (p - 0.55) / 0.45, y = 1.86 - easeIO(u) * 1.88; return [9, y, mjuk(klamp(u * 6, 0, 1)) * mjuk(klamp((1 - u) * 6, 0, 1)), 1]; }
      }
      if (lugn) return [9, -5, 0, 1];
      const tk = (nu - natKlar) / 1000;
      if (tk < INTRO) { const u = tk / INTRO, y = -0.03 + easeIO(u) * 1.92; return [y, y, mjuk(klamp(u * 8, 0, 1)) * mjuk(klamp((1 - u) * 10, 0, 1)), u]; }
      return [9, -5, 0, 1];
    };

    function rita(nu, enGang) {
      if (forstord || utan3d) return;
      const ms = nu - (senast || nu); const dt = Math.min(0.05, ms / 1000); senast = nu;
      const t = (nu - start) / 1000;
      // vridning: tween (vy/markera) → tröghet efter dragning → långsam autovridning ±25°
      if (!drar) {
        if (tween) {
          const u = klamp((nu - tween.start) / tween.langd, 0, 1);
          pose.yaw = tween.fran + (tween.till - tween.fran) * easeIO(u);
          if (u >= 1) tween = null;
        } else {
          pose.yaw += fart; fart *= Math.pow(0.92, dt * 60); if (Math.abs(fart) < 1e-4) fart = 0;
          const vill = auto.pa && fokus.id < 0 && nu > auto.efter && Math.abs(fart) < 0.002;
          if (vill && auto.vikt === 0 && auto.fas === 0) auto.bas = pose.yaw;
          auto.vikt = vill ? Math.min(1, auto.vikt + dt / 2.5) : 0;
          if (vill) { auto.fas += dt * 0.32; pose.yaw = auto.bas + 0.436 * Math.sin(auto.fas) * mjuk(auto.vikt); }
          else auto.fas = 0;
        }
      }
      // mjuka övergångar: paletten, nivåerna, fokus
      if (ljust.v !== ljust.till) {
        const u = lugn ? 1 : klamp((nu - ljust.t0) / 600, 0, 1);
        ljust.v = ljust.fran + (ljust.till - ljust.fran) * mjuk(u);
        if (u >= 1) ljust.v = ljust.till;
      }
      const k6 = lugn ? 1 : Math.min(1, dt * 5);
      for (let i = 0; i < NR; i++) niva[i] += (nivaMal[i] - niva[i]) * k6;
      fokus.s += ((fokus.id >= 0 ? 1 : 0) - fokus.s) * k6;
      fokus.zoom += ((fokus.id >= 0 ? 1 : 0) - fokus.zoom) * (lugn ? 1 : Math.min(1, dt * 3));
      kamera();

      const andas = lugn ? 0 : Math.sin(t * 1.35) * 0.0028;
      const [avsloj, skanY, skanStyrka, introU] = skanning(nu);
      const intro = lugn ? 1 : mjuk(klamp(t / 1.3, 0, 1));
      const VP = vpMatris(B, H), M = modellMatris();
      const tid = lugn ? 2.2 : t;
      const ljus = norm(add(add(mul(KR, -0.55), mul(KU, 0.8)), mul(KF, -0.55)));
      const linjeAvst = klamp(6.2 / (vy.f / 4.7), 0.011, 0.04);
      const L = ljust.v;
      const gem = { uVP: VP, uM: M, uKamPos: KAM.pos, uLjus: ljus, uTid: tid, uSkan: skanStyrka > 0 ? skanY : -5, uAvsloj: avsloj, uLinje: linjeAvst,
        uFokS: fokus.s, uFokR: fokus.R, uFokP: fokus.p, uFokFarg: fokus.farg, uFokId: fokus.sid, uLjust: L,
        uZc: ZC, uZn: ZN, uZf: ZF, uZr: ZR, uZant: zonUniform(), uAndas: andas, uUt: 0, uSpegel: 0, uStyrka: 1 };

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.depthMask(true); gl.colorMask(true, true, true, true); gl.stencilMask(0xff);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.disable(gl.STENCIL_TEST);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // förmultiplicerat: additivt ljus har alfa 0
      const harNat = natAntal > 0 && avsloj > -0.02;

      // 1) spegling i golvet (bara elit)
      if (harNat && L < 0.995) {
        kroppAttr(); satt(P.spegel, { ...gem, uSpegel: 1, uStyrka: 0.3 });
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(gl.CW);
        gl.drawElements(gl.TRIANGLES, natAntal, natTyp, 0);
        gl.frontFace(gl.CCW); gl.clear(gl.DEPTH_BUFFER_BIT); avAttr();
      }
      // 2) golvet
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      const BV = K.BEN.V.A, BH = K.BEN.H.A, f1 = modell([BV[0], 0, BV[2] + 0.05]), f2 = modell([BH[0], 0, BH[2] + 0.05]);
      satt(P.golv, { uVP: VP, uTid: tid, uIntro: intro, uLjust: L, uFot: [f1[0], f1[2], f2[0], f2[2]] });
      gl.bindBuffer(gl.ARRAY_BUFFER, golvBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (harNat) {
        kroppAttr();
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true); gl.enable(gl.CULL_FACE);
        // 3) baksidorna dovt genom glaset (elit)
        if (L < 0.995) { gl.cullFace(gl.FRONT); satt(P.bak, gem); gl.drawElements(gl.TRIANGLES, natAntal, natTyp, 0); gl.clear(gl.DEPTH_BUFFER_BIT); }
        // 4) djup, 5) framsidorna
        gl.cullFace(gl.BACK);
        gl.colorMask(false, false, false, false); satt(P.djup, gem); gl.drawElements(gl.TRIANGLES, natAntal, natTyp, 0);
        gl.colorMask(true, true, true, true); gl.depthFunc(gl.LEQUAL); gl.depthMask(false);
        satt(P.fram, gem); gl.drawElements(gl.TRIANGLES, natAntal, natTyp, 0);
        // 5b) tillbehören (landslaget): mössa, tofs och nummerlapp – med djup mot kroppen
        if (tbAntal && P.tb) { avAttr(); gl.depthMask(true); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
          gl.bindBuffer(gl.ARRAY_BUFFER, tbBuf); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tbInd);
          gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 36, 12);
          gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 36, 24); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 36, 28);
          gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 36, 32);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tbTex); satt(P.tb, gem); if (P.tb.u.uTex) gl.uniform1i(P.tb.u.uTex, 0);
          gl.drawElements(gl.TRIANGLES, tbAntal, tbStor ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
          gl.depthMask(false); gl.enable(gl.CULL_FACE); kroppAttr(); }
        // 6) skenet runt kroppen
        gl.cullFace(gl.FRONT); satt(P.sken, { ...gem, uUt: B < 520 ? 0.028 : 0.022 });
        gl.drawElements(gl.TRIANGLES, natAntal, natTyp, 0);
        avAttr();
      }
      // 7) ljuspartiklar
      gl.disable(gl.CULL_FACE); if (!harNat) gl.disable(gl.DEPTH_TEST);
      if (!lugn) {
        const dprx = canvas.width / B;
        satt(P.punkt, { uVP: VP, uTid: t, uPkt: 2.6 * dprx, uIntro: intro, uYaw: pose.yaw, uLjust: L });
        gl.bindBuffer(gl.ARRAY_BUFFER, pBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.POINTS, 0, P_ANTAL);
      }
      // 8) skanningens tvärsnitt (stencil: udda antal ytor framför planet = inne i kroppen)
      if (harNat && skanStyrka > 0.001) {
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, golvBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        satt(P.skiva, { uVP: VP, uY: skanY, uR: 0.62, uLock: 0, uStyrka: 0, uLjust: L });
        gl.colorMask(false, false, false, false); gl.depthMask(true); gl.depthFunc(gl.ALWAYS); gl.enable(gl.DEPTH_TEST); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        kroppAttr(); satt(P.djup, { ...gem, uAvsloj: 9 });
        gl.depthMask(false); gl.depthFunc(gl.LESS); gl.enable(gl.STENCIL_TEST); gl.stencilFunc(gl.ALWAYS, 0, 1); gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
        gl.drawElements(gl.TRIANGLES, natAntal, natTyp, 0); avAttr();
        gl.colorMask(true, true, true, true); gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP); gl.depthFunc(gl.LEQUAL);
        gl.bindBuffer(gl.ARRAY_BUFFER, golvBuf); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.stencilFunc(gl.EQUAL, 1, 1); satt(P.skiva, { uVP: VP, uY: skanY, uR: 0.62, uLock: 1, uStyrka: skanStyrka, uLjust: L }); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.stencilFunc(gl.EQUAL, 0, 1); satt(P.skiva, { uVP: VP, uY: skanY, uR: 0.62, uLock: 0, uStyrka: skanStyrka, uLjust: L }); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disable(gl.STENCIL_TEST);
      }
      gl.disable(gl.DEPTH_TEST); gl.depthMask(true);

      placeraChips(dt, avsloj);
      if (natKlar && !el.hasAttribute('data-kr-klar')) el.setAttribute('data-kr-klar', '');
      el.toggleAttribute('data-kr-skannar', !!skan || introU < 1);
      if (kor && !enGang) ram = requestAnimationFrame((x) => rita(x));
      else if (!kor && skan && !enGang) ram = requestAnimationFrame((x) => rita(x, false)); // stillbild: kör tills skanningen är klar
    }
    const ritaNu = () => { if (!forstord && !utan3d && B && H && !kor) { cancelAnimationFrame(ram); rita(performance.now(), true); } else if (utan3d) reservRita(); };
    const uppdateraKor = () => {
      const ska = synligNu && !document.hidden && !pausad && !lugn && !forstord && !utan3d;
      if (ska && !kor) { kor = true; senast = 0; ram = requestAnimationFrame((x) => rita(x)); }
      else if (!ska && kor) { kor = false; cancelAnimationFrame(ram); }
    };
    const behov = () => { if (!kor) ritaNu(); };

    /* reserv utan WebGL: samma kropp i 2D, ritad en gång på processorn (framifrån eller bakifrån) */
    function reservRita() {
      if (!ordna() || forstord) return;
      el.setAttribute('data-kr-utan-3d', '');
      const sk = Math.min(1.5, Math.sqrt(160000 / (B * H)), Math.max(1, devicePixelRatio || 1));
      const b = Math.round(B * sk), h = Math.round(H * sk);
      canvas.width = b; canvas.height = h;
      const c2 = canvas.getContext('2d'); if (!c2) return;
      const bild = c2.createImageData(b, h), px = bild.data, L = ljust.till;
      const ro = KAM.pos, bak = Math.cos(pose.yaw) < 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < b; x++) {
        const rd = norm(add(KF, add(mul(KR, ((x + 0.5) / sk - vy.cx) / vy.f), mul(KU, (vy.cy - (y + 0.5) / sk) / vy.f))));
        const p0 = add(ro, mul(rd, -ro[2] / rd[2]));
        if (Math.abs(p0[0]) > 0.46 || p0[1] < -0.03 || p0[1] > 1.84) continue;
        let d = 9;
        for (const dz of [-0.09, -0.04, 0.01, 0.06, 0.11]) { const p = add(ro, mul(rd, (dz - ro[2]) / rd[2])); const q = bak ? [-p[0], p[1], -p[2]] : p; const v = K.kartaV(q); if (v < d) d = v; }
        if (d > 0.05) continue;
        const i = (y * b + x) * 4, kant = Math.exp(-Math.abs(d) * 220);
        if (L > 0.5) {
          if (d < 0) { const m = kant * 0.7; px[i] = 246 - 222 * m; px[i + 1] = 247 - 193 * m; px[i + 2] = 248 - 165 * m; px[i + 3] = 245; }
          else { px[i] = 24; px[i + 1] = 54; px[i + 2] = 83; px[i + 3] = Math.round(kant * 120); }
        } else if (d < 0) { const l = kant * 0.95; px[i] = 12 + 126 * l; px[i + 1] = 28 + 224 * l; px[i + 2] = 44 + 195 * l; px[i + 3] = 230; }
        else { px[i] = 126; px[i + 1] = 224; px[i + 2] = 195; px[i + 3] = Math.round(kant * 230); }
      }
      c2.putImageData(bild, 0, 0);
      el.setAttribute('data-kr-klar', '');
    }

    /* storlek och synlighet */
    const ro = new ResizeObserver(() => { if (utan3d) { reservRita(); return; } storlek(); for (const c of chips.values()) c.b = 0; behov(); });
    ro.observe(el);
    const io = new IntersectionObserver(([p]) => { synligNu = p.isIntersecting; uppdateraKor(); if (synligNu) behov(); }, { rootMargin: '60px' });
    io.observe(el);
    const vidSynlighet = () => uppdateraKor();
    document.addEventListener('visibilitychange', vidSynlighet);
    const tappad = (e) => { e.preventDefault(); kor = false; cancelAnimationFrame(ram); };
    const aterfatt = () => { if (bygg()) { storlek(); uppdateraKor(); behov(); } };
    canvas.addEventListener('webglcontextlost', tappad);
    canvas.addEventListener('webglcontextrestored', aterfatt);

    if (utan3d) {
      if (K.mesh) K = kropp(o.kropp); // reserven i 2D ritas ur SDF:en
      // ersätt duken (en duk med WebGL-försök kan inte ge 2D)
      const ny = document.createElement('canvas'); ny.className = 'kr-duk'; ny.setAttribute('aria-hidden', 'true'); ny.style.cssText = DUK_STIL;
      canvas.replaceWith(ny); canvas = ny; gl = null;
      reservRita();
    } else {
      storlek();
      const sdf = () => {
        const steg = !stora ? 0.0068 : Math.min(innerWidth, innerHeight) < 600 ? 0.0056 : 0.005; // finare nät (cachas i IndexedDB, byggs bara första gången)
        natFor(K, steg).then((r) => {
          if (forstord || !gl) return;
          if (r.index instanceof Uint32Array && !stora) { utan3d = true; reservRita(); return; }
          laddaNat(r); natKlar = performance.now();
          api.nat = { horn: r.horn, trianglar: r.index.length / 3, ms: Math.round(r.ms), webgl2: gl2, modell: false };
          behov();
        });
      };
      // modellen (man): telefon = en delning (≈ 70 600 trianglar – i bild går den inte att skilja från två), större skärm = två
      // (≈ 282 500); utan 32-bitarsindex (äldre WebGL 1) blir det SDF-kroppen
      const niva = (window.UPKroppFelsok && window.UPKroppFelsok.niva) || o.niva || (Math.min(innerWidth, innerHeight) < 600 ? 1 : 2);
      if (K.mesh && stora) {
        modellFor(o.kropp, niva).then((r) => {
          if (forstord || !gl) return;
          K.M = r; K.ANK = r.ank; K.MATT = r.matt;
          storlek(); for (const c of chips.values()) c.b = 0;
          laddaNat(r); natKlar = performance.now();
          api.nat = { horn: r.horn, trianglar: r.index.length / 3, ms: Math.round(r.ms), webgl2: gl2, modell: true, niva, cache: !!r.cache };
          if (fokus.id >= 0) api.markera(REGIONER[fokus.id].id);
          behov();
        }).catch((e) => {
          if (window.UPKroppLogg) console.warn('kroppsmodellen kunde inte laddas – SDF-kroppen används', e);
          if (forstord) return;
          K = kropp(o.kropp); sdf();
        });
      } else { if (K.mesh) K = kropp(o.kropp); sdf(); }
    }

    /* interaktion */
    const meddela = (id, punkt) => { for (const fn of [...lyssnare]) { try { fn(id, punkt); } catch (e) { setTimeout(() => { throw e; }); } } };
    const narmast = (bas0) => bas0 + Math.round((pose.yaw - bas0) / (2 * Math.PI)) * 2 * Math.PI;
    const vridTill = (vinkel) => {
      const till = narmast(vinkel); fart = 0;
      if (lugn) { pose.yaw = till; tween = null; return; }
      const avst = Math.abs(till - pose.yaw);
      tween = avst < 0.001 ? null : { fran: pose.yaw, till, start: performance.now(), langd: 650 + avst * 260 };
    };
    const vilaAuto = (ms) => { auto.efter = performance.now() + ms; auto.vikt = 0; auto.fas = 0; };
    let ned = null; // { id, x, y, px, drag, t }
    const lokal = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * (B / (r.width || B)), (e.clientY - r.top) * (H / (r.height || H))]; };
    const pdown = (e) => {
      if (!o.interaktiv || (e.pointerType === 'mouse' && e.button !== 0)) return;
      ned = { id: e.pointerId, x: e.clientX, y: e.clientY, px: e.clientX, drag: false, t: performance.now() };
      tween = null; fart = 0; vilaAuto(8000);
    };
    const pmove = (e) => {
      if (!ned || e.pointerId !== ned.id) return;
      if (!ned.drag && Math.hypot(e.clientX - ned.x, e.clientY - ned.y) >= 8) {
        if (Math.abs(e.clientY - ned.y) > Math.abs(e.clientX - ned.x) * 1.4 && e.pointerType !== 'mouse') { ned = null; return; } // lodrätt = sidan rullas
        ned.drag = true; ned.px = e.clientX; drar = true; el.setAttribute('data-kr-drar', '');
        try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ok */ }
      }
      if (!ned.drag) return;
      const d = (e.clientX - ned.px) * (2.6 / Math.max(260, B)), nu = performance.now(); ned.px = e.clientX;
      pose.yaw += d;
      const ram0 = Math.max(1, (nu - ned.t) / 16.7); fart = fart * 0.4 + (d / ram0) * 0.6; ned.t = nu;
      vilaAuto(8000);
      if (!kor) ritaNu();
    };
    const pup = (e) => {
      if (!ned || e.pointerId !== ned.id) return;
      const var_ = ned; ned = null;
      if (var_.drag) {
        drar = false; el.removeAttribute('data-kr-drar');
        if (performance.now() - var_.t > 90) fart = 0;
        if (lugn) { fart = 0; ritaNu(); }
        vilaAuto(8000);
        return;
      }
      // pointercancel utan rörelse direkt efter trycket (t.ex. inne i en rullbar vy på pekskärm) räknas också som ett tryck
      if (e.type === 'pointercancel' && (performance.now() - var_.t > 350 || Math.hypot(e.clientX - var_.x, e.clientY - var_.y) >= 8)) return;
      const [lx, ly] = lokal(e);
      const p = stral(lx, ly);
      const id = p ? REGIONER[K.mesh ? p.reg : klassa(p[0], p[1], p[2], K.GF, K.J)].id : null;
      meddela(id, { x: lx, y: ly });
    };
    canvas.addEventListener('pointerdown', pdown);
    canvas.addEventListener('pointermove', pmove);
    canvas.addEventListener('pointerup', pup);
    canvas.addEventListener('pointercancel', pup);

    /* api */
    const regionIndex = (id) => (id == null ? -1 : RID[id] ?? -1);
    const visningsVinkel = (i) => {
      const r = REGIONER[i], a = K.ANK[i];
      const x = a.p[0], sido = Math.abs(x) > 0.03 ? Math.sign(x) : 0;
      if (r.sida === 'fram') return -0.32 * sido;
      if (r.sida === 'bak') return Math.PI + 0.32 * sido;
      // båda sidor: står kvar om regionen redan syns bra, annars närmaste av fram/bak, vriden mot sidan
      if (vander(i) > 0.3) return null;
      return Math.cos(pose.yaw) >= 0 ? -0.6 * sido : Math.PI + 0.6 * sido;
    };
    const api = {
      nat: null,
      satZoner(lista) {
        nivaMal.fill(0);
        textZ.fill(null);
        for (const z of lista || []) {
          const i = regionIndex(z && z.id); if (i < 0) continue;
          const ton = TONER[z.ton] ? z.ton : null, harNiva = z.niva != null && z.niva !== '' && !Number.isNaN(Number(z.niva));
          const t = harNiva ? klamp(Number(z.niva), 0, 10) / 10 : ton ? TON_NIVA[ton] : 0;
          nivaMal[i] = t; textZ[i] = z.text != null && z.text !== '' ? z.text : null;
          fargZ.set((ton ? TONER[ton] : rampJS(t)).map((c) => c / 255), i * 3);
        }
        byggChips(); behov();
      },
      markera(id) {
        const i = regionIndex(id);
        if (i < 0) { fokus.id = -1; vilaAuto(2500); behov(); return; }
        fokus.id = i; fokus.sid = i; fokus.p = K.ANK[i].p; fokus.R = K.ANK[i].R * 1.15;
        fokus.farg = nivaMal[i] > 0 ? [fargZ[i * 3], fargZ[i * 3 + 1], fargZ[i * 3 + 2]] : [0.494, 0.878, 0.765];
        const v = visningsVinkel(i); if (v != null) vridTill(v);
        auto.vikt = 0; auto.fas = 0;
        behov();
        if (lugn) behov();
      },
      onVal(fn) { if (typeof fn === 'function') lyssnare.add(fn); return () => lyssnare.delete(fn); },
      skarmpunkt(id) {
        const i = regionIndex(id); if (i < 0 || !B) return { x: 0, y: 0, synlig: false };
        if (utan3d) ordna();
        const a = K.ANK[i], sp = projicera(modell(a.p));
        return { x: sp[0], y: sp[1], synlig: vander(i) > 0.05 && !skymd(a.p) };
      },
      vy(sida) { fokus.id = -1; vridTill(sida === 'bak' ? Math.PI : 0); vilaAuto(9000); if (utan3d) { pose.yaw = sida === 'bak' ? Math.PI : 0; reservRita(); } else behov(); },
      skanna(ms = 2400) {
        return new Promise((klar) => {
          if (utan3d || forstord) { setTimeout(klar, utan3d ? ms : 0); return; }
          if (skan) skan.klar();
          skan = { t0: 0, ms: Math.max(300, ms), klar };
          if (lugn) { setTimeout(() => { if (skan && skan.klar === klar) { skan = null; klar(); } }, ms); return; }
          if (!kor) { cancelAnimationFrame(ram); ram = requestAnimationFrame((x) => rita(x, false)); }
        });
      },
      satLage(lage) {
        const l = lage === 'motionar' ? 1 : 0; o.lage = l ? 'motionar' : 'elit'; el.dataset.krLage = o.lage;
        if (ljust.till === l) return;
        ljust.fran = ljust.v; ljust.till = l; ljust.t0 = performance.now();
        if (utan3d) { reservRita(); return; }
        if (!kor && !lugn) { // stillastående (pausad/osynlig): kör övergången ändå
          const steg = (nu) => { rita(nu, true); if (ljust.v !== ljust.till) ram = requestAnimationFrame(steg); };
          ram = requestAnimationFrame(steg);
        } else behov();
      },
      pausa() { pausad = true; uppdateraKor(); },
      fortsatt() { pausad = false; uppdateraKor(); behov(); },
      forstor() {
        if (forstord) return; forstord = true; kor = false; cancelAnimationFrame(ram);
        ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', vidSynlighet);
        canvas.removeEventListener('webglcontextlost', tappad); canvas.removeEventListener('webglcontextrestored', aterfatt);
        if (gl) { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); }
        canvas.remove(); ledare.remove(); lagerEt.remove(); lyssnare.clear();
        el.classList.remove('kr'); ['data-kr-lage', 'data-kr-klar', 'data-kr-drar', 'data-kr-skannar', 'data-kr-utan-3d', 'data-kr-stilla'].forEach((a) => el.removeAttribute(a));
        if (el.__upKropp === api) delete el.__upKropp;
      },
    };
    el.__upKropp = api;
    // Felsökning (bara när sidan själv satt window.UPKroppFelsok = {} före monteringen): sätt vinkeln direkt
    if (window.UPKroppFelsok) window.UPKroppFelsok.satYaw = (v) => { pose.yaw = v; tween = null; fart = 0; auto.pa = false; fokus.id = -1; behov(); };
    if (window.UPKroppFelsok) { window.UPKroppFelsok.K = () => K; window.UPKroppFelsok.proj = (p) => projicera(modell(p)); window.UPKroppFelsok.vander = (n) => dot(modell(n), norm(sub(KAM.pos, [0, 1, 0]))); }
    return api;
  }

  window.UPKropp = { montera, REGIONER: REGIONER.map((r) => ({ ...r })) };
})();
