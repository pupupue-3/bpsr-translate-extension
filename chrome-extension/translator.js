// MAINワールド。Chrome内蔵 Translator API を content.js へ橋渡し。
(function () {
  if (window.__starezoTranslatorInit) return; window.__starezoTranslatorInit = true;
  const has = ('Translator' in self);
  const cache = {};
  async function create(src, viaGesture) {
    cache[src] = await Translator.create({
      sourceLanguage: src, targetLanguage: 'ja',
      monitor(m) { try { m.addEventListener('downloadprogress', e => window.postMessage({ __starezo: 'progress', pct: Math.round((e.loaded || 0) * 100) }, '*')); } catch (_) {} }
    });
    return cache[src];
  }
  window.addEventListener('message', async (ev) => {
    const d = ev.data; if (!d || d.__starezo !== 'req') return;
    let result;
    try {
      if (d.kind === 'probe') result = has;
      else if (d.kind === 'status') { window.__starezoStatus = { engine: d.engine, useMT: d.useMT }; result = true; }
      else if (d.kind === 'avail') result = has ? await Translator.availability({ sourceLanguage: d.src, targetLanguage: 'ja' }) : 'unavailable';
      else if (d.kind === 'download') { try { await create(d.src, true); result = true; } catch (e) { console.warn('[starezo/main] download:', e && e.message); result = false; } }
      else if (d.kind === 'translate') {
        let tr = cache[d.src]; if (!tr) { try { tr = await create(d.src); } catch (e) { tr = null; } }
        if (!tr) result = null;
        else { result = []; for (const h of d.texts) { try { result.push(await tr.translate(h)); } catch (e) { result.push(null); } } }
      }
    } catch (e) { result = (d.kind === 'probe') ? false : (d.kind === 'avail' ? 'unavailable' : null); }
    window.postMessage({ __starezo: 'res', id: d.id, result }, '*');
  });
})();
