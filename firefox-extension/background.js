// DeepL（CORS回避のためSWで実行）。複数text一括＋HTMLタグ保持に対応。
function deeplEndpoint(key) { return /:fx$/.test(key) ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate'; }
const authHeaders = key => ({ 'Authorization': 'DeepL-Auth-Key ' + key, 'Content-Type': 'application/x-www-form-urlencoded' });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && (msg.type === 'deepl' || msg.type === 'deeplBatch')) {
    const params = new URLSearchParams();
    const texts = msg.type === 'deeplBatch' ? msg.texts : [msg.text];
    for (const t of texts) params.append('text', t);
    params.append('target_lang', 'JA');
    if (msg.srcLang) params.append('source_lang', msg.srcLang);
    if (msg.tagHandling) {                           // タグ保持（xml/html）
      params.append('tag_handling', msg.tagHandling);
      if (msg.ignoreTags) params.append('ignore_tags', msg.ignoreTags);
    }
    fetch(deeplEndpoint(msg.key), { method: 'POST', headers: authHeaders(msg.key), body: params.toString() })
      .then(r => r.json().then(j => ({ status: r.status, j })))
      .then(({ status, j }) => {
        if (!j || !j.translations) return sendResponse({ ok: false, error: 'HTTP ' + status });
        const out = j.translations.map(x => x.text);
        if (msg.type === 'deeplBatch') sendResponse({ ok: true, texts: out });
        else sendResponse({ ok: true, text: out[0] != null ? out[0] : null });
      })
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});

function triggerActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0]; if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { type: 'starezo-translate-now' }, () => void chrome.runtime.lastError);
  });
}
chrome.commands.onCommand.addListener(cmd => { if (cmd === 'translate-now') triggerActiveTab(); });
