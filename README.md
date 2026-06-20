# スタレゾ 日英中 → 日本語 翻訳ツール

「スターレゾナンス（Star Resonance / BPSR）」の日英中データベースを元に、英語・中国語のWebページを日本語化するブラウザ拡張です。Chrome と Firefox に対応。

- **ゲーム用語（公式名）と説明文**は、こちらの辞書で正確な日本語に置換（無料）。
- **DeepL APIキー（任意）** を入れると、辞書に無い一般の文章も全文翻訳（用語は辞書どおりに固定）。
- 辞書URLは拡張内に固定済みなので、URL設定は不要です。

辞書ホスティング: `https://bpstar-tools.github.io/bpsr-translate-dict/`（GitHub Pages）

---

## フォルダ構成

| フォルダ / ファイル | 内容 |
|---|---|
| `chrome-extension/` | Chrome 拡張（manifest v3） |
| `firefox-extension/` | Firefox 拡張（`build-firefox.py` で生成） |
| `bpsr-translate-firefox.xpi` | Firefox 用パッケージ（インストール用） |
| `github-pages/` | 辞書ホスティング用（GitHub Pages にアップ済み） |
| `gen_dict.py` | Excel から辞書を再生成 |
| `build-firefox.py` | Chrome版 → Firefox版を生成 |
| `build-icons.py` | ロゴ画像 → 拡張アイコンを生成 |
| `userscript/` | Tampermonkey 版（任意） |

---

## Chrome へのインストール

1. `chrome://extensions` を開く
2. 右上の「**デベロッパーモード**」を ON
3. 「**パッケージ化されていない拡張機能を読み込む**」→ `chrome-extension` フォルダを選択
4. ツールバーに「スタレゾ翻訳」アイコンが出れば完了

更新したとき（コード変更後）は、`chrome://extensions` でこの拡張の **リロード（↻）** を押してください。

---

## Firefox（Developer Edition）へのインストール

通常版 Firefox は未署名拡張を常用できないため、**Developer Edition / Nightly** を前提とします。

### 1. 署名チェックを無効化（最初の一度だけ）

1. アドレスバーに `about:config` と入力 → 「危険性を承知の上で使用する」
2. `xpinstall.signatures.required` を検索し、値を **`false`** に設定

### 2. 拡張を読み込む（どちらか）

**A. .xpi を入れる（恒久）**
1. `about:addons` を開く
2. 右上の歯車 ⚙ → 「**ファイルからアドオンをインストール**」
3. `bpsr-translate-firefox.xpi` を選択

**B. 一時的に読み込む（再起動で消える・すぐ試したいとき）**
1. `about:debugging#/runtime/this-firefox` を開く
2. 「**一時的なアドオンを読み込む**」→ `firefox-extension/manifest.json` を選択

更新したとき（Chrome版を変更した後）は、リポジトリ直下で `python build-firefox.py` を実行 → 新しい `firefox-extension` / `.xpi` を作り直してから読み込み直してください。

---

## 他ユーザーへの配布について（重要）

このリポジトリのソースだけでも「開発者モードで読み込む」ことは可能ですが、一般ユーザーに配るなら次を理解しておいてください。

### Chrome

- **手軽な方法**：リポジトリの「Code → Download ZIP」で配布。利用者は解凍 →「展開して読み込む」で `chrome-extension` を選択。
  - 欠点：開発者モードが必要、起動のたびに警告が出る、フォルダを消すと無効化される。
- **正式な方法（おすすめ）**：[Chrome Web Store](https://chrome.google.com/webstore/devconsole)（登録料 5USD・一度きり）に公開すれば、ワンクリックでインストール＆自動更新。

### Firefox（ここが要注意）

- **通常版 Firefox は未署名の `.xpi` をインストールできません。** 同梱の `bpsr-translate-firefox.xpi` は未署名なので、そのままでは Developer Edition / Nightly でしか入りません。
- 一般ユーザーに配るには **AMO で署名**します（無料）。[addons.mozilla.org の開発者ページ](https://addons.mozilla.org/developers/) で **「自分で配布（unlisted / self-distribution）」** を選んでアップロードすると、**公開審査なしで署名済み `.xpi`** が受け取れます。これは通常版 Firefox にもインストール可能で、配布もできます。
- 署名済み `.xpi` は **GitHub の Releases** に添付して配るのがおすすめです。

### まとめ

| 対象 | 手段 | 利用者の手間 |
|---|---|---|
| Chrome | Web Store 公開 | ◎ ワンクリック |
| Chrome | ZIP配布＋展開読み込み | △ 開発者モード必要 |
| Firefox | AMOで署名した `.xpi` を配布 | ○ ファイルから追加 |
| Firefox | 未署名 `.xpi` | × Dev Edition限定 |

> 配布時の注意：辞書データ・アイコンはゲーム/maxroll 由来の第三者コンテンツです。一般公開・ストア申請時は権利面（商標・著作権）に配慮してください。

---

## 初期設定（共通）

拡張アイコンをクリックして設定します。**辞書URLの入力は不要**です。

| 項目 | 説明 |
|---|---|
| 動作モード | 「手動」=普段は何もせず、ボタン/Alt+T で発動。「常に翻訳」=ページを開くと自動。 |
| 自動発動するサイト | ここに書いたサイトは手動モードでも自動発動（既定 `maxroll.gg`）。「＋今のサイトを追加」ボタンでも追加可。 |
| 翻訳方向 | 英語・中国語→日本語／英→日／中→日 |
| DeepL APIキー | 任意。入れると全文翻訳が有効に（後述）。 |

**手動で翻訳する3つの方法**（モード問わずいつでも使えます）:
ポップアップの「▶ このページを今すぐ翻訳」／ ショートカット **Alt+T** ／ ページ上で右クリック →「このページの用語を翻訳」。

---

## 使い方：DeepL を使わない場合（無料）

辞書にあるゲーム用語・説明文だけが日本語化されます。一般の文章（ニュース記事の本文など）はそのままです。

- **maxroll などゲームDBページ**：用語・説明が大量に当たるので、これだけで十分実用的。
- **文章中心のページ**：足りない部分は **ブラウザの翻訳機能と併用**します。
  順序が重要 → **先にこの拡張で発動（Alt+T など）→ そのあと「日本語に翻訳」**。
  （逆だとブラウザの翻訳が優先され、用語が戻ります）

設定例: 動作モード「手動」、DeepLキー空欄。`maxroll.gg` を自動発動サイトに入れておくと、開くだけで用語が日本語化されます。

---

## 使い方：DeepL を使う場合（全文翻訳）

辞書に無い一般の文章も DeepL が翻訳し、その際もゲーム用語はこちらの辞書どおりに固定されます（用語を保護してから送信）。ブラウザの翻訳機能なしで、1つの拡張で完結します。

### DeepL APIキーの取得

1. [DeepL API Free](https://www.deepl.com/pro-api) に登録（**月50万文字まで無料**）
2. アカウント画面で発行される **Authentication Key** をコピー（無料キーは末尾が `:fx`）
3. 拡張ポップアップの「DeepL APIキー」に貼り付け →「保存して再読み込み」

### 動作

- ページを開く（自動発動サイト）または Alt+T で、用語・説明＋一般文がまとめて日本語に。
- 翻訳結果はキャッシュされ、同じ文の再翻訳は API を消費しません。
- DeepL へは複数まとめて送信（レート制限対策）。大きいページは数秒かけて順次反映されます。

### うまく訳されないときの確認（F12 → Console）

- `[starezo] v2.5 ... MT=ON(DeepL)` が出ているか（OFF ならキー未設定/無効）
- `HTTP 403` = キーが誤り、`HTTP 456` = 無料枠（月50万文字）超過
- `対応表取得失敗` = 辞書取得に失敗（ネットワーク等）

---

## アイコンの変更

`build-icons.py` で好きな画像から拡張アイコンを作れます。

1. ロゴ画像をリポジトリ直下に `icon-source.webp`（または `.png` / `.jpg`）として保存
2. `python build-icons.py` を実行 → `chrome-extension/icons/icon16/32/48/128.png` を生成
3. Firefox にも反映するなら続けて `python build-firefox.py`
4. 各ブラウザで拡張をリロード

> 配布する場合、ゲーム公式の画像・ロゴは商標・著作権の対象です。一般公開（Chrome Web Store / AMO）する際は自作アイコンの利用を検討してください。

---

## 辞書の更新

Excel を更新したら再生成し、GitHub Pages のリポジトリに上げ直します。

```bash
pip install openpyxl
python gen_dict.py "最新版/スタレゾ_日英中データベース_統合版.xlsx"
# 生成された translation-table.json / desc-index.json を
# github-pages/ に反映し、bpstar-tools/bpsr-translate-dict に push（または Web からアップロード）
```

辞書URLは拡張内に固定なので、上げ直せば自動反映されます（GitHub Pages のキャッシュで最大10分）。

---

## しくみ・制約

- 用語は最長一致優先。英単語は単語境界で照合（`Crit`→`会心`、`Critical` は変えない）。
- 説明文は正規化照合で、空白・改行・全半角・数値（`[7.2/9.36/…]` 等）のブレを吸収。
- `<script>` `<style>` `<input>` `<textarea>` `<code>` `<pre>`・編集領域は対象外。
- 動的に増えるDOM（SPA）にも追従。
- 日本語名がデータに無い項目（一部スキン等）は原文のまま。
- データ出典：maxroll.gg（EN/ZH 実データ）。
