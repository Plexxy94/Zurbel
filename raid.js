// Raid: Montagmorgen. Felix muss den Boss besiegen, dann gibt es das Geschenk als Beute.
(function () {
  const BOSS_LEBEN = 9000, FELIX_LEBEN = 1000;
  const SKILLS = [
    { id: 'wurf', taste: '1', name: 'Siebenmeter', icon: '🤾', cd: 1, info: 'Dein Hauptangriff. Oft drücken!' },
    { id: 'kaffee', taste: '2', name: 'Kaffee', icon: '☕', cd: 6, info: 'Heilt dich.' },
    { id: 'mus', taste: '3', name: 'Pflaumenmus', icon: '🍇', cd: 8, info: 'Klebt am Boss und schadet 5 Sekunden lang.' },
    { id: 'headset', taste: '4', name: 'Headset auf', icon: '🎧', cd: 7, info: 'Blockt seine Spezialattacke.' },
  ];
  const ANGRIFFE = ['Wecker klingelt', 'Meeting um 8:03', 'Noch eine Mail', 'Kaffeemaschine leer'];
  const fmt = (n) => Math.max(0, Math.round(n)).toLocaleString('de-DE');
  const zufall = (a, b) => a + Math.random() * (b - a);

  const BOSS_SVG = `
  <svg viewBox="0 0 240 250" aria-hidden="true">
    <path d="M58 40 C70 8 112 10 116 36 Z" fill="#c9cdd6"/><path d="M182 40 C170 8 128 10 124 36 Z" fill="#c9cdd6"/>
    <rect x="114" y="14" width="12" height="28" rx="5" fill="#8d919b"/>
    <path d="M62 214 L44 244" stroke="#c9cdd6" stroke-width="13" stroke-linecap="round"/>
    <path d="M178 214 L196 244" stroke="#c9cdd6" stroke-width="13" stroke-linecap="round"/>
    <circle cx="120" cy="134" r="104" fill="#a8321f"/>
    <circle cx="120" cy="134" r="104" fill="none" stroke="#e8743b" stroke-width="5"/>
    <circle cx="120" cy="134" r="84" fill="#f6f3ee"/>
    <g stroke="#2b2e36" stroke-width="5" stroke-linecap="round">
      <path d="M120 58 V72"/><path d="M120 196 V210"/><path d="M44 134 H58"/><path d="M182 134 H196"/>
    </g>
    <path d="M70 96 L108 116" stroke="#17191f" stroke-width="13" stroke-linecap="round"/>
    <path d="M170 96 L132 116" stroke="#17191f" stroke-width="13" stroke-linecap="round"/>
    <circle cx="92" cy="124" r="13" fill="#17191f"/><circle cx="148" cy="124" r="13" fill="#17191f"/>
    <circle cx="96" cy="126" r="4.5" fill="#ff4b3a"/><circle cx="144" cy="126" r="4.5" fill="#ff4b3a"/>
    <path d="M78 176 Q120 146 162 176 Q120 190 78 176 Z" fill="#17191f"/>
    <path d="M90 170 l8 9 l8 -11 l8 9 l8 -9 l8 11 l8 -9 l8 9" fill="none" stroke="#f6f3ee" stroke-width="4" stroke-linejoin="round"/>
    <g class="zeiger" stroke="#17191f" stroke-linecap="round">
      <path d="M120 134 L76 150" stroke-width="7"/><path d="M120 134 L125 66" stroke-width="5"/>
      <circle cx="120" cy="134" r="7" fill="#17191f" stroke="none"/>
    </g>
  </svg>`;

  function bauen(root) {
    root.innerHTML = `
    <div class="r-arena" id="r-arena">
      <div class="r-boss-kopf">
        <div class="r-zeile"><strong>Der Montagmorgen</strong><span>Raid-Boss</span></div>
        <div class="r-balken r-rot"><i id="r-boss-hp"></i><b id="r-boss-zahl"></b></div>
        <div class="r-cast" id="r-cast" hidden><i id="r-cast-fill"></i><b id="r-cast-name"></b></div>
      </div>
      <div class="r-buehne">
        <div class="r-boss" id="r-boss">${BOSS_SVG}</div>
        <div class="r-zahlen" id="r-zahlen"></div>
      </div>
      <div class="r-unten">
        <ol class="r-log" id="r-log" aria-hidden="true"></ol>
        <div class="r-spieler">
          <img src="raid/felix.jpg" alt="" width="64" height="64">
          <div class="r-spieler-info">
            <div class="r-zeile"><strong>Felix</strong><span>Rang: Zurbel</span></div>
            <div class="r-balken r-gruen"><i id="r-hp"></i><b id="r-hp-zahl"></b></div>
          </div>
        </div>
        <div class="r-leiste" id="r-leiste">
          ${SKILLS.map((s) => `<button type="button" class="r-skill" data-id="${s.id}" aria-label="${s.name}">
            <span class="r-icon">${s.icon}</span><span class="r-name">${s.name}</span>
            <kbd>${s.taste}</kbd><i class="r-cd"></i></button>`).join('')}
        </div>
      </div>
      <div class="r-dialog" id="r-dialog"></div>
    </div>`;
  }

  window.Raid = {
    start(root, fertig) {
      bauen(root);
      root.hidden = false;
      const $ = (id) => root.querySelector('#' + id);
      const arena = $('r-arena'), dialog = $('r-dialog'), bossEl = $('r-boss'), zahlen = $('r-zahlen');
      const knopf = {};
      root.querySelectorAll('.r-skill').forEach((b) => { knopf[b.dataset.id] = b; });
      let S = null, uhr = null, versuche = 0, ton = null;

      /* Kleine Soundeffekte, klingen nur nach einem Klick */
      function piep(f, dauer, art, laut) {
        if (!ton) return;
        try {
          const o = ton.createOscillator(), g = ton.createGain();
          o.type = art || 'square'; o.frequency.value = f;
          g.gain.setValueAtTime(laut || .05, ton.currentTime);
          g.gain.exponentialRampToValueAtTime(.0001, ton.currentTime + dauer);
          o.connect(g); g.connect(ton.destination); o.start(); o.stop(ton.currentTime + dauer);
        } catch (e) { /* Sound ist optional */ }
      }

      function log(text, art) {
        const l = $('r-log'), li = document.createElement('li');
        li.textContent = text; if (art) li.className = art;
        l.appendChild(li);
        while (l.children.length > 4) l.removeChild(l.firstChild);
      }
      function zahl(text, art) {
        const s = document.createElement('span');
        s.textContent = text; s.className = 'r-zahl ' + (art || '');
        s.style.left = zufall(26, 74) + '%'; s.style.top = zufall(24, 62) + '%';
        zahlen.appendChild(s);
        setTimeout(() => s.remove(), 900);
      }
      function treffer() {
        bossEl.classList.remove('r-treffer'); void bossEl.offsetWidth; bossEl.classList.add('r-treffer');
      }

      function schaden(w, art) {
        S.boss -= w; zahl(fmt(w), art); treffer();
      }

      function zaubern(id) {
        if (!S || !S.laeuft || S.cd[id] > 0) return;
        const skill = SKILLS.find((s) => s.id === id);
        S.cd[id] = skill.cd;
        if (id === 'wurf') {
          const krit = Math.random() < .2, w = zufall(105, 135) * (krit ? 2 : 1);
          schaden(w, krit ? 'krit' : ''); piep(krit ? 660 : 330, .09);
          if (krit) log('Kritischer Siebenmeter!');
        } else if (id === 'kaffee') {
          const w = Math.min(300, S.maxHp - S.hp);
          S.hp += w; zahl('+' + fmt(300), 'heil'); piep(520, .18, 'sine', .08);
          log('Felix trinkt Kaffee.');
        } else if (id === 'mus') {
          S.dot = 5; piep(180, .2, 'sawtooth'); log('Pflaumenmus klebt am Montagmorgen.', 'lila');
        } else {
          S.block = 2.6; piep(740, .14, 'triangle', .08); arena.classList.add('r-block');
        }
      }

      function angriffStart() {
        const name = ANGRIFFE[S.nr++ % ANGRIFFE.length];
        S.cast = { name, zeit: 0, dauer: S.phase2 ? 2 : 2.4 };
        $('r-cast').hidden = false; $('r-cast-name').textContent = name;
        arena.classList.add('r-gefahr'); log('Der Montagmorgen wirkt: ' + name, 'rot'); piep(220, .25);
      }
      function angriffEnde() {
        $('r-cast').hidden = true; arena.classList.remove('r-gefahr');
        if (S.block > 0) {
          S.block = 0; arena.classList.remove('r-block');
          zahl('GEBLOCKT', 'block'); schaden(300, 'krit'); piep(880, .2, 'triangle', .1);
          log('Sauber geblockt, Zurbel!', 'gruen');
        } else {
          S.hp -= 350; zahl('-350', 'weh'); piep(110, .3, 'sawtooth', .09);
          arena.classList.remove('r-wackeln'); void arena.offsetWidth; arena.classList.add('r-wackeln');
          log('Autsch. Schnell Kaffee!', 'rot');
        }
        S.cast = null; S.naechster = S.phase2 ? 4.4 : 6.6;
      }

      function zeichnen() {
        const bp = Math.max(0, S.boss / S.maxBoss), hp = Math.max(0, S.hp / S.maxHp);
        $('r-boss-hp').style.width = (bp * 100) + '%';
        $('r-boss-zahl').textContent = `${fmt(S.boss)} / ${fmt(S.maxBoss)}`;
        $('r-hp').style.width = (hp * 100) + '%';
        $('r-hp-zahl').textContent = `${fmt(S.hp)} / ${fmt(S.maxHp)}`;
        arena.classList.toggle('r-knapp', hp < .35);
        if (S.cast) $('r-cast-fill').style.width = (S.cast.zeit / S.cast.dauer * 100) + '%';
        SKILLS.forEach((s) => {
          const b = knopf[s.id], rest = S.cd[s.id];
          b.querySelector('.r-cd').style.height = (rest > 0 ? rest / s.cd * 100 : 0) + '%';
          b.classList.toggle('r-bereit', rest <= 0);
        });
        knopf.headset.classList.toggle('r-jetzt', !!S.cast && S.cd.headset <= 0 && S.block <= 0);
        knopf.kaffee.classList.toggle('r-jetzt', hp < .45 && S.cd.kaffee <= 0);
      }

      function schritt(dt) {
        S.t += dt;
        SKILLS.forEach((s) => { S.cd[s.id] = Math.max(0, S.cd[s.id] - dt); });
        S.boss -= 30 * dt;                                   /* Die Spacken helfen mit */
        if (S.dot > 0) { S.dot -= dt; S.dotTakt -= dt; if (S.dotTakt <= 0) { S.dotTakt = 1; schaden(90, 'lila'); } }
        if (S.block > 0) { S.block -= dt; if (S.block <= 0) arena.classList.remove('r-block'); }
        if (!S.phase2 && S.boss / S.maxBoss < .4) {
          S.phase2 = true; arena.classList.add('r-wut');
          log('Der Montagmorgen wird wütend!', 'rot'); log('Die Spacken: Heb dein Glas mit an, Felix!', 'gruen');
        }
        S.auto -= dt;
        if (S.auto <= 0) {
          S.auto = S.phase2 ? 1.5 : 2;
          if (!S.cast) { S.hp -= 60; zahl('-60', 'weh'); }
        }
        if (S.cast) {
          S.cast.zeit += dt;
          if (S.cast.zeit >= S.cast.dauer) angriffEnde();
        } else {
          S.naechster -= dt;
          if (S.naechster <= 0) angriffStart();
        }
        if (S.boss <= 0) return sieg();
        if (S.hp <= 0) return niederlage();
        zeichnen();
      }

      function halt() {
        clearInterval(uhr); uhr = null; S.laeuft = false;
        $('r-cast').hidden = true;
        arena.classList.remove('r-gefahr', 'r-block', 'r-knapp');
      }

      function dialogZeigen(html) { dialog.innerHTML = html; dialog.hidden = false; const b = dialog.querySelector('button'); if (b) b.focus({ preventScroll: true }); }

      function sieg() {
        halt(); S.boss = 0; zeichnen();
        bossEl.classList.add('r-tot');
        log('Der Montagmorgen ist besiegt!', 'gruen');
        [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => piep(f, .28, 'triangle', .09), i * 130));
        setTimeout(() => {
          dialogZeigen(`<div class="r-karte r-loot">
            <p class="r-klein">Beute</p>
            <div class="r-item"><span class="r-item-icon">🎁</span><div>
              <h2>Geschenk der Spacken</h2>
              <p class="r-selten">Legendär · Beim Aufheben gebunden</p>
              <p>Stellt 3:22 Minuten gute Laune her.</p>
            </div></div>
            <button type="button" id="r-aufheben">Aufheben</button>
          </div>`);
          $('r-aufheben').addEventListener('click', () => { root.hidden = true; fertig(); });
        }, 1400);
      }

      function niederlage() {
        halt(); S.hp = 0; zeichnen();
        piep(90, .6, 'sawtooth', .1);
        versuche++;
        dialogZeigen(`<div class="r-karte">
          <h2>Der Montagmorgen hat gewonnen</h2>
          <p>Passiert jedem. Tipp: Wenn er etwas wirkt, drück <strong>Headset auf</strong>. Und vergiss den Kaffee nicht.</p>
          <div class="r-knoepfe">
            <button type="button" id="r-nochmal">Nochmal (Boss schwächer)</button>
            <button type="button" id="r-weiter" class="r-leise">Überspringen</button>
          </div>
        </div>`);
        $('r-nochmal').addEventListener('click', kampf);
        $('r-weiter').addEventListener('click', () => { root.hidden = true; fertig(); });
      }

      function kampf() {
        dialog.hidden = true; dialog.innerHTML = '';
        const maxBoss = BOSS_LEBEN * (1 - .2 * Math.min(versuche, 3));
        S = { laeuft: true, t: 0, boss: maxBoss, maxBoss, hp: FELIX_LEBEN, maxHp: FELIX_LEBEN, dot: 0, dotTakt: 0, block: 0,
          cast: null, naechster: 5, auto: 2, nr: 0, phase2: false, cd: { wurf: 0, kaffee: 0, mus: 0, headset: 0 } };
        $('r-log').innerHTML = '';
        arena.classList.remove('r-wut');
        bossEl.classList.remove('r-tot');
        log('Die Spacken: Felix, wir sind hinter dir!', 'gruen');
        zeichnen();
        let zuletzt = performance.now();
        uhr = setInterval(() => {
          const jetzt = performance.now(), dt = Math.min((jetzt - zuletzt) / 1000, .2);
          zuletzt = jetzt;
          schritt(dt);
        }, 50);
      }

      root.querySelectorAll('.r-skill').forEach((b) => b.addEventListener('click', () => zaubern(b.dataset.id)));
      addEventListener('keydown', (e) => {
        if (e.repeat || root.hidden) return;
        const s = SKILLS.find((x) => x.taste === e.key);
        if (s) zaubern(s.id);
      });

      dialogZeigen(`<div class="r-karte">
        <p class="r-klein">Neue Quest</p>
        <h2>Raid: Montagmorgen</h2>
        <p>Das Geschenk der Spacken wird vom Montagmorgen bewacht. Hau ihn weg, Zurbel.</p>
        <ul class="r-skills-info">
          ${SKILLS.map((s) => `<li><span>${s.icon}</span><div><strong>${s.name}</strong> <kbd>${s.taste}</kbd><br>${s.info}</div></li>`).join('')}
        </ul>
        <button type="button" id="r-annehmen">Quest annehmen</button>
      </div>`);
      $('r-annehmen').addEventListener('click', () => {
        try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ton = new AC(); } catch (e) { ton = null; }
        kampf();
      });
    },
  };
})();
