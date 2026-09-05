# rsf.js · 速率-状态摩擦定律计算库

基于 **Dieterich (1979)** 与 **Ruina (1983)** 的**速率-状态摩擦定律**（Rate-and-State Friction, RSF）的纯 JavaScript 计算库，可复现**粘滑 (stick-slip)**、**速度阶跃直接效应**、**静态对数愈合**等真实摩擦物理现象。

> 核心场景：输入「接触面材质 · 接触面压力 · 物体运动速度」三个变量，即可得到对应的摩擦力数值。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 文档导航

不知道该看哪篇？按你的目标选：

| 你的目标 | 看哪个 |
|---|---|
| 最快算出摩擦力 | 下方 [快速开始](#快速开始) |
| 想懂 RSF 物理原理 | 下方 [物理模型](#物理模型) |
| 完整教程（怎么用 / 示例 / 时间依赖 / FAQ） | [docs/guide.md](docs/guide.md) |
| 查材质 / 接触对摩擦系数 | [docs/materials-table.md](docs/materials-table.md) |
| 全套文档索引 | [docs/README.md](docs/README.md) |

---

## 为什么需要速率-状态摩擦定律？

经典**库仑摩擦定律** `F = μ·N` 把摩擦系数 μ 当作一个**常数**，只与材料有关。这够用但无法解释三个真实现象：

1. **摩擦力随滑动速度变化**——速度骤增时摩擦会瞬时增大（**直接效应**），随后随滑动演化（**演化效应**）。有的材料越滑越"滑"（速度弱化），有的越滑越"涩"（速度强化）。
2. **粘滑 (stick-slip)**——接触面相对滑动时出现"粘住 → 突然滑动 → 再粘住"的锯齿形周期振荡（刹车啸叫、门轴吱嘎、地震断层错动）。库仑定律无法产生这种周期性失稳。
3. **静止愈合 (healing)**——接触面静止越久，重新起滑所需静摩擦越大（摩擦随时间对数增长）。库仑定律不包含时间因素。

**速率-状态摩擦定律**引入一个**状态变量 θ**（描述接触面的滑移历史与接触时间）统一刻画了速度依赖、粘滑失稳与时间愈合，是当代**地震学（断层摩擦）、岩石力学、精密机械、微机电系统（MEMS）**等领域描述摩擦的标准模型。

---

## 物理模型

### 本构关系

```
μ(V,θ)     = μ₀ + a·ln(V/V₀) + b·ln(V₀θ/Dc)     ── 摩擦系数
F          = μ·N                                  ── 摩擦力（N 为法向力）
μ_ss(V)    = μ₀ + (a−b)·ln(V/V₀)                  ── 稳态摩擦系数
```

| 参数 | 含义 |
|---|---|
| `μ₀` | 参考速度 V₀ 下的摩擦系数 |
| `a` | **直接效应**系数：速度阶跃时摩擦的瞬时响应强度 |
| `b` | **演化效应**系数：摩擦随滑移历史演化的强度 |
| `Dc` | **临界滑移距离**：状态演化的特征长度 |
| `θ` | **状态变量**：接触面的"记忆"（滑移历史 / 接触时间） |

速度依赖由 `a − b` 的符号决定：

- `a − b < 0`：**速度弱化**——速度越快摩擦越小，可能发生粘滑失稳；
- `a − b ≥ 0`：**速度强化**——速度越快摩擦越大，稳定滑动。

### 状态演化律

状态变量 θ 随时间按以下任一演化律变化（`dθ/dt`）：

- **Dieterich 老化律**：`1 − Vθ/Dc`（静止时 θ 线性增长 → 产生愈合）
- **Ruina 滑移律**：`−(Vθ/Dc)·ln(Vθ/Dc)`
- **PRZ**（Perrin-Rice-Zheng）：`1 − (Vθ/(2Dc))²`
- **Nagata 修正律**：`1 − Vθ/Dc − (c/b)·θ·dμ/dt`

### 三种求解模型

| 模型 | 类型 | 用途 |
|---|---|---|
| `RateStateFriction` | RSF 本构律 | 由速度/状态求摩擦系数与摩擦力（单点计算） |
| `SpringBlockSlider` | 准静态弹簧-滑块 | 速度阶跃、静止愈合等稳定滑动实验 |
| `StickSlipSlider` | 准动力弹簧-滑块 | 复现有界的锯齿形粘滑循环 |

其中 `StickSlipSlider` 采用 **Rice (1993)** 准动力模型（忽略惯性、保留辐射阻尼 η = N/(2c_s)），以显式"黏着/滑动"状态机交替，避免准静态模型在失稳时速度发散的问题。

### 粘滑判据

粘滑发生在**速度弱化 + 低刚度**的条件下：

```
a − b < 0   且   k < k_crit = N·(b−a)/Dc
```

---

## 特性

- **零依赖**：单文件 UMD 模块，浏览器（`<script>`）与 Node.js（`require`）通用；
- **三变量便捷接口** `computeFriction(材质, 法向力, 速度)`：一行代码得到摩擦力；
- **时间依赖便捷接口** `frictionOverTime(材质, 法向力, 速度历史)`：返回 μ(t)、θ(t)、F(t) 演化序列，直观体现速度阶跃直接效应、静止对数愈合（`computeFriction` 加 `opts.holdTime` 亦可看静止愈合）；
- **内置 85 种接触对材质参数表**（14 种岩石含 RSF 参数，71 种工程材料含库仑 μ/μ_s，均明确标注接触面对，见 [docs/materials-table.md](docs/materials-table.md)）；
- **自适应 Cash-Karp RK45 求解器**：速度阶跃直接效应、稳态摩擦、静态愈合均与解析解逐位吻合；
- **四种状态演化律**：Dieterich 老化律、Ruina 滑移律、PRZ、Nagata；
- **Canvas 可视化演示页**（[demo/index.html](demo/index.html)），直观展示锯齿形粘滑曲线；
- **TypeScript 类型定义**：附带 [index.d.ts](index.d.ts)，TS 项目开箱即用类型提示；
- **键名即接触对**：材质键名为传给 API 的值，规则详见 [材质参数表](docs/materials-table.md#怎么读这张表)；
- **自动化测试**：内置 `node:test` 测试套件（`npm test`），核心物理关系与解析解逐位吻合。

---

## 快速开始

### 方式一：npm 安装（推荐）

```bash
npm install rsf-friction
```

```js
const RSF = require('rsf-friction');
const F = RSF.computeFriction('steel', 1000, 0.5).frictionForce;  // 420 N
```

> TypeScript 项目自带类型定义（`index.d.ts`），无需额外安装 `@types` 包。

### 方式二：CDN 引入（浏览器，零安装）

```html
<script src="https://cdn.jsdelivr.net/npm/rsf-friction@1.4.0/rsf.js"></script>
<script>
  const r = RSF.computeFriction('granite', 1000, 1e-5);  // 材质、法向力(N)、速度(m/s)
  console.log(r.frictionForce);  // 摩擦力 (N)
  console.log(r.mu);             // 摩擦系数 μ
</script>
```

> 也可用 unpkg：`https://unpkg.com/rsf-friction@1.4.0/rsf.js`

### 方式三：从 GitHub 安装开发版

```bash
npm install github:Rro-123/rsf-friction
```

### 方式四：直接下载文件

从 [jsDelivr](https://cdn.jsdelivr.net/npm/rsf-friction@1.4.0/rsf.js) 或 [GitHub Releases](https://github.com/Rro-123/rsf-friction/releases) 下载 [`rsf.js`](rsf.js)，用 `<script src="rsf.js"></script>`（浏览器）或 `require('./rsf.js')`（Node）引入。

### 想立刻看到随时间变化？

`computeFriction` 返回的是稳态/瞬时值（状态 θ 取稳态），所以看不出时间依赖。要看**摩擦随时间变化**（静止愈合、速度阶跃），用 [`frictionOverTime`](docs/guide.md#六体现时间依赖让摩擦随时间变化)，完整教程见 [docs/guide.md 第六节](docs/guide.md#六体现时间依赖让摩擦随时间变化)。

---

## 在线演示

👉 **在线体验（GitHub Pages）**：<https://rro-123.github.io/rsf-friction/>（自动跳转至演示页）

> 启用 GitHub Pages 后生效：仓库 `Settings → Pages → Source 选 main 分支`（根目录 `index.html` 为跳转入口，实际演示页位于 [demo/index.html](demo/index.html)）。

本地使用：直接打开 [demo/index.html](demo/index.html) 即可，包含四个面板：

1. **核心摩擦计算器** — 三变量 → μ、F（附 μ_ss(V) 曲线）；
2. **弹簧-滑块粘滑仿真** — 稳定性判据、滑移事件表、μ(t) 锯齿曲线、V(t) 尖峰曲线；
3. **速度阶跃实验** — 直接效应 `a·ln(V₂/V₁)`、稳态变化 `(a−b)·ln(V₂/V₁)`；
4. **静态愈合** — 静摩擦随静止时间的对数增长。

---

## 第三方致谢

本库为独立 JavaScript 实现，未复制下列项目源代码，仅参考其物理模型与求解思路（RSF 方程本身属公开科学文献）。详见 `rsf.js` 头部注释：

| 项目 | 许可证 |
|---|---|
| [jrleeman/rsfmodel](https://github.com/jrleeman/rsfmodel) | MIT |
| [newton-physics/newton](https://github.com/newton-physics/newton) | Apache 2.0 |
| [EQcycle_failure_laws](https://github.com/EkaterinaBolotskaya/EQcycle_failure_laws) | GPL v3 |
| [RSF_solvers](https://github.com/Cmarone/RSF_solvers) | 无 LICENSE（保留所有权利） |
| [Lubrication-Dynamics-with-Friction](https://github.com/BCAM-CFD/Lubrication-Dynamics-with-Friction) | 无 LICENSE（保留所有权利） |

---

## 项目结构

```
├── rsf.js          # 核心库（UMD，零依赖，浏览器 & Node 通用）
├── index.d.ts      # TypeScript 类型定义
├── index.html      # GitHub Pages 跳转入口（→ demo/）
├── demo/           # Canvas 可视化演示页（index.html，含图表）
├── docs/           # 文档（README.md 索引 + guide.md 使用指南 + materials-table.md 材质参数表 + CHANGELOG.md 版本记录）
├── materials/      # 材质数据（materials.json，机器可读）
├── tests/          # 自动化测试（node:test，npm test）
├── README.md       # 本文件
├── LICENSE         # MIT 许可证
├── package.json    # npm 元数据
└── .gitignore      # 忽略规则
```

---

## 许可证

本项目采用 [MIT License](LICENSE)。
