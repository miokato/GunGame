# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

`index.html` + `style.css` + `game.js` で構成されるHTML5 Canvasシューティングゲーム。ビルドシステム・依存関係・パッケージマネージャーは一切不使用。ブラウザで直接開くだけで動作する。

## 実行方法

```bash
# ブラウザで直接開く
open index.html

# 効果音が鳴らない場合はローカルサーバー経由で開く
# (Web Audio API の fetch が file:// を拒否するブラウザがあるため)
python3 -m http.server 8000
# → http://localhost:8000 をブラウザで開く
```

テストフレームワーク・ビルドコマンドは存在しない。

## ゲームアーキテクチャ

ロジックは `game.js` 1ファイルにまとまっており、責務ごとに以下のセクション・関数で分割されている：

| セクション | 主な関数・要素 | 責務 |
|------------|---------------|------|
| 定数 | `SHOOT_COOLDOWN`, `BOSS_SCORE` など | ゲームバランス調整値 |
| Canvas | `canvas`, `ctx` | 描画ターゲットの初期化 |
| ゲーム状態 | `state` オブジェクト | プレイヤー、敵、ボス、スコアなどを集約 |
| 入力 | `setupInput()`, `keys`, `touch` | キーボード・タッチ入力 |
| スポナー | `startSpawners()` | 敵・宝箱を `setInterval` で生成 |
| プレイヤー | `shoot()`, `updatePlayer()` | 移動・射撃・スライド・剣解放 |
| 敵 | `updateEnemies()` | 敵の移動 |
| ボス | `updateBosses()` | ボス・ラスボスの出現と攻撃 |
| 衝突判定 | `handleCollisions()` | すべての当たり判定 |
| 描画 | `draw()` と `drawXxx()` 群 | レイヤー別の描画 |
| ゲームループ | `update()`, `loop()` | `requestAnimationFrame` ループ |
| 起動 | ファイル末尾 | `setupInput()` → `startSpawners()` → `loop()` |

### ゲーム進行フロー

| スコア | イベント |
|--------|----------|
| 20     | ボス出現（HP 50） |
| 100    | 剣（ソード）入手・散弾に変化 |
| 150    | ラスボス出現（HP 200）|
| ラスボス撃破 | `gameClear=true` |

### 操作

- **WASD**: 移動
- **G**: 射撃
- **X**: スライド（無敵フレームあり）
- **E**: インベントリのアイテムを使用（`herb`=HP回復、`gun`=武器レベルアップ）
- **タッチ左半分**: 移動、**タッチ右半分**: 自動射撃

### 音源
BGMはループ再生してください。

- BGM : resources/sounds/bgm.mp3
- アイテム取得効果音 : resources/sounds/get_item.mp3
- プレイヤーの球発射 : resources/sounds/shot.mp3
- 球被弾 : resources/sounds/shot_damage.mp3