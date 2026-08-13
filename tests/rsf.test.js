// rsf.js 自动化测试（node:test 框架）
// 运行：npm test（即 node --test tests/）
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const RSF = require('../rsf.js');

// 近似断言（默认绝对容差 1e-9）
function approx(actual, expected, tol, msg) {
  if (tol === undefined) tol = 1e-9;
  const diff = Math.abs(actual - expected);
  assert.ok(diff <= tol, `${msg || ''}（期望 ${expected}，实际 ${actual}，误差 ${diff}）`);
}

// ---------------------------------------------------------------------------
// 导出结构与版本
// ---------------------------------------------------------------------------
test('导出结构与版本号', () => {
  assert.equal(RSF.version, '1.2.1');
  assert.equal(typeof RSF.RateStateFriction, 'function');
  assert.equal(typeof RSF.SpringBlockSlider, 'function');
  assert.equal(typeof RSF.StickSlipSlider, 'function');
  assert.equal(typeof RSF.computeFriction, 'function');
  assert.equal(typeof RSF.coulombForce, 'function');
  assert.equal(typeof RSF.integrate, 'function');
  assert.equal(typeof RSF.velocityStepExperiment, 'function');
  assert.equal(typeof RSF.slideHoldSlideExperiment, 'function');
  assert.equal(typeof RSF.makeVelocityFunction, 'function');
  assert.equal(typeof RSF.makeDisplacementFunction, 'function');
  assert.ok(RSF.materials && typeof RSF.materials === 'object');
  assert.ok(RSF.StateLaws && typeof RSF.StateLaws.aging === 'function');
  assert.ok(RSF.presets && typeof RSF.presets === 'object');
});

// ---------------------------------------------------------------------------
// RSF 本构律：与解析解逐位吻合
// ---------------------------------------------------------------------------
test('RSF 本构律：稳态摩擦 μ_ss(V) = μ₀ + (a−b)·ln(V/V₀)', () => {
  const f = new RSF.RateStateFriction({ mu0: 0.6, a: 0.008, b: 0.012, Dc: 5e-6, V0: 1e-6 });
  const V = 1e-5;
  approx(f.muSS(V), 0.6 + (0.008 - 0.012) * Math.log(V / 1e-6), 1e-9, 'μ_ss(V)');
});

test('RSF 本构律：稳态状态变量 θ_ss(V) = Dc/V', () => {
  const f = new RSF.RateStateFriction({ mu0: 0.6, a: 0.008, b: 0.012, Dc: 5e-6, V0: 1e-6 });
  const V = 1e-5;
  approx(f.thetaSS(V), 5e-6 / V, 1e-9, 'θ_ss(V)');
});

test('RSF 本构律：稳态时 μ(V, θ_ss) = μ_ss(V)', () => {
  const f = new RSF.RateStateFriction({ mu0: 0.6, a: 0.008, b: 0.012, Dc: 5e-6, V0: 1e-6 });
  const V = 1e-5;
  approx(f.mu(V, [f.thetaSS(V)]), f.muSS(V), 1e-12, '稳态 μ');
});

test('RSF 本构律：反解 velocity(μ_ss, θ_ss) 精确还原速度', () => {
  const f = new RSF.RateStateFriction({ mu0: 0.6, a: 0.008, b: 0.012, Dc: 5e-6, V0: 1e-6 });
  const V = 1e-5;
  approx(f.velocity(f.muSS(V), [f.thetaSS(V)]), V, 1e-7 * V, '反解速度');
});

// ---------------------------------------------------------------------------
// 实验函数：直接效应与愈合
// ---------------------------------------------------------------------------
test('速度阶跃：直接效应 = a·ln(V₂/V₁)，稳态变化 = (a−b)·ln(V₂/V₁)', () => {
  const res = RSF.velocityStepExperiment({
    mu0: 0.6, a: 0.008, b: 0.012, Dc: 5e-6, V0: 1e-6,
    V1: 1e-6, V2: 1e-5, tStep: 5, totalTime: 20
  });
  approx(res.directEffect, 0.008 * Math.log(10), 1e-9, '直接效应 a·ln(V₂/V₁)');
  approx(res.steadyChange, (0.008 - 0.012) * Math.log(10), 1e-9, '稳态变化 (a−b)·ln(V₂/V₁)');
});

test('静态愈合：μ_s(Δt) = μ₀ + b·ln(V₀(θ₀+Δt)/Dc)', () => {
  const f = new RSF.RateStateFriction({ mu0: 0.6, a: 0.008, b: 0.012, Dc: 5e-6, V0: 1e-6 });
  const theta0 = f.thetaSS(1e-6); // = Dc/V₀
  const dt = 100;
  const mu = f.healingCurve([dt], theta0)[0];
  approx(mu, 0.6 + 0.012 * Math.log(1e-6 * (theta0 + dt) / 5e-6), 1e-12, '愈合 μ_s');
});

// ---------------------------------------------------------------------------
// computeFriction 便捷接口
// ---------------------------------------------------------------------------
test('computeFriction：RSF 模式（花岗岩，速度依赖）', () => {
  const r = RSF.computeFriction('granite', 1000, 1e-5);
  assert.equal(r.mode, 'rsf');
  approx(r.mu, r.muSS, 1e-12, '稳态 μ = μ_ss');
  approx(r.frictionForce, r.mu * 1000, 1e-9, 'F = μ·N');
  assert.equal(typeof r.weakening, 'boolean');
});

test('computeFriction：库仑模式（钢-钢，与速度无关）', () => {
  const r = RSF.computeFriction('steel', 1000, 0.5);
  assert.equal(r.mode, 'coulomb');
  approx(r.mu, 0.42, 1e-12, 'μ_k');
  approx(r.frictionForce, 420, 1e-9, 'F = μ_k·N');
});

test('computeFriction：静止 V=0 返回静摩擦上限 μ_s·N', () => {
  const r = RSF.computeFriction('steel', 1000, 0);
  assert.equal(r.mode, 'coulomb');
  approx(r.mu, 0.60, 1e-12, 'μ_s');
  approx(r.frictionForce, 600, 1e-9, 'μ_s·N');
  approx(r.maxStaticForce, 600, 1e-9, '最大静摩擦');
});

test('computeFriction：未知材质抛错', () => {
  assert.throws(() => RSF.computeFriction('nonexistent', 1000, 1), /未知材质/);
});

test('computeFriction：sigma × area 替代法向力', () => {
  const r = RSF.computeFriction('steel', null, 0.5, { sigma: 1e6, area: 0.001 });
  approx(r.frictionForce, 420, 1e-9, 'F = μ_k·(σ·A)');
});

// ---------------------------------------------------------------------------
// 稳定性与粘滑
// ---------------------------------------------------------------------------
test('稳定性判据：速度弱化 + 临界刚度 k_crit = N·(b−a)/Dc', () => {
  const f = new RSF.RateStateFriction({ mu0: 0.6, a: 0.005, b: 0.01, Dc: 1e-5, V0: 1e-6 });
  const s = f.stability(1000, 1e5);
  assert.equal(s.weakening, true);
  approx(s.kcrit, 1000 * (0.01 - 0.005) / 1e-5, 1e-9, 'k_crit');
  assert.equal(s.stickSlip, true); // k=1e5 < k_crit=5e8
});

test('粘滑仿真：产生有界锯齿形事件', () => {
  const s = new RSF.StickSlipSlider(RSF.presets.stickSlipDemo);
  const res = s.run(300, { samples: 1500 });
  assert.ok(res.events.length >= 5, `应产生多次粘滑事件，实际 ${res.events.length}`);
  for (const m of res.mu) {
    assert.ok(Number.isFinite(m), 'μ 应为有限值');
    assert.ok(m >= -1e-9 && m <= 1, `μ 应在 [0,1] 附近，实际 ${m}`);
  }
  // 完整事件应有应力降（峰值 > 谷值）
  let complete = 0;
  for (const e of res.events) {
    assert.ok(Number.isFinite(e.muPeak), 'muPeak 应为有限值');
    if (e.muMin !== undefined) {
      assert.ok(e.muPeak > e.muMin, '峰值摩擦应大于谷值（应力降）');
      complete++;
    }
  }
  assert.ok(complete >= 1, '应至少有一个完整的滑移-再黏着事件');
});

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------
test('coulombForce：F = μ·N', () => {
  assert.equal(RSF.coulombForce(0.42, 1000), 420);
});

test('makeVelocityFunction：支持数字 / 函数 / 分段数组', () => {
  assert.equal(RSF.makeVelocityFunction(1e-6)(123), 1e-6);
  const seg = RSF.makeVelocityFunction([[0, 1], [10, 2]]);
  assert.equal(seg(5), 1);
  assert.equal(seg(10), 2);
  assert.equal(RSF.makeVelocityFunction(t => t * 2)(3), 6);
});

// ---------------------------------------------------------------------------
// 内置材质表完整性
// ---------------------------------------------------------------------------
test('内置材质表：至少 62 种，且逐一可被 computeFriction 计算', () => {
  const keys = Object.keys(RSF.materials);
  assert.ok(keys.length >= 62, `材质数应 ≥ 62，实际 ${keys.length}`);
  for (const k of keys) {
    const m = RSF.materials[k];
    const v = m.mu0 != null ? 1e-5 : 0.5;   // 岩石走 RSF，工程材料走库仑
    const r = RSF.computeFriction(k, 1000, v);
    assert.ok(Number.isFinite(r.mu), `材质 ${k} 的 μ 应为有限值`);
    assert.ok(Number.isFinite(r.frictionForce), `材质 ${k} 的摩擦力应为有限值`);
    if (m.mu0 != null) assert.equal(r.mode, 'rsf', `岩石类 ${k} 应走 RSF 模式`);
  }
});
