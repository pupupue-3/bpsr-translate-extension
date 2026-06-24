# スタレゾMaxroll 英語 → 日本語 翻訳ツール

「スターレゾナンス（Star Resonance / BPSR）」の Maxroll のWebページを日本語化するブラウザ拡張です（**英語→日本語専用**）。

- **ゲーム用語（公式名）と説明文**は、こちらの辞書で正確な日本語に置換。
- **全文翻訳**は、翻訳エンジンを選んで使います（**Chrome内蔵翻訳＝無料** / **DeepL＝高品質**）。どちらも用語は辞書どおりに固定されます。
- `maxroll.gg` では自動発動。その他の英語サイトでも手動（ボタン / Alt+T / 右クリック）で使えます。

---

## 翻訳エンジンとブラウザ別おすすめ

ポップアップの「翻訳エンジン」で選びます。

| エンジン | 料金 | 品質 | 必要環境 |
|---|---|---|---|
| **Chrome内蔵翻訳** | 無料・無制限・キー不要 | 普通（端末内AI） | **Chrome 138以降・デスクトップ**。初回のみモデルDL |
| **DeepL** | 無料枠 月50万文字 | 高い・自然 | DeepL APIキー |
| 辞書のみ | 無料 | 用語だけ | なし |

**ブラウザ別おすすめ**

| ブラウザ | おすすめ |
|---|---|
| **Chrome** | どちらでもOK（**Chrome内蔵翻訳＝無料** が手軽 / 文法重視なら DeepL） |
| **Edge** | **DeepL 推奨**（内蔵翻訳APIが使えないため） |
| **Firefox** | **DeepL 推奨**（内蔵翻訳APIが無いため） |

---

## インストール

### Chrome / Edge

1. [Releases](https://github.com/pupupue-3/bpsr-translate-extension/releases) から `bpsr-translate-chrome.zip` をDLして解凍
2. Chrome は `chrome://extensions`、Edge は `edge://extensions` を開く
3. 「**デベロッパーモード**」を ON
4. 「**パッケージ化されていない拡張機能を読み込む**」→ 解凍した **bpsr-translate-chrome** フォルダを選択
5. ツールバーにアイコンが出れば完了

> 解凍フォルダは消さないでください。更新時は新しい zip を解凍し、拡張ページで **リロード（↻）**。

### Firefox（Developer Edition / Nightly）

通常版 Firefox は未署名拡張を常用できないため Developer Edition / Nightly 前提です。

1. `about:config` → `xpinstall.signatures.required` を **`false`** に（最初の一度だけ）
2. [Releases](https://github.com/pupupue-3/bpsr-translate-extension/releases) から `bpsr-translate-firefox.xpi` をDL
3. `about:addons` → 歯車 ⚙ → 「**ファイルからアドオンをインストール**」→ `.xpi` を選択

---

## 初期設定

拡張アイコンをクリックして設定します。

| 項目 | 説明 |
|---|---|
| 翻訳エンジン | Chrome内蔵 / DeepL / 辞書のみ（既定はChrome内蔵） |
| DeepL APIキー | DeepLを選んだ時のみ必要（取得方法は後述） |
| 動作モード | 「手動」=ボタン/Alt+Tで発動。「常に翻訳」=開くと自動。 |
| 自動発動するサイト | 記載サイトは開くと自動発動（既定 `maxroll.gg`）。 |

**手動で翻訳する3つの方法**：ポップアップの「▶ このページを今すぐ翻訳」／ **Alt+T** ／ 右クリック →「このページを翻訳」。

---

## Chrome内蔵翻訳を使う（無料）

1. ポップアップで翻訳エンジン「**Chrome内蔵翻訳**」を選んで保存（既定で選択済み）
2. maxroll のページを開く
3. **初回のみ**、画面上部に「▶ クリックでChrome翻訳を有効化（初回のみモデルDL）」のバナーが出るので**クリック**
   - クリックで翻訳モデルがダウンロードされます（数十MB・一度きり）。完了後そのまま全文翻訳されます
4. 2回目以降は自動で全文翻訳されます

> Chrome 138未満や Edge/Firefox では内蔵翻訳が使えず、自動で「辞書のみ」になります。その場合は DeepL を使ってください。

---

## DeepL を使う（高品質・推奨：Edge / Firefox）

辞書に無い文章も DeepL が翻訳し、ゲーム用語は辞書どおりに固定されます。

### DeepL 無料APIキーの取得手順

1. [DeepL API（開発者向け）](https://www.deepl.com/pro-api) を開き、アカウントを作成（既にDeepLアカウントがあればログイン）
2. プランは **「DeepL API Free」** を選択（**月50万文字まで無料**）
   - 登録時に本人確認のためクレジットカード情報を求められる場合がありますが、**無料プランは課金されません**（上限超過時も自動課金されず停止します）
3. ログイン後、[アカウントのAPIキー画面](https://www.deepl.com/your-account/keys) を開く
4. 表示される **Authentication Key**（認証キー）をコピー
   - 無料プランのキーは末尾が **`:fx`**（例: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx`）
5. 拡張ポップアップで翻訳エンジン「**DeepL**」を選び、**DeepL APIキー**欄に貼り付けて「**保存して再読み込み**」

---