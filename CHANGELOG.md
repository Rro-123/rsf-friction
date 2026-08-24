# Changelog

本项目版本遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [1.2.2] - 2026-08-24

### 新增
- **npm 发布支持**：`package.json` 补充 `exports`（含 `materials/*.json` 子路径）、`files` 白名单、`sideEffects`、`engines`、`prepublishOnly`（发布前自动跑测试）、`homepage`、`bugs` 等字段。
- **CHANGELOG.md**：本文件。

### 变更（结构重组）
- 文档集中到 `docs/`：`使用指南.md` → `docs/guide.md`、`材质参数表.md` → `docs/materials-table.md`（文件名英文化）。
- 演示页独立到 `demo/`：`index.html` → `demo/index.html`；根目录 `index.html` 改为 GitHub Pages 跳转入口（旧链接 `rro-123.github.io/rsf-friction/` 不失效）。
- 材质数据目录 `materials/` 仅保留机器可读的 `materials.json`。
- README 安装方式重构：npm 安装（`npm install rsf-friction`）为主，CDN 链接切换为 npm CDN（jsDelivr / unpkg）。

### 修复
- 演示页与文档中所有旧路径引用随目录迁移同步更新（`<script src="../rsf.js">` 等）。

## [1.2.1] - 2026-08-14

- 改进演示页：材质下拉选择、无障碍（a11y）优化、图表刻度细化、支持 y 轴切换（μ / F）。

## [1.2.0] - 2026-08-14

- 内置材质参数表扩充至 **62 种**（14 种岩石含 RSF 参数 + 48 种工程材料库仑 μ/μ_s），并拆分到 `materials/` 目录（`materials.json` + 参数表文档）。
- 材质表完整性自动化测试（逐一可被 `computeFriction` 计算）。

## [1.1.0] - 2026-08-13

- 新增自动化测试套件（`node:test`，`npm test`），核心物理关系与解析解逐位吻合。
- 新增 TypeScript 类型定义 `index.d.ts`（TS 项目开箱即用）。
- README 补充三种安装/引用方式（CDN、npm、直接下载），修正 GitHub Pages 链接。

## [1.0.0] - 2026-08-13

- 初始发布：速率-状态摩擦定律（RSF）计算库。
  - 本构律 `RateStateFriction`（四种状态演化律：aging / slip / PRZ / Nagata）。
  - 准静态弹簧-滑块 `SpringBlockSlider` 与准动力粘滑 `StickSlipSlider`（Rice 1993 辐射阻尼）。
  - 三变量便捷接口 `computeFriction(材质, 法向力, 速度)`。
  - 自适应 Cash-Karp RK45 求解器、速度阶跃 / 静态愈合实验函数。
  - Canvas 可视化演示页 `index.html`。
