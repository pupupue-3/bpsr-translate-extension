# Firefox 版 インストール手順

このフォルダ（`firefox-extension/`）は Chrome 版から生成した Firefox(MV3) 用です。
コードは共通で、manifest だけ Firefox 向け（`background.scripts` とアドオンID）にしてあります。

## 一時的に読み込む（すぐ試す／再起動で消える）

1. Firefox で `about:debugging#/runtime/this-firefox` を開く
2. 「**一時的なアドオンを読み込む**」をクリック
3. この `firefox-extension` フォルダ内の **`manifest.json`** を選択
4. ツールバーに「スタレゾ翻訳」アイコンが出ます

> 一時アドオンは Firefox を閉じると消えます。毎回読み込み直すか、下の「恒久インストール」を使ってください。

## 恒久的に使う

Firefox は署名なしアドオンの常時インストールを通常版では許可していません。方法は2つ:

- **A. 自分用に署名（推奨）**：[addons.mozilla.org](https://addons.mozilla.org/developers/) で「自分だけで使う(Self-distribution / unlisted)」として `firefox-extension` を zip にしてアップロードし、署名済み `.xpi` を受け取ってインストール。公開審査は不要です。
- **B. 署名不要にする**：**Firefox Developer Edition / Nightly / ESR** で `about:config` → `xpinstall.signatures.required` を `false` にしてから `.xpi` を読み込む。（通常版Firefoxでは不可）

zip化の例（このフォルダの中身を直下に固めます）:
```
cd firefox-extension
zip -r ../bpsr-translate-firefox.xpi . -x "*.DS_Store"
```

## 使い方（Chrome版と同じ）

- 拡張アイコン → 動作モード（手動／常時）、自動発動サイト、翻訳方向、DeepLキー を設定
- 手動発動：ボタン / **Alt+T** / 右クリック「このページの用語を翻訳」
- 辞書URLは固定済みなので設定不要

## 更新方法

Chrome版（`chrome-extension/`）を更新したら、リポジトリ直下で次を実行すると Firefox版に反映されます:
```
python build-firefox.py
```

## 既知の差分・注意

- 一時アドオンでも設定（storage.sync）はアドオンID付きで動作します。
- DeepL・辞書取得のためのホスト権限を manifest に明示済み。初回に権限の確認が出たら許可してください。
- ショートカット Alt+T が他と衝突する場合は `about:addons` → 歯車 → 「拡張機能のショートカットを管理」で変更できます。
