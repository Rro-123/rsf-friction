# rsf-friction 文档

这里是 **rsf.js · 速率-状态摩擦定律计算库** 的文档导航。按你的目标，直接跳到对应文档即可。

## 我应该看哪个文档？

| 你的目标 | 看哪个 |
|---|---|
| 最快算出摩擦力，用起来 | [README](../README.md) 的「快速开始」 → [使用指南](guide.md) 第一节 |
| 想懂 RSF 物理原理（粘滑 / 愈合为什么会发生） | [README](../README.md) 的「为什么需要 RSF」「物理模型」 |
| 想在实际项目 / 仿真里正确用它 | [使用指南](guide.md) |
| 想查某个材质 / 接触对的摩擦系数 | [材质参数表](materials-table.md) |
| 想要 API 签名与类型提示 | [index.d.ts](../index.d.ts)（类型）+ [使用指南第八节](guide.md#八api-快速参考) |
| 想知道版本变更 / 破坏性改动 | [CHANGELOG.md](CHANGELOG.md) |

## 文档清单

| 文档 | 内容 | 面向 |
|---|---|---|
| [README](../README.md) | 项目概览、物理模型、特性、快速上手、项目结构 | 所有人（入口） |
| [使用指南](guide.md) | 从入门到进阶：变量映射、两种计算模式、仿真示例、时间依赖、FAQ | 使用 / 集成者 |
| [材质参数表](materials-table.md) | 内置 85 种接触对参数：分类表格、键名规则、数据来源、免责声明 | 查数据者 |
| [CHANGELOG](CHANGELOG.md) | 版本变更记录（含破坏性变更提示） | 升级 / 维护者 |

## 三步上手

```js
// 1. 安装（npm）
//    npm install rsf-friction

// 2. 引入
const RSF = require('rsf-friction');   // Node；浏览器用 <script src="rsf.js"></script>

// 3. 算摩擦力：材质 + 法向力(N) + 速度(m/s) → 摩擦力(N)
const r = RSF.computeFriction('granite', 1000, 1e-5);
console.log(r.frictionForce);   // 摩擦力 (N)
console.log(r.mu);              // 摩擦系数 μ
```

想看粘滑 / 静止愈合的**可视化效果**，直接打开 [`../demo/index.html`](../demo/index.html)。
