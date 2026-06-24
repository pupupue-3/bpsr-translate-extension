(async function () {
  'use strict';
  const E = window.StarezoEngine;
  const TABLE_URL = 'https://bpstar-tools.github.io/bpsr-translate-dict/translation-table.json';
  const DESC_URL  = 'https://bpstar-tools.github.io/bpsr-translate-dict/desc-index.json';

  const D = { deeplKey: '', engine: 'chrome', mtEnabled: true, minLen: 2, enabled: true, mode: 'manual', autoSites: 'maxroll.gg' };
  const cfg = await new Promise(res => chrome.storage.sync.get(D, res));
  const DESC_MINLEN = 12;
  if (!cfg.enabled) return;

  async function getText(url) { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }
  let table, descIndex = null, dictVer = '';
  try { const tblTxt = await getText(TABLE_URL); table = E.parseTable(TABLE_URL, tblTxt);
    try { const meta = JSON.parse(tblTxt).meta; dictVer = meta ? (meta.source + '#' + meta.en2ja_count) : ('len' + tblTxt.length); } catch (_) { dictVer = 'len' + tblTxt.length; } }
  catch (e) { console.error('[starezo] 対応表取得失敗:', e.message, TABLE_URL); return; }
  { try { descIndex = JSON.parse(await getText(DESC_URL)); } catch (e) { console.warn('[starezo] 説明文インデックス取得失敗:', e.message); } }

  const maps = E.pickMaps(table, 'en2ja');
  if (!maps.length) { console.warn('[starezo] 対応表が空'); return; }
  const en2ja = maps[0];
  const termEngines = maps.map(m => E.buildTermEngine(m, cfg.minLen));
  let engine = cfg.engine || (cfg.mtEnabled && cfg.deeplKey ? 'deepl' : 'none');  // 'none'|'chrome'|'deepl'
  if (engine === 'deepl' && !cfg.deeplKey) engine = 'none';
  let useMT = (engine === 'deepl' || engine === 'chrome');
  let chromeNeedsDownload = false;

  const INLINE = new Set(['A','SPAN','B','I','EM','STRONG','U','S','SMALL','MARK','SUB','SUP','BR','FONT','LABEL','ABBR','CITE','Q','TIME','WBR','BDI','BDO','INS','DEL','KBD','SAMP','VAR','TT','IMG']);
  const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const termRegex = termEngines[0] && termEngines[0].regex;

  // ===== DeepL（ON時）: ブロック単位でリンク/用語を退避してから翻訳 =========
  const mtKey = 'starezo_mt_cache';
  let mtCache = {};
  chrome.storage.local.get({ [mtKey]: {}, starezo_dict_ver: '' }, o => {
    if (o.starezo_dict_ver !== dictVer) { mtCache = {}; chrome.storage.local.set({ [mtKey]: {}, starezo_dict_ver: dictVer }); console.log('[starezo] 辞書更新を検知 → 翻訳キャッシュをクリア'); }
    else mtCache = o[mtKey] || {};
  });
  let saveT = null; const saveCache = () => { clearTimeout(saveT); saveT = setTimeout(() => chrome.storage.local.set({ [mtKey]: mtCache }), 1500); };
  const deeplBatch = (texts, srcLang) => new Promise(res =>
    chrome.runtime.sendMessage({ type: 'deeplBatch', texts, srcLang, tagHandling: 'html', ignoreTags: 'x', key: cfg.deeplKey },
      r => res(r && r.ok ? r.texts : null)));
  // Chrome内蔵翻訳: Translator はMAINワールドにのみ存在。translator.js 経由で橋渡し。
  let reqId = 0; const pendingReq = {};
  window.addEventListener('message', ev => {
    const d = ev.data; if (d && d.__starezo === 'res' && pendingReq[d.id]) { const cb = pendingReq[d.id]; delete pendingReq[d.id]; cb(d.result); }
  });
  function bridgeCall(payload, timeout) {
    return new Promise(res => { const id = ++reqId; pendingReq[id] = res;
      window.postMessage(Object.assign({ __starezo: 'req', id }, payload), '*');
      setTimeout(() => { if (pendingReq[id]) { delete pendingReq[id]; res(undefined); } }, timeout || 60000); });
  }
  async function probeTranslator() {   // translator.js(MAIN)の読み込み遅延に備えてリトライ
    for (let i = 0; i < 12; i++) { const r = await bridgeCall({ kind: 'probe' }, 600); if (r === true) return true; if (r === false) return false; }
    return false;
  }
  const chromeBatch = (htmls, lang) => bridgeCall({ kind: 'translate', src: lang.toLowerCase(), texts: htmls }, 120000);
  const translateBatch = (htmls, lang) => (engine === 'chrome' ? chromeBatch(htmls, lang) : deeplBatch(htmls, lang));

  function mkX(i) { const x = document.createElement('x'); x.setAttribute('i', String(i)); return x; }
  function translateTermsIn(el) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const tn = []; let n; while ((n = w.nextNode())) tn.push(n);
    for (const node of tn) { const tt = node.nodeValue.trim(); if (tt && en2ja[tt] !== undefined) node.nodeValue = node.nodeValue.replace(tt, en2ja[tt]); }
  }
  function tokenize(el) {
    const clone = el.cloneNode(true);
    const store = [];
    for (const a of clone.querySelectorAll('a, img')) { if (a.tagName === 'A') translateTermsIn(a); const x = mkX(store.length); store.push(a.outerHTML); a.replaceWith(x); }
    if (termRegex) {
      const w = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null);
      const tn = []; let n; while ((n = w.nextNode())) tn.push(n);
      for (const node of tn) {
        const text = node.nodeValue; if (!/[A-Za-z]/.test(text)) continue;
        termRegex.lastIndex = 0; if (!termRegex.test(text)) continue;
        termRegex.lastIndex = 0;
        const frag = document.createDocumentFragment(); let last = 0, m, any = false;
        while ((m = termRegex.exec(text))) { const term = m[0]; const ja = en2ja[term]; if (ja === undefined) continue;
          if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          const x = mkX(store.length); store.push(esc(ja)); frag.appendChild(x); last = m.index + term.length; any = true; }
        if (any) { if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last))); node.replaceWith(frag); }
      }
    }
    return { html: clone.innerHTML, store };
  }
  function restoreInto(el, translatedHtml, store) {
    if (!el.isConnected) return;
    const tmp = document.createElement('div'); tmp.innerHTML = translatedHtml;
    for (const x of tmp.querySelectorAll('x')) { const i = +x.getAttribute('i'); if (store[i] != null) x.outerHTML = store[i]; else x.remove(); }
    el.innerHTML = tmp.innerHTML;
  }
  const pending = new Map();
  function enqueueBlock(el) {
    const { html, store } = tokenize(el);
    if (mtCache[html] !== undefined) { restoreInto(el, mtCache[html], store); return; }
    let e = pending.get(html);
    if (!e) { const tx = el.textContent; const srcLang = /[一-鿿]/.test(tx) && !/[A-Za-z]{4,}/.test(tx) ? 'ZH' : 'EN'; e = { entries: [], srcLang }; pending.set(html, e); }
    e.entries.push({ el, store });
    scheduleFlush();
  }

  // 画面上部中央の進捗表示
  let statusEl = null;
  function ensureStatus() { if (statusEl) return; statusEl = document.createElement('div');
    statusEl.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(30,90,200,.96);color:#fff;font:14px/1.4 system-ui,sans-serif;font-weight:700;padding:9px 22px;border-radius:0 0 12px 12px;pointer-events:none;box-shadow:0 3px 12px rgba(0,0,0,.4);transition:opacity .3s';
    statusEl.setAttribute('translate', 'no');
    (document.body || document.documentElement).appendChild(statusEl); }
  function showStatus(remain) { ensureStatus(); statusEl.textContent = '翻訳中…' + (remain > 0 ? ' 残り' + remain : ''); statusEl.style.display = 'block'; statusEl.style.opacity = '1'; }
  function hideStatus() { if (statusEl) { statusEl.style.opacity = '0'; setTimeout(() => { if (statusEl) statusEl.style.display = 'none'; }, 400); } }

  let flushT = null, flushing = false;
  const scheduleFlush = () => { clearTimeout(flushT); flushT = setTimeout(flush, 400); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function flush() {
    if (flushing || !pending.size) return;
    flushing = true; showStatus(pending.size);
    try {
      while (pending.size) {
        const byLang = { ZH: [], EN: [] };
        for (const [html, e] of pending) byLang[e.srcLang].push([html, e]);
        for (const lang of ['ZH', 'EN']) {
          const arr = byLang[lang];
          for (let i = 0; i < arr.length; i += 25) {
            const chunk = arr.slice(i, i + 25);
            let res = null;
            try { res = await translateBatch(chunk.map(([h]) => h), lang); } catch (_) {}
            if (!res) { await sleep(800); try { res = await translateBatch(chunk.map(([h]) => h), lang); } catch (_) {} }
            for (let j = 0; j < chunk.length; j++) {
              const [html, e] = chunk[j];
              const ja = (res && res[j] != null) ? res[j] : null;
              if (ja != null) { mtCache[html] = ja; for (const en of e.entries) restoreInto(en.el, ja, en.store); }
              pending.delete(html);
            }
            saveCache(); showStatus(pending.size);
          }
        }
      }
    } finally { flushing = false; hideStatus(); }
  }

  // ===== ブロック抽出（DeepL ON用）====================================
  const blockSeen = new WeakSet();
  function isLeafTextBlock(el) {
    if (E.SKIP_TAGS.has(el.tagName) || el.isContentEditable) return false;
    const tc = el.textContent;
    if (!tc || !tc.trim() || !/[A-Za-z一-鿿]/.test(tc)) return false;
    const all = el.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) { const tag = all[i].tagName; if (E.SKIP_TAGS.has(tag) || !INLINE.has(tag)) return false; }
    return true;
  }
  function inProcessed(node) { let p = node.parentElement; while (p) { if (blockSeen.has(p)) return true; p = p.parentElement; } return false; }
  function collectLeafBlocks(root) {
    const out = [];
    function rec(el) { for (let i = 0; i < el.children.length; i++) { const c = el.children[i];
      if (E.SKIP_TAGS.has(c.tagName) || c.isContentEditable) continue;
      if (isLeafTextBlock(c)) out.push(c); else rec(c); } }
    if (root.nodeType === 1 && isLeafTextBlock(root)) return [root];
    rec(root.nodeType === 1 ? root : document.body);
    return out;
  }
  function processBlock(el) {
    if (blockSeen.has(el) || inProcessed(el)) return;
    blockSeen.add(el);
    const t = el.textContent.trim(); if (!t || !/[A-Za-z一-鿿]/.test(t)) return;
    if (el.children.length === 0) {
      if (en2ja[t] !== undefined) { el.textContent = en2ja[t]; return; }
      if (descIndex && t.length >= DESC_MINLEN) { const k = E.normDesc(t); if (k.length >= DESC_MINLEN && descIndex[k] !== undefined) { el.textContent = descIndex[k]; return; } }
    }
    enqueueBlock(el);
  }

  // ===== 用語のみ（DeepL OFF）: translate="no" でブラウザ翻訳と共存 =======
  const nodeSeen = new WeakSet();
  function noTr(ja) {
    const s = document.createElement('span');
    s.setAttribute('translate', 'no'); s.setAttribute('data-bpsrtl', '');
    s.textContent = ja; return s;
  }
  function replaceWhole(node, orig, trimmed, ja) {
    const i = orig.indexOf(trimmed); const frag = document.createDocumentFragment();
    if (i > 0) frag.appendChild(document.createTextNode(orig.slice(0, i)));
    frag.appendChild(noTr(ja));
    if (i + trimmed.length < orig.length) frag.appendChild(document.createTextNode(orig.slice(i + trimmed.length)));
    node.replaceWith(frag);
  }
  function processNode(node) {
    if (nodeSeen.has(node)) return;
    const p = node.parentElement;
    if (p && p.hasAttribute && p.hasAttribute('data-bpsrtl')) { nodeSeen.add(node); return; }
    const orig = node.nodeValue; if (!orig || !orig.trim()) return;
    const t = orig.trim();
    // 親要素(リンク等)の全文がちょうど1用語なら、要素ごと translate="no" 化（ブラウザ翻訳でのリンク結合を防ぐ）
    if (p && p.tagName !== 'BODY' && p.childNodes.length === 1 && en2ja[t] !== undefined && p.textContent.trim() === t && !E.SKIP_TAGS.has(p.tagName)) {
      p.setAttribute('translate', 'no'); p.setAttribute('data-bpsrtl', '');
      node.nodeValue = orig.replace(t, en2ja[t]); nodeSeen.add(node); return;
    }
    if (descIndex && t.length >= DESC_MINLEN) { const k = E.normDesc(t); if (k.length >= DESC_MINLEN && descIndex[k] !== undefined) { replaceWhole(node, orig, t, descIndex[k]); return; } }
    if (termRegex) {
      termRegex.lastIndex = 0;
      if (termRegex.test(orig)) {
        termRegex.lastIndex = 0;
        const frag = document.createDocumentFragment(); let last = 0, m, any = false;
        while ((m = termRegex.exec(orig))) { const term = m[0]; const ja = en2ja[term]; if (ja === undefined) continue;
          if (m.index > last) frag.appendChild(document.createTextNode(orig.slice(last, m.index)));
          frag.appendChild(noTr(ja)); last = m.index + term.length; any = true; }
        if (any) { if (last < orig.length) frag.appendChild(document.createTextNode(orig.slice(last))); node.replaceWith(frag); return; }
      }
    }
    nodeSeen.add(node);
  }
  function walkText(root, fn) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) { const p = n.parentNode; if (!p) return 2;
        if (E.SKIP_TAGS.has(p.nodeName)) return 2;
        if (p.isContentEditable) return 2;
        if (p.nodeType === 1 && p.hasAttribute && p.hasAttribute('data-bpsrtl')) return 2;
        return 1; } });
    const a = []; let n; while ((n = w.nextNode())) a.push(n); for (const x of a) fn(x);
  }

  function translate(root) {
    if (useMT) { for (const el of collectLeafBlocks(root)) processBlock(el); }
    else { walkText(root, processNode); }
  }

  // ===== 発動制御 ========================================================
  function matchesAutoSites(url, listStr) {
    const pats = (listStr || '').split(/[\s,\n]+/).map(x => x.trim()).filter(Boolean);
    return pats.some(p => { try { const re = new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'); return re.test(url) || url.includes(p); } catch (e) { return url.includes(p); } });
  }
  const autoBySite = matchesAutoSites(location.href, cfg.autoSites);
  let active = (cfg.mode === 'always') || autoBySite;
  function translateAll() { translate(document.body); }
  function activate() { active = true; translateAll(); }

  // ブラウザ標準翻訳(Chrome)が有効な間はDOMを触らない＝翻訳が解除されるのを防ぐ
  const browserTranslating = () => { const c = document.documentElement.classList; return c.contains('translated-ltr') || c.contains('translated-rtl'); };
  new MutationObserver(ms => {
    if (!active) return;
    if (browserTranslating()) return;
    for (const m of ms) for (const node of m.addedNodes) {
      if (node.nodeType === 1) { if (!inProcessed(node)) translate(node); }
      else if (node.nodeType === 3 && !useMT) processNode(node);
    }
  }).observe(document.body, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((msg, s, sendResponse) => {
    if (msg && msg.type === 'starezo-translate-now') { activate(); sendResponse && sendResponse({ ok: true }); }
  });

  function showDownloadBanner() {
    const b = document.createElement('div'); b.setAttribute('translate', 'no');
    b.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:2147483647;background:#1a73e8;color:#fff;font:14px/1.4 system-ui,sans-serif;font-weight:700;padding:10px 22px;border-radius:0 0 12px 12px;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.4)';
    b.textContent = '▶ クリックでChrome翻訳を有効化（初回のみモデルDL）';
    window.addEventListener('message', ev => { const d = ev.data; if (d && d.__starezo === 'progress' && b.isConnected) b.textContent = '翻訳モデルDL中… ' + d.pct + '%'; });
    b.addEventListener('click', async () => {
      b.textContent = '翻訳モデル準備中…';
      const ok = await bridgeCall({ kind: 'download', src: 'en' }, 600000);
      if (ok) { b.remove(); chromeNeedsDownload = false; translateAll(); }
      else { b.textContent = 'モデルDL失敗。クリックで再試行'; }
    });
    document.body.appendChild(b);
  }
  if (engine === 'chrome') {
    if (!(await probeTranslator())) { engine = 'none'; useMT = false; console.warn('[starezo] Chrome内蔵翻訳API無し(Chrome 138+ desktop 必要) → 辞書のみ'); }
    else {
      const avail = await bridgeCall({ kind: 'avail', src: 'en' }, 6000);
      console.log('[starezo] 内蔵翻訳 availability(en->ja):', avail);
      if (avail === 'available') useMT = true;
      else if (avail === 'downloadable' || avail === 'downloading') { useMT = true; chromeNeedsDownload = true; }
      else { engine = 'none'; useMT = false; console.warn('[starezo] 内蔵翻訳モデル利用不可 → 辞書のみ'); }
    }
  }
  bridgeCall({ kind: 'status', engine: engine, useMT: useMT }, 2000);
  if (engine === 'chrome' && chromeNeedsDownload) showDownloadBanner();
  else if (active) translateAll();
  console.log('[starezo] v1.0 mode=' + cfg.mode + (autoBySite ? ' / 自動ON' : '') + ' / engine=' + engine);
})();
