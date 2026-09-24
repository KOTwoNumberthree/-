# 追加機能のホスト統合

`reality-features.js` は既存の `index.html` を置き換えずに読み込む追加モジュールです。

`index.html` の既存アプリ本体より後、`</body>` の直前に次を一度追加してください。

```html
<script src="reality-features.js"></script>
```

このモジュールは次の安全な統合フックを提供します。

- `window.AtlasRealityAdapter.screenToMap(x, y)`：画面座標を既存の地図座標へ変換
- `window.AtlasRealityAdapter.calculateTravel(input)`：既存の地形・標高・道路・河川を使った経路計算
- `atlas:reality:preview`：自動計算結果のプレビュー
- `atlas:reality:apply`：ユーザーが明示的に適用した結果。既存の undo/redo・履歴 API へ接続する場所

アダプター未接続時も、移動時間計算と飛び地単位の国名表示設定は候補として動作します。自動結果は既存の地形・河川・国家データを直接上書きしません。

`nation-label` の設定キーは `国家ID:飛び地コンポーネントID` であり、同じ国家の別飛び地へ一括適用されません。`merged` は選択された飛び地だけを統合表示する指定です。
