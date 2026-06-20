const D = { deeplKey: '', mtEnabled: true, minLen: 2, enabled: true, mode: 'manual', autoSites: 'maxroll.gg' };
const $ = id => document.getElementById(id);
const HINTS = {
  manual: '普段は何もしません（下の対象サイトは自動）。ボタンかAlt+Tで翻訳→Chrome翻訳を併用すると全文＋公式用語に。',
  always: 'ページを開くと自動で用語・説明を日本語化します。',
};
function refresh() {
  const m = $('mode').value;
  $('modehint').textContent = HINTS[m];
  document.querySelector('.mt-only').style.display = 'block'; // どちらのモードでも任意で使える
}
chrome.storage.sync.get(D, c => {
  $('mode').value = c.mode || 'manual';
  $('key').value = c.deeplKey; $('mt').checked = c.mtEnabled; $('enabled').checked = c.enabled; $('sites').value = c.autoSites || ''; refresh();
});
$('mode').addEventListener('change', refresh);
$('now').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { type: 'starezo-translate-now' }, () => void chrome.runtime.lastError);
  $('status').textContent = '翻訳しました（必要ならChrome翻訳を併用）';
  setTimeout(() => window.close(), 700);
});

$('addsite').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;
  let host = '';
  try { host = new URL(tab.url).hostname; } catch (e) { return; }
  const cur = $('sites').value.split(/[\s,\n]+/).map(x => x.trim()).filter(Boolean);
  if (!cur.includes(host)) cur.push(host);
  $('sites').value = cur.join('\n');
  $('status').textContent = host + ' を追加（保存で確定）';
});

$('save').addEventListener('click', () => {
  chrome.storage.sync.set({
    mode: $('mode').value,
    deeplKey: $('key').value.trim(), mtEnabled: $('mt').checked, enabled: $('enabled').checked, autoSites: $('sites').value.trim(),
  }, async () => {
    $('status').textContent = '保存しました。再読み込みします…';
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) chrome.tabs.reload(tab.id);
    setTimeout(() => window.close(), 600);
  });
});
