# Changelog

本项目版本遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [1.2.3] - 2026-08-24

### 新增
- 内置材质表扩充至 **71 种接触对**（49 → 71）：
  - 金属 2 种：铜-铜（1.00/1.00）、铸铁-钢（0.23/0.40）；
  - 聚合物 13 种：聚甲醛(POM)-钢、聚氯乙烯(PVC)-钢、PVC 自配对、聚碳酸酯(PC)-钢、尼龙-钢、有机玻璃(PMMA)-钢、聚醚醚酮(PEEK)-钢、PTFE 自配对、酚醛树脂层压材-青铜、橡胶-钢、PET-钢、PVDF-钢、FEP-钢；
  - 其他非金属 7 种：混凝土-钢、皮革-钢、玻璃-钢、木材-钢、砖-砖、石墨-钢、皮革-木材。
- 数据经网络查证并交叉核对（《机械设计手册》/ Engineering ToolBox / GORTEF / Super Civil CD / Machinery's Handbook 等），每条均有明确接触对与干/湿条件。
- 补回此前被删除的聚合物条目，改用「主材质_副材质」**成对语义键名**（如 `pom_steel` = 聚甲醛-钢、`pvc_pvc` = 聚氯乙烯自配对），避免同名材质多组合的歧义。

### 变更
- `zinc` 基准由「锌-铸铁」改为「**锌-钢（干）**」（数据源核实为 zinc-on-steel，与其它金属 X-钢 口径统一，消除基准不一）。
- `docs/materials-table.md` 采用「**以材质为中心**」索引重建：每个材质一个小节，列出它与所有已收录材质的接触组合（钢 32 组、混凝土/木材 4 组、橡胶 3 组等），另附单对材质速查表；数值统一两位小数，并由生成脚本保证与 `rsf.js` 完全一致。
- 材质表计数引用在 README / 使用指南 / 演示页同步更新为「71 种接触对」。

### 数据口径说明
- 仅收录 **μ 与 μ_s 双值完整且配对明确**的干摩擦工程参考值。
- 数值反常（铝-铝 动>静）、低可靠度（不锈钢-钢、钛-钢、碳化钨-碳化钨、硬质合金-钢）或仅存单一值的条目（PMMA-PMMA、PS-钢、PP-钢、PE-PE 等）暂不收录。
- 岩石类新条目因缺 RSF 参数（μ₀/a/b/Dc/V0）不另增；石材-钢等无公开工程表值的组合未收录（不编造）。

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
