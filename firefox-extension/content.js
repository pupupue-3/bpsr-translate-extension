(async function () {
  'use strict';
  const E = window.StarezoEngine;
  // 辞書URL（固定）
  const TABLE_URL = 'https://bpstar-tools.github.io/bpsr-translate-dict/translation-table.json';
  const DESC_URL  = 'https://bpstar-tools.github.io/bpsr-translate-dict/desc-index.json';

  const D = { direction: 'both', deeplKey: '', mtEnabled: true, minLen: 2, enabled: true,
              mode: 'manual', autoSites: 'maxroll.gg' };
  const cfg = await new Promise(res => chrome.storage.sync.get(D, res));
  const DESC_MINLEN = 12;
  if (!cfg.enabled) return;

  async function getText(url) { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }
  let table, descIndex = null;
  try { table = E.parseTable(TABLE_URL, await getText(TABLE_URL)); }
  catch (e) { console.error('[starezo] 対応表取得失敗:', e.message, TABLE_URL); return; }
  { try { descIndex = JSON.parse(await getText(DESC_URL)); }
    catch (e) { console.warn('[starezo] 説明文インデックス取得失敗:', e.message); } }

  const maps = E.pickMaps(table, 'en2ja'); // 英語のみ
  if (!maps.length) { console.warn('[starezo] 対応表が空'); return; }
  const termEngines = maps.map(m => E.buildTermEngine(m, cfg.minLen));
  const useMT = !!(cfg.mtEnabled && cfg.deeplKey);

  function walkText(root, fn) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) { const p = n.parentNode; if (!p) return 2; if (E.SKIP_TAGS.has(p.nodeName)) return 2; if (p.isContentEditable) return 2; return 1; } });
    const a = []; let n; while ((n = w.nextNode())) a.push(n); for (const x of a) fn(x);
  }

  // ===== MT（DeepL）バッチ処理 ==========================================
  const mtKey = 'starezo_mt_cache';
  let mtCache = {};
  chrome.storage.local.get({ [mtKey]: {} }, o => { mtCache = o[mtKey] || {}; });
  let saveT = null; const saveCache = () => { clearTimeout(saveT); saveT = setTimeout(() => chrome.storage.local.set({ [mtKey]: mtCache }), 1500); };
  const deeplBatch = (texts, srcLang) => new Promise(res =>
    chrome.runtime.sendMessage({ type: 'deeplBatch', texts, srcLang, key: cfg.deeplKey },
      r => res(r && r.ok ? r.texts : null)));

  const pending = new Map();   // origText -> { nodes:Set, ph:[], prot:string, srcLang }
  function applyMT(node, orig, ja) {
    if (ja && ja !== orig && node.isConnected && node.nodeValue.includes(orig)) node.nodeValue = node.nodeValue.replace(orig, ja);
  }
  function enqueue(node, t) {
    if (mtCache[t] !== undefined) { applyMT(node, t, mtCache[t]); return; }
    let e = pending.get(t);
    if (!e) {
      const { text: prot, ph } = E.protectTerms(t, termEngines);
      const srcLang = 'EN';
      e = { nodes: new Set(), ph, prot, srcLang }; pending.set(t, e);
    }
    e.nodes.add(node);
    scheduleFlush();
  }
  let flushT = null, flushing = false;
  const scheduleFlush = () => { clearTimeout(flushT); flushT = setTimeout(flush, 400); };
  async function flush() {
    if (flushing || !pending.size) return;
    flushing = true;
    try {
      while (pending.size) {
        const byLang = { ZH: [], EN: [] };
        for (const [t, e] of pending) byLang[e.srcLang].push([t, e]);
        for (const lang of ['ZH', 'EN']) {
          const arr = byLang[lang];
          for (let i = 0; i < arr.length; i += 40) {           // 1回40件まで
            const chunk = arr.slice(i, i + 40);
            let res = null;
            try { res = await deeplBatch(chunk.map(([, e]) => e.prot), lang); } catch (_) {}
            for (let j = 0; j < chunk.length; j++) {
              const [t, e] = chunk[j];
              let ja = (res && res[j] != null) ? E.restoreTerms(res[j], e.ph) : null;
              if (ja != null) { mtCache[t] = ja; for (const node of e.nodes) applyMT(node, t, ja); }
              else { for (const node of e.nodes) { const r = E.applyTerms(node.nodeValue, termEngines); if (r !== node.nodeValue) node.nodeValue = r; } }
              pending.delete(t);
            }
            saveCache();
          }
        }
      }
    } finally { flushing = false; }
  }

  // ===== ノード処理 ======================================================
  const seen = new WeakSet();
  function process(node) {
    if (seen.has(node)) return;
    const orig = node.nodeValue; if (!orig || !orig.trim()) return;
    const t = orig.trim();
    // 1) 説明文の公式訳
    if (t.length >= DESC_MINLEN && descIndex) { const k = E.normDesc(t);
      if (k.length >= DESC_MINLEN && descIndex[k] !== undefined) { node.nodeValue = orig.replace(t, descIndex[k]); seen.add(node); return; } }
    // 2) MTあり：2文字以上の英単語を含む短文も対象（用語は保護して送る）
    if (useMT && /[A-Za-z]{2,}/.test(t)) { seen.add(node); enqueue(node, t); return; }
    // 3) MTなし：用語のみ置換
    const rep = E.applyTerms(orig, termEngines); if (rep !== orig) node.nodeValue = rep;
    seen.add(node);
  }

  // ===== 発動制御 ========================================================
  function matchesAutoSites(url, listStr) {
    const pats = (listStr || '').split(/[\s,\n]+/).map(x => x.trim()).filter(Boolean);
    return pats.some(p => {
      try { const re = new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
        return re.test(url) || url.includes(p); } catch (e) { return url.includes(p); }
    });
  }
  const autoBySite = matchesAutoSites(location.href, cfg.autoSites);
  let active = (cfg.mode === 'always') || autoBySite;
  function translateAll() { walkText(document.body, process); }
  function activate() { if (!active) active = true; translateAll(); }

  new MutationObserver(ms => { if (!active) return; for (const m of ms) for (const node of m.addedNodes) {
    if (node.nodeType === 1) walkText(node, process); else if (node.nodeType === 3) process(node); } })
    .observe(document.body, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'starezo-translate-now') { activate(); sendResponse && sendResponse({ ok: true }); }
  });

  if (active) translateAll();
  console.log('[starezo] v2.5 mode=' + cfg.mode + (autoBySite ? ' / 対象サイト自動ON' : '') + ' / MT=' + (useMT ? 'ON(DeepL)' : 'OFF'));
})();
