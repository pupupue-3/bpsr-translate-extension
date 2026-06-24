const D = { deeplKey: '', engine: 'chrome', minLen: 2, enabled: true, mode: 'manual', autoSites: 'maxroll.gg' };
const $ = id => document.getElementById(id);
const HINTS = {
  none: '辞書でゲーム用語だけ日本語化（地の文は原文のまま）。その後ブラウザ翻訳を併用してもOK。',
  chrome: 'Chrome内蔵の翻訳AIで全文翻訳（無料・キー不要）。Chrome 138以降のデスクトップのみ。初回はモデルのDLが入ります。',
  deepl: 'DeepLで全文翻訳。高品質ですが APIキー が必要（無料枠あり）。',
};
function syncEngine() {
  const e = $('engine').value;
  $('enginehint').textContent = HINTS[e] || '';
  $('deeplrow').style.display = (e === 'deepl') ? 'block' : 'none';
}
chrome.storage.sync.get(D, c => {
  // 旧設定からの移行: mtEnabled+key があれば deepl
  let eng = c.engine;
  if (!eng) eng = (c.mtEnabled && (c.deeplKey || '').trim()) ? 'deepl' : 'chrome';
  $('engine').value = eng;
  $('key').value = c.deeplKey || '';
  $('enabled').checked = c.enabled !== false;
  $('mode').value = c.mode || 'manual';
  $('sites').value = c.autoSites || '';
  syncEngine();
});
$('engine').addEventListener('change', syncEngine);

$('addsite').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;
  let host = ''; try { host = new URL(tab.url).hostname; } catch (e) { return; }
  const cur = $('sites').value.split(/[\s,\n]+/).map(x => x.trim()).filter(Boolean);
  if (!cur.includes(host)) cur.push(host);
  $('sites').value = cur.join('\n');
  $('status').textContent = host + ' を追加（保存で確定）';
});

$('now').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { type: 'starezo-translate-now' }, () => void chrome.runtime.lastError);
  $('status').textContent = '翻訳しました';
  setTimeout(() => window.close(), 700);
});

$('save').addEventListener('click', () => {
  let engine = $('engine').value;
  const key = $('key').value.trim();
  if (engine === 'deepl' && !key) { $('status').style.color = '#c00'; $('status').textContent = 'DeepLを選ぶ場合はAPIキーが必要です'; return; }
  chrome.storage.sync.set({
    engine, deeplKey: key, mtEnabled: engine === 'deepl',
    enabled: $('enabled').checked, mode: $('mode').value, autoSites: $('sites').value.trim(),
  }, async () => {
    $('status').style.color = '#0a0';
    $('status').textContent = '保存しました。再読み込みします…';
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) chrome.tabs.reload(tab.id);
    setTimeout(() => window.close(), 600);
  });
});
