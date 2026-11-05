// Selbstzerstörung: reiner Gag. Es wird nichts gelöscht, die Seite bleibt online.
(function () {
  const ZEILEN = [
    '> Lösche Geburtstagsgeschenk ...',
    '> Lösche Video ... 12 %',
    '> Lösche Video ... 12 %',
    '> Lösche Pflaumenmus ... FEHLER',
    '> Zugriff verweigert.',
    '> Grund: Die Spacken haben ein Backup.',
  ];
  const warte = (ms) => new Promise((r) => setTimeout(r, ms));

  window.Selbstzerstoerung = {
    start({ konfetti, zurueck }) {
      const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let ton = null;
      try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ton = new AC(); } catch (e) { ton = null; }
      function piep(f, dauer, art, laut) {
        if (!ton) return;
        try {
          const o = ton.createOscillator(), g = ton.createGain();
          o.type = art || 'square'; o.frequency.value = f;
          g.gain.setValueAtTime(laut || .06, ton.currentTime);
          g.gain.exponentialRampToValueAtTime(.0001, ton.currentTime + dauer);
          o.connect(g); g.connect(ton.destination); o.start(); o.stop(ton.currentTime + dauer);
        } catch (e) { /* Sound ist optional */ }
      }

      const el = document.createElement('div');
      el.id = 'sz'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true');
      document.body.appendChild(el);
      function ende() {
        document.body.classList.remove('sz-wackeln');
        el.remove();
        if (ton) ton.close().catch(() => {});
        zurueck();
      }

      el.className = 'sz-frage';
      el.innerHTML = `<div class="sz-box">
        <p class="sz-warnung">Warnung</p>
        <h2>Selbstzerstörung einleiten?</h2>
        <p>Dieses Geschenk wird unwiderruflich vernichtet. Wirklich?</p>
        <div class="sz-knoepfe">
          <button type="button" id="sz-ja">Ja, weg damit</button>
          <button type="button" id="sz-nein" class="sz-leise">Abbrechen</button>
        </div>
      </div>`;
      el.querySelector('#sz-nein').addEventListener('click', ende);
      el.querySelector('#sz-nein').focus({ preventScroll: true });
      el.querySelector('#sz-ja').addEventListener('click', ablauf);

      async function ablauf() {
        el.className = 'sz-alarm';
        el.innerHTML = `<div class="sz-box sz-offen" aria-live="assertive">
          <p class="sz-warnung">Selbstzerstörung aktiv</p>
          <div class="sz-zahl" id="sz-zahl">5</div>
          <p>Abbruch nicht möglich. Zurbel-Protokoll läuft.</p>
        </div>`;
        document.body.classList.add('sz-wackeln');
        const zahl = el.querySelector('#sz-zahl');
        for (let i = 5; i >= 1; i--) {
          zahl.textContent = i;
          zahl.classList.remove('sz-tick'); void zahl.offsetWidth; zahl.classList.add('sz-tick');
          piep(i === 1 ? 880 : 620, .35, 'square', .05);
          await warte(1000);
        }
        document.body.classList.remove('sz-wackeln');
        el.className = 'sz-blitz'; el.innerHTML = '';
        piep(70, 1, 'sawtooth', .16); piep(45, 1.3, 'square', .1);
        konfetti(innerWidth * .5, innerHeight * .55, 220);
        konfetti(innerWidth * .2, innerHeight * .6, 90);
        konfetti(innerWidth * .8, innerHeight * .6, 90);
        document.getElementById('karte').hidden = true;
        await warte(ruhig ? 200 : 650);

        el.className = 'sz-terminal';
        el.innerHTML = '<div class="sz-text" aria-live="polite"><pre id="sz-log"></pre></div>';
        const log = el.querySelector('#sz-log');
        for (const z of ZEILEN) {
          log.textContent += z + '\n';
          piep(1200, .03, 'square', .025);
          await warte(ruhig ? 250 : 850);
        }
        await warte(ruhig ? 100 : 400);
        const text = el.querySelector('.sz-text');
        const h = document.createElement('h2');
        h.textContent = 'Du wirst uns nicht los, Zurbel.';
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = 'Zurück'; b.addEventListener('click', ende);
        text.append(h, b);
        piep(523, .2, 'triangle', .08); setTimeout(() => piep(784, .3, 'triangle', .08), 170);
        b.focus({ preventScroll: true });
      }
    },
  };
})();
