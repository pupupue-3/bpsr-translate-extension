/* 共有ロジック (DOM/通信に依存しない純粋関数群) */
(function (global) {
  'use strict';
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'CODE', 'PRE']);

  function parseCSV(text) {
    const rows = []; let i = 0, f = '', row = [], q = false;
    while (i < text.length) { const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else { if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; }
        else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
        else if (c === '\r') {} else f += c; } i++; }
    if (f.length || row.length) { row.push(f); rows.push(row); }
    const m = {};
    for (let r = 0; r < rows.length; r++) { const s = rows[r][0], t = rows[r][1];
      if (r === 0 && /^(source|src|英語|中国語|original)/i.test(s || '')) continue;
      if (s && t) m[s.trim()] = t.trim(); }
    return m;
  }

  function parseTable(url, txt) {
    const j = (/\.json(\?|$)/i.test(url) || /^\s*\{/.test(txt)) ? JSON.parse(txt) : { single: parseCSV(txt) };
    if (j.en2ja || j.zh2ja) return { en2ja: j.en2ja || {}, zh2ja: j.zh2ja || {} };
    if (j.single) return j;
    return { single: j };
  }

  // DBと同一の説明文正規化（表記ブレ吸収）
  function normDesc(s) {
    s = s.normalize('NFKC').toLowerCase();
    s = s.replace(/\{\*.*?\*\}/g, '0');
    s = s.replace(/\[[0-9.,/%+\-\s]+\]/g, '0');
    s = s.replace(/[0-9]+(?:\.[0-9]+)?%?/g, '0');
    s = s.replace(/\s+/g, '');
    return s;
  }

  function buildTermEngine(map, minLen) {
    const keys = Object.keys(map).filter(k => k && k.length >= minLen && !k.includes('\n') && k.length <= 80)
      .sort((a, b) => b.length - a.length);
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = keys.map(k => /^[A-Za-z0-9][A-Za-z0-9 .,'’\-:()/&]*$/.test(k) ? '\\b' + esc(k) + '\\b' : esc(k));
    let regex = null;
    try { regex = parts.length ? new RegExp('(' + parts.join('|') + ')', 'g') : null; } catch (e) { console.error('[starezo]', e); }
    return { regex, map };
  }
  function applyTerms(text, engines) {
    let out = text;
    for (const e of engines) if (e.regex) { e.regex.lastIndex = 0; out = out.replace(e.regex, m => e.map[m] !== undefined ? e.map[m] : m); }
    return out;
  }
  // 用語を私用領域文字(U+E000/U+E001)で保護
  const PL=String.fromCharCode(0xE000), PR=String.fromCharCode(0xE001);
  const PRE=new RegExp(PL+'(\\d+)'+PR,'g');
  function protectTerms(text, engines) {
    const ph = []; let out = text;
    for (const e of engines) if (e.regex) { e.regex.lastIndex = 0;
      out = out.replace(e.regex, m => { if (e.map[m] === undefined) return m;
        const tok = '' + ph.length + ''; ph.push(e.map[m]); return tok; }); }
    return { text: out, ph };
  }
  function restoreTerms(out, ph) {
    return out.replace(/(\d+)/g, (_, i) => ph[+i] !== undefined ? ph[+i] : '');
  }

  function pickMaps(table, direction) {
    if (table.single) return [table.single];
    return [].concat(direction !== 'en2ja' ? [table.zh2ja] : [], direction !== 'zh2ja' ? [table.en2ja] : []).filter(Boolean);
  }

  global.StarezoEngine = { SKIP_TAGS, parseTable, normDesc, buildTermEngine, applyTerms, protectTerms, restoreTerms, pickMaps };
})(typeof window !== 'undefined' ? window : this);
