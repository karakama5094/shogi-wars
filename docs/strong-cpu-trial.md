# 最強CPU・1手最大5秒の試験対局

公開先（マージ・Pages公開後）: `https://karakama5094.github.io/shogi-wars/engine-lab/play.html`
通常の対局ページにも試験モードへのリンクを追加する。

## 設定

検証済みのYaneuraOu NNUE K-P 7.6.3-alpha.0＋SuishoPetiteを盤面に接続する。
SkillLevel=20、DepthLimit=0、NodesLimit=0、定跡とPonderは無効。
1手の探索時間は `go movetime 5000`。早期終局等では5秒未満で返ることもある。
探索Threads=1、Hash=16MiB、WASM共有メモリ上限256MiB。
「最強」はこの候補エンジンの弱化なし設定を指し、最新のPCエンジンや他機種との同等棋力を保証しない。
通常モードの簡易CPUは従来どおり利用できる。

対局ページのDOM・駒表示・操作・音声・棋譜を共用するため、既存のインライン処理とCSSを
`src/game.js`、`src/styles.css` に移動した。試験ページは通常ページから生成し、同じJSを使用する。
`window.configureShogiGame` が試験用CPUコントローラーを接続する。
通常モードではフックを設定しないため、従来CPUで動作する。

## 安全な対局進行

- 初期化中は操作を受け付けず、準備後に時計を開始する。
- 毎手、初期局面からのUSI履歴を渡す。待ったでは盤面・棋譜・USI履歴を同じスナップショットへ戻す。
- エンジンの返却手は既存ルール層で合法性・成り・駒打ちを再検証する。
- 思考開始時の局面キーと世代が一致するときだけ着手を適用する。
- 思考中の待った・新対局・投了・時間切れでは、進行中のセッションを破棄する。
- 一時停止・画面非表示時は時計を止め、思考を破棄する。明示的な「再開・再接続」で同じ局面から再開する。
- 通信失敗・初期化失敗・不正bestmoveは一時停止し、理由を表示する。簡易CPUに自動で切り替えない。
- 入玉宣言は引き続き未実装のため、エンジンのEnteringKingRuleはNoEnteringKing。
- 簡易CPUのヒント・駒得バー・棋神ボタンは、この試験画面で非表示とする。

## ビルドと検証

実行時は静的配信のみ。Tailwindの実行時CDNは分離環境で制限されるため、試験画面にはCSSを事前生成して同梱する。
Tailwind 3.4.17はMIT、ライセンスは `engine-lab/vendor/TAILWIND-LICENSE.txt` に同梱。
新規の試験画面接続スクリプトはGPL-3.0-only。エンジンの出典・ライセンスは既存のNOTICE参照。

```sh
npm install
npm run build:trial
npm test
node scripts/build-strong-trial.cjs --check
node scripts/verify-engine-assets.cjs
```

ブラウザ検証には任意のPlaywright 1.62.1とChromiumを用意する。
WASM取得・検証手順は `docs/engine-poc.md` を参照。

```sh
WASM_LOCAL_PATH=/tmp/yaneuraou.k-p.wasm node scripts/browser-strong-smoke.cjs
WASM_LOCAL_PATH=/tmp/yaneuraou.k-p.wasm node scripts/browser-engine-smoke.cjs
```

Linux Chromium 151、390×844タッチ画面で、実WASMの約5秒応答、思考中の待った→再応答、
思考中の新対局、後手開始、一時停止→再開、投了、内部Worker解放、通常モードの再動作を検証。
WASMはハッシュ検証済みの同一ファイルをローカル再生しており、実通信速度の検証ではない。
Nodeのテストでは初期化待ち、完全なUSI履歴、遅れて届く旧応答、終局後の応答拒否、不正手時の停止を確認する。

## iPhoneでの確認手順

1. Safariで試験URLを開き、CPU準備完了を待つ。
2. 歩を動かし、約5秒でCPUが指すことを確認する。
3. 次のCPU思考中に「待った」を押し、別の手を指す。
4. 「新対局」で後手を選び、CPUが先に指すことを確認する。
5. 「一時停止」後に時計が止まり、「再開・再接続」で同じ局面から再開できることを確認する。
6. 画面を離れて戻り、同じ再開操作ができることを確認する。
7. 10〜20分の対局でクラッシュ・操作遅延・発熱を確認する。

iPhone Safariでのエンジン単体の起動・停止・再起動はユーザー実測で合格済み。
実戦接続と長時間対局はこのPRの公開後に確認する。棋力10段階と解析・コーチは次の段階。
