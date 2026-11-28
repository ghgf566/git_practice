# 千問大小姐 — 展示頁

研究室自架推論服務（Strata / New API）所賦予人格的 AI 助理之靜態展示頁。

## 技術

- 純靜態，無框架、無构建步驟
- 外部 JS／CSS 依賴：0（唯一外部資源為 Google Fonts）
- 3D 印章：Canvas 2D 手寫旋轉矩陣、透視投影、painter's algorithm 深度排序，`setTransform` 仿射變換貼字。無 WebGL、無 Three.js
- 長條圖：純 SVG 逐條繪製，含 nice-ticks 刻度演算法
- 設計 token 集中於 CSS custom properties；排版使用 `clamp()` 流體縮放
- 支援 `prefers-reduced-motion`；響應式至 390px 寬

## 檔案

| 檔 | 行數 |
|---|---|
| `index.html` | 296 |
| `style.css` | 418 |
| `app.js` | 379 |

## 本地預覽

```sh
python3 -m http.server 8000
```

## 部署

`push` 到 `main` 由 `.github/workflows/static.yml` 部署至 GitHub Pages。
