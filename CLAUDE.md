# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

単一ファイル (`index.html`) のHTML5 Canvasシューティングゲーム。ビルドシステム・依存関係・パッケージマネージャーは一切不使用。ブラウザで直接開くだけで動作する。

## 実行方法

```bash
# ブラウザで直接開く
open index.html
```

テストフレームワーク・ビルドコマンドは存在しない。

## ゲームアーキテクチャ

すべてのロジックは `index.html` 内の単一 `<script>` ブロックに集約されている。構成は以下の通り：

- **状態変数**: グローバル変数でゲーム状態を管理（`player`, `bullets`, `enemies`, `boss`, `finalBoss`, `bossBullets`, `inventory`, `score` など）
- **入力**: キーボード (`keydown`/`keyup`) とタッチ (`touchstart`/`touchmove`/`touchend`) の両方に対応
- **ゲームループ**: `requestAnimationFrame` による `loop()` → `update()` + `draw()` の繰り返し
- **敵生成**: `setInterval` で定期的に敵・宝箱を生成

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
