# やねうら王WASM接続・性能検証

この変更は製品CPUの置き換えではなく、iPhone Safariで採用判断を行うための独立したPoCです。
公開後のURLは `https://karakama5094.github.io/shogi-wars/engine-lab/` です。
「検証を開始」を押すと、初回のみ実行環境の準備で再読み込みした後、自動検証します。
「結果をコピー」で表示されたJSONを共有できます。結果は自動送信しません。

## 固定した候補

- `@mizarjp/yaneuraou.k-p@7.6.3-alpha.0`、YaneuraOu NNUE K-P、SuishoPetite 2021-11内蔵。
- npmのgitHead: `c9c34f240f89b611ca34060466e61220b0d3180c`。
- 対応ソース、評価データの出典、GPLv3本文、ローカル変更は `engine-lab/vendor/NOTICE.txt` に記載。
- パッケージのGPL-3.0表記を確認済み。旧移植リポジトリは2022年にアーカイブされているため、保守性・評価関数の条件・再現ビルドは製品採用前に再評価する。
- 既存アプリのライセンスは変更しない。新規labのUI・エンジン接続スクリプトにはGPL-3.0-onlyを適用する。

## 実行構成

通常画面 → （変更なし）従来のCPU

検証画面 → USIクライアント → 専用Worker → やねうら王WASM＋pthread Worker

探索Threads=1、USI_Hash=16MiB、Ponder無効、定跡無効、入玉ルール無効。
初期pthreadプールを32から2に変更したJSローダーだけを同梱する。
WASMとpthreadスクリプトは未改変。WASMは版固定のjsDelivr URLから取得し、バイト数とSHA-256を検証してから実行する。
初期共有メモリ88MiB、上限256MiB。初期化後に実測されるWASMメモリは約140MiBだった。
WASM領域のサイズはSafariプロセス全体のメモリ量ではなく、解放後のOSによるメモリ回収時刻も測定していない。

SharedArrayBuffer・SIMDが必要。単一スレッドビルドではないため、Threads=1でもcross-origin isolationが必要。
GitHub Pages向けに `/engine-lab/` 内だけのService WorkerでCOOP/COEPを付与する。
失敗時は再読み込みを繰り返さず、非対応理由を表示する。CDN停止やバイナリ不一致時も検証を中止する。
通常の対局ページはService Workerのスコープ外。iPhoneで実行できなければ、単一スレッド再ビルドまたはヘッダー設定可能な専用配信先を比較する。

USIの応答待ちは直列化し、応答タイムアウトでセッションを破棄する。
破棄前に内部Workerの終了応答を待つ。親Workerを直ちに終了すると内部Workerが残ることをChromiumで再現したため、明示的な子Workerの解放を追加した。
エンジンの返却手は既存ルール層で検証し、不正手・不正な成り・不正な駒打ちは適用しない。

## 検証項目

1. 起動・`usi`・オプション設定・`isready`・`usinewgame`。
2. 初期局面・後手局面・持駒のある局面で1秒探索し、bestmoveを合法性検証。
3. `go infinite` → 250ms後の`stop` → bestmove受信までを計測。
4. 終了→再初期化→200ms探索で復帰確認。
5. 50ms間隔のUIタイマーで最大呼び出し間隔を記録。
6. 中止、タイムアウト、古い応答、取得失敗、ハッシュ不一致、内部Worker解放を検証。

起動5秒以内・停止500ms以内・UIタイマー間隔250ms未満は暫定目標。
起動時間は取得／キャッシュ条件に依存するため、初回と再実行を分けて確認する。
画面が非表示になると性能測定を中止する。これはバックグラウンド復帰時の対局時計テストではない。

## 開発環境での再現

標準回帰テストと同梱ファイルの出典検証:

```sh
npm test
node scripts/verify-engine-assets.cjs
```

WASMを手元に取得し、SHA-256を確認する（HTTPSの検証は無効化しない）:

```sh
curl -fL 'https://cdn.jsdelivr.net/npm/@mizarjp/yaneuraou.k-p@7.6.3-alpha.0/lib/yaneuraou.k-p.wasm' -o /tmp/yaneuraou.k-p.wasm
node scripts/verify-engine-assets.cjs /tmp/yaneuraou.k-p.wasm
```

ブラウザテストは任意の開発依存Playwrightを用意して実行する。標準の `npm test` にネットワークやブラウザは不要。

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
WASM_LOCAL_PATH=/tmp/yaneuraou.k-p.wasm node scripts/browser-engine-smoke.cjs
```

テストはローカルサーバーを自動で起動・停止し、Pagesと同じ `/shogi-wars/engine-lab/` 配下でService Workerを検証する。
CDN取得は検証済みの同一WASMをローカル応答として再生する。実CDNからの取得とハッシュ一致は別途確認済み。
したがってブラウザの計測値をiPhone上の通信・性能結果と解釈しない。

## 次の採用判断

iPhone実測の起動・停止・再起動・WASMメモリを収集した後、現行エンジンの単一スレッド再ビルドも比較する。
製品への統合、棋力10段階、評価値グラフ、AIコーチはこのPoCの範囲外。

## この環境での結果（2026-11-04）

`docs/engine-poc-result.json` に測定結果を保存。
Linux Chromium 151 / Playwright 1.62.1、390×844のタッチ画面エミュレーション。
起動399ms、再起動356ms、stop応答約0.3ms、WASM領域140MiB、探索時pthread Worker数2。
終了後、内部を含む全エンジンWorkerが約1.9秒で消えることを確認した。OS全体のメモリ解放時刻は未測定。
正常系9項目と、中止・通信失敗・整合性不一致・Service Worker範囲・通常盤面81マスの追加検証が成功。
Node回帰テストは既存44件＋USI境界7件＋接続状態5件の計56件で成功。

**これはiPhone実測ではない。** SafariのService Worker分離、初期化可否、長時間のメモリ・発熱は未確認。
旧ビルドの再現用Docker指定は `emscripten/emsdk:latest` のため、バイト単位の再現性はまだ確認できていない。
本番採用前にはツールチェーン固定・単一スレッド版・ライセンスと評価データの完全な配布確認が必要。
