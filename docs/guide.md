# rsf.js 使用指南

> 目标场景：把本库嵌入「仿真摩擦力模拟实验」或实际项目，用户只需调整 **接触面材质**、**接触面压力**、**物体运动速度** 三个变量，就能得到对应的摩擦力。
>
> 教程入口见 [docs/README.md](README.md) 文档索引；安装方式见 [README](../README.md)「快速开始」。

---

## 一、快速开始（一行代码）

假设已经引入库（`<script src="rsf.js"></script>` 后为 `window.RSF`，Node 用 `require('rsf-friction')`）：

```js
const RSF = window.RSF;          // 浏览器
// const RSF = require('rsf-friction'); // Node

// 三个变量 → 摩擦力
const 材质 = 'granite';   // 接触面材质（见内置材质表）
const 压力 = 1000;        // 法向力 N = 1000 牛顿
const 速度 = 1e-5;        // m/s（0.01 mm/s）

const 结果 = RSF.computeFriction(材质, 压力, 速度);
console.log(结果.frictionForce);  // 摩擦力 (N)
console.log(结果.mu);             // 摩擦系数 μ
```

`computeFriction` 返回对象的常用字段：

| 字段 | 含义 |
|---|---|
| `mu` | 摩擦系数 μ |
| `frictionForce` | 摩擦力 `μ·N` (N) |
| `mode` | `'rsf'` 或 `'coulomb'`，自动选定的计算模式 |
| `material` | 接触面的人类可读描述（如「花岗岩-花岗岩」） |
| `muSS` / `steadyForce` | RSF 模式的稳态 μ / 稳态力 |
| `theta` | RSF 模式使用的状态变量（默认稳态 `Dc/V`） |
| `weakening` | RSF 模式是否速度弱化（`a−b<0`） |

---

## 二、三个变量如何映射到库的输入

### 1. 材质 → 摩擦参数

库内置一个**材质预设表** `RSF.materials`，每个材质键名对应一组摩擦参数：

```js
RSF.materials.granite
// { name:'花岗岩-花岗岩', mu:0.60, muS:0.65,
//   mu0:0.60, a:0.008, b:0.012, Dc:5e-6, V0:1e-6 }
```

材质分两类，决定走的计算模式：

| 类型 | 特征 | 计算模式 |
|---|---|---|
| **岩石类**（granite / sandstone / limestone …） | 含 RSF 参数 `mu0, a, b, Dc, V0` | 自动 **RSF 模式**（含速度依赖） |
| **工程材料**（steel / wood / rubber / ptfe …） | 只含库仑 `mu` / `muS` | 自动 **库仑模式**（常数） |

自定义材质可直接传参数对象：

```js
const 我的岩石 = { mu0: 0.6, a: 0.01, b: 0.015, Dc: 1e-5, V0: 1e-6 }; // RSF 类
const 我的金属 = { mu: 0.5, muS: 0.65 };                              // 库仑类
RSF.computeFriction(我的岩石, 1000, 1e-5);
RSF.computeFriction(我的金属, 1000, 0.5);
```

完整键名规则与全部材质见 [材质参数表](materials-table.md)。

### 2. 压力 → 法向力 N

摩擦力 `F = μ·N`，其中 `N` 是**法向力**，单位**牛顿 (N)**。若给的是**压强 σ (Pa)** 与**接触面积 A (m²)**，则 `N = σ × A`。库直接支持这种输入：

```js
// 压强 100 kPa，面积 1 cm² → N = 1e5 × 1e-4 = 10 N
RSF.computeFriction('steel', null, 0.5, { sigma: 1e5, area: 1e-4 });
```

### 3. 速度 → V

速度 `V` 单位 **m/s**，与库的 SI 单位制一致。注意换算：

| 常用单位 | 换算到 m/s |
|---|---|
| 1 mm/s | 1e-3 |
| 1 μm/s | 1e-6 |
| 1 cm/s | 1e-2 |
| 1 km/h | 0.2778 |

---

## 三、两种计算模式（怎么选）

库自动按材质决定模式；也可用 `opts.mode` 强制：`computeFriction(材质, N, V, { mode: 'rsf' | 'coulomb' })`。

### 库仑模式：常数，适合简单教学

摩擦系数是常数，与速度无关：

```
滑动时：  F = μ_k · N
静止时：  F ≤ μ_s · N   （静摩擦，实际值由外力平衡决定）
```

```js
RSF.computeFriction('steel', 1000, 0.5);   // 滑动 → 0.42 × 1000 = 420 N
RSF.computeFriction('steel', 1000, 0);     // 静止 → 静摩擦上限 0.60 × 1000 = 600 N
```

### RSF 模式：含速度依赖与粘滑

摩擦系数随**速度**和**滑动历史（状态变量 θ）**变化，是本库核心。本构式与各参数物理含义见 [README 物理模型](../README.md#物理模型)，这里只强调调用要点：

```js
const 慢 = RSF.computeFriction('granite', 1000, 1e-5).frictionForce; // 590.8 N
const 快 = RSF.computeFriction('granite', 1000, 1e-4).frictionForce; // 581.6 N
// 花岗岩是速度弱化材料：速度越快摩擦力越小（差约 9 N）
```

能够体现库仑模型无法描述的现象：

- **速度弱化**（`a−b<0`）：速度越快摩擦越小 → 可能发生粘滑；
- **速度强化**（`a−b≥0`）：速度越快摩擦越大 → 稳定滑动。

> ⚠️ `computeFriction` 在 RSF 模式默认取**稳态** θ = `Dc/V`，因此返回的是**瞬时稳态单点值**，不会随时间变化。要看到摩擦随时间演化（静止愈合、速度阶跃），见第六节。

---

## 四、内置材质参数表

库内置 **85 种接触对**的参考参数（14 种岩石含 RSF 参数，71 种工程材料含库仑 `μ/μ_s`，每条均标注接触面对「材质A-材质B」）：

- **[材质参数表](materials-table.md)** — 可读文档：分类表格 + 键名规则 + 数据来源与免责声明；
- **[materials.json](../materials/materials.json)** — 机器可读数据（与 `RSF.materials` 保持一致）。

在代码中可遍历全部材质：

```js
Object.keys(RSF.materials).forEach(k => console.log(k, RSF.materials[k].name));
```

> ⚠️ 库仑 `μ/μ_s` 为干摩擦教科书/工程手册量级参考值，RSF 参数为岩石摩擦实验典型量级；正式仿真请用实测/标定值替换。

### 如何修改 / 新增材质

**方式一（推荐）：运行时传自定义材质，不改库**

```js
const 我的岩石 = { mu0: 0.62, a: 0.008, b: 0.013, Dc: 1e-5, V0: 1e-6 };
RSF.computeFriction(我的岩石, 1000, 1e-5);
```

**方式二：运行时动态注册到内置表**

```js
RSF.materials.我的材质 = { name: '我的材质', category: 'metal', mu: 0.5, muS: 0.65 };
RSF.computeFriction('我的材质', 1000, 0.5);
```

**方式三：修改库源码（持久化）**

1. 编辑 `rsf.js` 的 `var materials = { ... }` 新增/修改条目。岩石类需 `name / category:'rock' / mu / muS / mu0 / a / b / Dc / V0`；工程材料只需 `name / category / mu / muS`（category 取 `metal` / `polymer` / `other`）。
2. 同步更新 `materials/materials.json`（保持与 `RSF.materials` 一致）。
3. 同步更新 [材质参数表](materials-table.md) 中对应表格，及 `tests/rsf.test.js` 的材质数断言。

> 字段约定：`mu` 动摩擦系数、`muS` 静摩擦系数、`mu0` 参考摩擦系数、`a`/`b` 直接/演化效应系数、`Dc` 临界滑移距离（m）、`V0` 参考速度（m/s），单位均为 SI。

---

## 五、嵌入仿真实验的完整示例

### 示例 1：最基本的仿真循环

每帧按当前三变量计算摩擦力：

```js
let 材质 = 'wood';        // 接触面材质（下拉框选项）
let 法向力 = 500;         // 压力（N）
let 速度 = 0.3;           // 当前速度（m/s）

function 更新摩擦力() {
  const r = RSF.computeFriction(材质, 法向力, 速度);
  return r.frictionForce;   // 摩擦力大小 (N)
}
```

### 示例 2：含方向与静摩擦的完整仿真

真实仿真中摩擦力方向**始终与运动方向相反**，且静止时受静摩擦约束：

```js
function 摩擦力矢量(材质, 法向力, 速度v) {
  const r = RSF.computeFriction(材质, 法向力, Math.abs(v));
  if (Math.abs(v) < 1e-6) {
    // 几乎静止：返回静摩擦上限，方向由外力决定（仿真器自行平衡）
    return { 大小: r.frictionForce, 是静摩擦: true };
  }
  // 滑动：方向与速度相反
  return { 大小: r.frictionForce, 是静摩擦: false, 方向: -Math.sign(v) };
}
```

### 示例 3：HTML 网页仿真（下拉框选材质）

```html
<select id="mat">
  <option value="steel">钢-钢（干）</option>
  <option value="wood">木材-木材</option>
  <option value="rubber_concrete">橡胶-混凝土</option>
  <option value="ptfe">聚四氟乙烯（特氟龙）</option>
  <option value="ice">冰-冰</option>
  <option value="granite">花岗岩</option>
</select>
压力 <input id="N" value="500"> N
速度 <input id="V" value="0.3"> m/s
<button onclick="calc()">计算</button>
<output id="out"></output>

<script src="rsf.js"></script>
<script>
  function calc() {
    const mat = document.getElementById('mat').value;
    const N   = parseFloat(document.getElementById('N').value);
    const V   = parseFloat(document.getElementById('V').value);
    const r   = RSF.computeFriction(mat, N, V);
    document.getElementById('out').textContent =
      r.material + '：μ=' + r.mu.toFixed(4) + '，摩擦力 F=' + r.frictionForce.toFixed(2) + ' N';
  }
</script>
```

> 修正说明：示例 3 中 `rubber` 原键名在 v1.3.0 已按接触对规则改为 `rubber_concrete`、`ice` 为 `ice`（冰-冰），请使用当前键名。

---

## 六、体现时间依赖：让摩擦随时间变化

### 先澄清一个常见困惑

demo 页能看到摩擦随时间变化（粘滑、速度阶跃、静止愈合），但第一节的 `computeFriction(材质, N, V)` 却"感觉不到"时间依赖——因为 `computeFriction` **默认只算稳态/瞬时单点值**（θ 取稳态 `Dc/V`），是个常数。

时间依赖藏在**状态变量 θ 的演化律**里。要看它，用下面两个面向实际应用的接口。

### 接口 A：静止愈合 —— `computeFriction(材质, N, V, { holdTime })`

接触面静止越久，重新起滑所需静摩擦越大（对数增长）。只改变 `holdTime`（静止秒数）即可看到 μ 随时间变大：

```js
const 静止前 = RSF.computeFriction('granite', 1000, 1e-5);                       // 稳态 μ
const 静止后 = RSF.computeFriction('granite', 1000, 1e-5, { holdTime: 1000 });    // 静止 1000 s 后

console.log(静止前.mu);           // ≈ 0.5908  （稳态）
console.log(静止后.mu);           // ≈ 0.6636  （静止 1000 s 后明显变大）
console.log(静止后.thetaHealed);  // θ₀ + Δt —— 愈合后的状态变量
console.log(静止后.frictionForce);// μ_s · N —— 愈合后的最大静摩擦
```

> 数学：老化律下静止时 `θ = θ₀ + Δt`，静摩擦 `μ_s(Δt) = μ₀ + b·ln(V₀(θ₀+Δt)/Dc)`，随静止时间对数增长。即 demo 面板 ④ 的逻辑。

### 接口 B：速度历史驱动的完整演化 —— `RSF.frictionOverTime(材质, N, 速度历史)`

要**一条摩擦随时间变化的曲线**，用 `frictionOverTime`：喂一条**速度历史**（数字=恒速 / 函数 t→V / 分段常值 `[[t₀,v₀],[t₁,v₁],...]`），返回 `μ(t)`、`θ(t)`、`F(t)` 三个时间序列。

```js
// 例 1：速度从 1e-6 阶跃到 1e-5（t=10s），观察直接效应与随后的松弛
const r = RSF.frictionOverTime('granite', 1000, [[0, 1e-6], [10, 1e-5]], { totalTime: 30 });
console.log(r.t[0], r.mu[0]);          // 阶跃前（稳态）μ
console.log(r.t[10], r.mu[10]);        // 阶跃瞬间（直接效应跳变前后）
console.log(r.mu[r.mu.length - 1]);    // 松弛到新稳态 μ_ss(V₂)
```

```js
// 例 2：滑动 → 静止 100 s → 再滑动（静态愈合完整过程）
const r2 = RSF.frictionOverTime('granite', 1000, [[0, 1e-6], [20, 0], [120, 1e-6]], { totalTime: 160 });
// 前 20 s 滑动（μ 稳态）；20~120 s 静止，θ 增长使静摩擦上升；120 s 后重新起滑（μ 尖峰）
```

> 需要**随时间变化的受力曲线**（如仿真里逐帧读取 μ(t)）时，`frictionOverTime` 返回的 `t` / `mu` / `frictionForce` 数组可直接画图或逐帧驱动。
>
> 说明：恒速 + 稳态初始值下 θ 不演化，μ 会是恒定值（物理上稳态滑动摩擦就是常数）。要看到时间变化，请用**速度阶跃 / 静止**（如上例），或传非稳态初始 `opts.theta0`。

### 底层接口（进阶，详见 demo 页）

| 现象 | 接口 | 说明 |
|---|---|---|
| 粘滑（锯齿形振荡） | `new RSF.StickSlipSlider({...})` | 需额外参数：弹簧刚度 k、加载速度 Vlp、法向力 N |
| 速度阶跃直接效应 | `RSF.velocityStepExperiment({...})` | 速度从 V₁ 跳到 V₂，μ 先跳变后松弛 |
| 静态对数愈合 | `new RSF.RateStateFriction({...}).healingCurve([10,100,1000])` | 静摩擦随静止时间对数增长（`healingCurve` 是 `RateStateFriction` 的方法，不是顶层函数） |
| 滑动→静止→再滑动 | `RSF.slideHoldSlideExperiment({...})` | 完整 slide-hold-slide 过程 |

粘滑发生的判据（速度弱化 + 低刚度）：

```
粘滑条件：  a − b < 0  且  弹簧刚度 k < k_crit = N·(b − a) / Dc
```

---

## 七、注意事项与常见问题

1. **单位统一用 SI**：力 N、压强 Pa、速度 m/s、长度 m、时间 s。换算错误是最常见的坑。
2. **速度 V = 0（物体静止）**：RSF 对数律在 V=0 发散，库已处理——库仑模式返回静摩擦上限 `μ_s·N`；RSF 模式用极小速度 `1e-12` 近似稳态。静止物体的摩擦力应由外力平衡决定（≤ 静摩擦上限）。
3. **摩擦力是矢量**：`computeFriction` 返回的是**大小** `μ·N`，方向由仿真器按「与速度相反」处理。
4. **参考值需标定**：内置材质参数是量级参考值，正式实验请用实测数据；岩石的 a、b、Dc 尤其需实验室标定。
5. **速度弱化 ≠ 一定粘滑**：还需满足刚度条件 `k < k_crit`（见第六节），否则仍是稳定滑动。
6. **精度**：库用自适应 Runge-Kutta 求解器，默认容差 `rtol=1e-9, atol=1e-11`，速度阶跃直接效应、稳态摩擦、静态愈合均已与解析解逐位吻合。

---

## 八、API 快速参考

完整签名与类型见 [`index.d.ts`](../index.d.ts) 及 `rsf.js` 源码注释。

| 导出 | 用途 |
|---|---|
| `RSF.computeFriction(材质, N, V, opts)` | **三变量便捷接口**（瞬时/稳态；`opts.holdTime` 可体现静止愈合） |
| `RSF.frictionOverTime(材质, N, 速度历史, opts)` | **时间依赖便捷接口**：返回 μ(t)、θ(t)、F(t) 演化序列 |
| `RSF.materials` | 内置材质参数表 |
| `RSF.RateStateFriction` | RSF 本构律类（`mu`、`muSS`、`staticMu`、`healingCurve`、`imposedVelocityResponse`） |
| `RSF.SpringBlockSlider` | 准静态弹簧-滑块 |
| `RSF.StickSlipSlider` | 准动力粘滑仿真（复现粘滑） |
| `RSF.velocityStepExperiment` | 速度阶跃实验 |
| `RSF.slideHoldSlideExperiment` | 滑动 → 静止 → 再滑动实验 |
| `RSF.coulombForce(μ, N)` | 简单库仑摩擦 `μ·N` |
| `RSF.StateLaws` | 状态演化律（aging/slip/prz/nagata） |
