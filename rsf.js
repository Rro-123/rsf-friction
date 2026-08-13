/*!
 * ============================================================================
 *  rsf.js —— 速率-状态摩擦定律 (Rate-and-State Friction, RSF) 工具库
 *  License: MIT — Copyright (c) 2026 Rro-123
 * ============================================================================
 *
 *  本库实现"速率-状态摩擦定律"(Dieterich 1979; Ruina 1983)，并以
 *  准静态弹簧-滑块模型复现粘滑(stick-slip)、速度阶跃响应、静态愈合等
 *  摩擦物理现象。求解策略与地震循环求解器(如 jrleeman/rsfmodel、
 *  EQcycle_failure_laws、RSF_solvers)一致：
 *     —— 以"摩擦系数 μ"作为积分变量，速度 V 由本构关系反解，从而
 *        避免 V→0 时对数项发散，稳定复现粘滑。
 *
 *  物理量约定（全部采用 SI 国际单位制）：
 *    μ₀    参考摩擦系数 (无量纲)
 *    a     直接效应系数 (无量纲)
 *    b     演化效应系数 (无量纲)
 *    Dc    临界滑移距离 (m)
 *    V₀    参考速度 (m/s)
 *    θ     状态变量（滑移历史/接触时间，量纲为时间 s）
 *    N     法向力（接触面所受压力 × 接触面积，单位 N）
 *    σₙ    正应力（法向压力，单位 Pa）
 *    k     加载系统刚度（单位 N/m）；归一化刚度 k_norm = k / N（单位 1/m）
 *
 *  核心本构关系（单状态变量，多状态可叠加）：
 *    μ(V,θ) = μ₀ + a·ln(V/V₀) + b·ln(V₀·θ/Dc)
 *    （反解）V = V₀·exp( (μ - μ₀ - b·ln(V₀·θ/Dc)) / a )
 *    稳态   μ_ss(V) = μ₀ + (a - b)·ln(V/V₀)
 *    摩擦力  F = μ·N = μ·σₙ·A
 *
 *  状态演化律 dθ/dt：
 *    aging (Dieterich): 1 - Vθ/Dc
 *    slip  (Ruina)    : -(Vθ/Dc)·ln(Vθ/Dc)
 *    prz   (Perrin-Rice-Zheng): 1 - (Vθ/(2Dc))²
 *    nagata(Nagata)   : 1 - Vθ/Dc - (c/b)·θ·dμ/dt
 *
 *  弹簧-滑块准静态加载（以 μ 为积分变量）：
 *    dμ/dt = k_norm·(V_lp(t) - V)
 *    dθ/dt = 演化律
 *    粘滑判据：a - b < 0（速度弱化）且 k < k_crit = N·(b - a)/Dc
 *
 *  ============================================================================
 *  参考与致谢（Third-party acknowledgements）
 *  ============================================================================
 *  本库为独立实现（JavaScript），速率-状态摩擦定律本身来自公开科学文献：
 *    - Dieterich, J. H. (1979). Modeling of rock friction: 1. Experimental
 *      results and constitutive equations. JGR, 84(B5), 2161-2168.
 *    - Ruina, A. (1983). Slip instability and state variable friction laws.
 *      JGR, 88(B12), 10359-10370.
 *    - Rice, J. R. (1993). Spatio-temporal complexity of slip on a fault.
 *      JGR, 98(B6), 9885-9907.（准动力/辐射阻尼模型）
 *    - Ran jith, K. & Rice, J. R. (1999). 正则化摩擦律（arcsinh 形式）。
 *    - Marone, C. (1998). Laboratory-derived friction laws and their
 *      application to seismic faulting. Annu. Rev. Earth Planet. Sci. 26, 643-696.
 *
 *  求解策略（以摩擦系数 μ 为积分变量、准静态/准动力弹簧-滑块）参考了以下
 *  开源项目，谨此致谢：
 *    - jrleeman/rsfmodel — Rate and State Friction Toolkit
 *        License: MIT  (Copyright (c) 2015 John Leeman)
 *        https://github.com/jrleeman/rsfmodel
 *    - newton-physics/newton — GPU 加速物理仿真引擎
 *        License: Apache License 2.0
 *        https://github.com/newton-physics/newton
 *    - EkaterinaBolotskaya/EQcycle_failure_laws — 地震循环 / 破坏律模拟
 *        License: GNU GPL v3
 *        https://github.com/EkaterinaBolotskaya/EQcycle_failure_laws
 *    - Cmarone/RSF_solvers — 速率-状态摩擦 C 求解器
 *        License: 未附带 LICENSE 文件（默认保留所有权利）
 *        https://github.com/Cmarone/RSF_solvers
 *    - BCAM-CFD/Lubrication-Dynamics-with-Friction — 润滑摩擦动力学
 *        License: 未附带 LICENSE 文件（默认保留所有权利）
 *        https://github.com/BCAM-CFD/Lubrication-Dynamics-with-Friction
 *
 *  许可提示：
 *    本库为独立 JavaScript 实现，未复制上述任何项目的源代码，仅参考其
 *    物理模型与求解思路（RSF 方程本身属公开科学文献，不受版权限制）。
 *    若未来需直接复制/移植上述项目的代码，请注意：
 *      - EQcycle_failure_laws 采用 GPL v3（copyleft）：复制其代码则本库
 *        整体亦须以 GPL v3 发布；
 *      - RSF_solvers 与 Lubrication-Dynamics-with-Friction 未附 LICENSE，
 *        依版权法默认"保留所有权利"，复制/移植其代码需先征得原作者许可。
 *
 *  ============================================================================
 *  用法示例（浏览器）：
 *    const fric = new RSF.RateStateFriction({ mu0:0.6, a:0.005, b:0.01, Dc:1e-5, V0:1e-6 });
 *    const mu  = fric.mu(1e-6, fric.thetaSS(1e-6));      // 瞬时摩擦系数
 *    const F   = fric.frictionForce(mu, 1000);            // 摩擦力 (N)
 *
 *    const slider = new RSF.SpringBlockSlider({ ... fric 参数, k:1e5, N:1000, Vlp:1e-6 });
 *    const result = slider.run(50);                        // 运行 50 s 仿真
 *  ============================================================================
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    root.RSF = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 基础工具
  // ---------------------------------------------------------------------------
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /** 反双曲正弦 asinh(x) = ln(x + √(x²+1))（兼容旧环境）。 */
  function asinh(x) { return Math.log(x + Math.sqrt(x * x + 1)); }

  /** 状态演化律字典。签名：(V, θ, Dc, extra) -> dθ/dt。extra 含 { b, c, dmu_dt }。 */
  var StateLaws = {
    aging: function (V, theta, Dc) {
      return 1 - (V * theta) / Dc;
    },
    slip: function (V, theta, Dc) {
      var p = (V * theta) / Dc;
      if (p <= 0) return 0;               // lim_{p->0+} -p·ln(p) = 0
      return -p * Math.log(p);
    },
    prz: function (V, theta, Dc) {
      var p = (V * theta) / (2 * Dc);
      return 1 - p * p;
    },
    nagata: function (V, theta, Dc, extra) {
      extra = extra || {};
      var b = extra.b || 1;
      var c = extra.c || 0;
      var dmu_dt = extra.dmu_dt || 0;
      return 1 - (V * theta) / Dc - (c / b) * theta * dmu_dt;
    }
  };

  var LAW_LABELS = {
    aging: 'Dieterich 老化律 (aging)',
    slip: 'Ruina 滑移律 (slip)',
    prz: 'Perrin-Rice-Zheng (PRZ)',
    nagata: 'Nagata 修正律'
  };

  /**
   * 将加载点速度规格统一为函数 t -> V。
   * 支持：数字（恒定）、函数、[[t0,v0],[t1,v1],...]（分段常值，按时间排序）。
   */
  function makeVelocityFunction(spec) {
    if (typeof spec === 'function') return spec;
    if (typeof spec === 'number') return function () { return spec; };
    if (Array.isArray(spec)) {
      var sorted = spec.slice().sort(function (a, b) { return a[0] - b[0]; });
      return function (t) {
        var v = sorted.length ? sorted[0][1] : 0;
        for (var i = 0; i < sorted.length; i++) {
          if (t >= sorted[i][0]) v = sorted[i][1]; else break;
        }
        return v;
      };
    }
    throw new Error('rsf.js: 无法识别的加载点速度规格 (应为数字 / 函数 / [[时间,速度],...])');
  }

  /**
   * 将加载点速度规格转化为"加载点位移"函数 t -> u_lp(t) = ∫₀ᵗ Vlp ds。
   * 支持：数字（解析 u=V·t）、分段数组（解析分段线性）、函数（数值辛普森积分）。
   */
  function makeDisplacementFunction(spec) {
    if (typeof spec === 'number') {
      return function (t) { return spec * t; };
    }
    if (Array.isArray(spec)) {
      var sorted = spec.slice().sort(function (a, b) { return a[0] - b[0]; });
      var breaks = sorted.map(function (p) { return p[0]; });
      var vel = sorted.map(function (p) { return p[1]; });
      var cum = [0];
      for (var i = 1; i < breaks.length; i++) {
        cum.push(cum[i - 1] + vel[i - 1] * (breaks[i] - breaks[i - 1]));
      }
      return function (t) {
        if (t <= breaks[0]) return vel[0] * t;
        var seg = 0;
        for (var k = 1; k < breaks.length; k++) { if (t >= breaks[k]) seg = k; else break; }
        return cum[seg] + vel[seg] * (t - breaks[seg]);
      };
    }
    if (typeof spec === 'function') {
      return function (t) { return simpson(spec, 0, t, 200); };
    }
    throw new Error('rsf.js: 无法识别的加载点速度规格');
  }

  // ---------------------------------------------------------------------------
  // 自适应 Cash-Karp RK45 求解器 (4/5 阶嵌入龙格-库塔)
  // ---------------------------------------------------------------------------
  var CK = {
    c2: 1 / 5, c3: 3 / 10, c4: 3 / 5, c5: 1, c6: 7 / 8,
    a21: 1 / 5,
    a31: 3 / 40, a32: 9 / 40,
    a41: 3 / 10, a42: -9 / 10, a43: 6 / 5,
    a51: -11 / 54, a52: 5 / 2, a53: -70 / 27, a54: 35 / 27,
    a61: 1631 / 55296, a62: 175 / 512, a63: 575 / 13824, a64: 44275 / 110592, a65: 253 / 4096,
    b5: [2825 / 27648, 0, 18575 / 48384, 13525 / 55296, 277 / 14336, 1 / 4], // 5 阶（用于推进）
    b4: [37 / 378, 0, 250 / 621, 125 / 594, 0, 512 / 1771]                     // 4 阶（用于误差）
  };

  /**
   * 积分初值问题 dy/dt = f(t,y)，返回所有被接受步上的 {t, y}。
   * options: { rtol, atol, h0, hmax, hmin, maxSteps }
   */
  function integrate(f, y0, t0, t1, options) {
    options = options || {};
    var rtol = options.rtol != null ? options.rtol : 1e-9;
    var atol = options.atol != null ? options.atol : 1e-11;
    var hmax = options.hmax != null ? options.hmax : Math.abs(t1 - t0);
    var hmin = options.hmin != null ? options.hmin : Math.abs(t1 - t0) * 1e-12;
    var maxSteps = options.maxSteps || 20000000;

    var n = y0.length;
    var t = t0;
    var y = y0.slice();
    var h = options.h0 || (Math.abs(t1 - t0) / 1000);
    if (h === 0) h = Math.abs(t1 - t0) / 1000;
    var dir = t1 > t0 ? 1 : -1;
    h = Math.abs(h) * dir;

    var ts = [t0];
    var ys = [y0.slice()];
    var steps = 0;

    function axpy(base, scale, k) {
      var out = new Array(n);
      for (var i = 0; i < n; i++) out[i] = base[i] + scale * k[i];
      return out;
    }

    while ((t1 - t) * dir > 0 && steps < maxSteps) {
      if (Math.abs(h) > Math.abs(t1 - t)) h = t1 - t;
      if (h === 0) break;

      var k1 = f(t, y);
      var k2 = f(t + CK.c2 * h, axpy(y, CK.a21 * h, k1));
      var k3 = f(t + CK.c3 * h, axpy(axpy(y, CK.a31 * h, k1), CK.a32 * h, k2));
      var k4 = f(t + CK.c4 * h, axpy(axpy(axpy(y, CK.a41 * h, k1), CK.a42 * h, k2), CK.a43 * h, k3));
      var k5 = f(t + CK.c5 * h, axpy(axpy(axpy(axpy(y, CK.a51 * h, k1), CK.a52 * h, k2), CK.a53 * h, k3), CK.a54 * h, k4));
      var k6 = f(t + CK.c6 * h, axpy(axpy(axpy(axpy(axpy(y, CK.a61 * h, k1), CK.a62 * h, k2), CK.a63 * h, k3), CK.a64 * h, k4), CK.a65 * h, k5));

      var y5 = new Array(n);
      var y4 = new Array(n);
      var err = 0;
      for (var i = 0; i < n; i++) {
        y5[i] = y[i] + h * (CK.b5[0] * k1[i] + CK.b5[2] * k3[i] + CK.b5[3] * k4[i] + CK.b5[4] * k5[i] + CK.b5[5] * k6[i]);
        y4[i] = y[i] + h * (CK.b4[0] * k1[i] + CK.b4[2] * k3[i] + CK.b4[3] * k4[i] + CK.b4[5] * k6[i]);
        var e = Math.abs(y5[i] - y4[i]);
        var sc = atol + rtol * Math.max(Math.abs(y[i]), Math.abs(y5[i]));
        var ei = e / sc;
        if (ei > err) err = ei;
      }

      var accept = err <= 1.0;
      var factor;
      if (err === 0) factor = 5;
      else factor = 0.9 * Math.pow(err, -0.2);
      factor = clamp(factor, 0.2, 5.0);
      var hnew = h * factor;

      if (accept || Math.abs(h) <= hmin) {
        // 接受该步（若步长已到下限则强制接受，保证推进）
        t += h;
        y = y5;
        ts.push(t);
        ys.push(y.slice());
      }
      // 控制步长
      h = hnew;
      if (Math.abs(h) > hmax) h = hmax * dir;
      if (Math.abs(h) < hmin) h = hmin * dir;
      steps++;
    }

    return { t: ts, y: ys, steps: steps };
  }

  // ---------------------------------------------------------------------------
  // RateStateFriction —— RSF 本构律（与加载系统无关）
  // ---------------------------------------------------------------------------
  /**
   * @param {Object} p
   *   mu0 : 参考摩擦系数 (默认 0.6)
   *   a   : 直接效应系数 (默认 0.005)
   *   V0  : 参考速度 m/s (默认 1e-6)
   *   states : 状态变量数组 [{ b, Dc, law, c }] (默认 [{b:0.01,Dc:1e-5,law:'aging'}])
   */
  function RateStateFriction(p) {
    p = p || {};
    this.mu0 = p.mu0 != null ? p.mu0 : 0.6;
    this.a = p.a != null ? p.a : 0.005;
    this.V0 = p.V0 != null ? p.V0 : 1e-6;
    // 单状态便捷写法：允许顶层 b / Dc / law（等价于 states:[{b,Dc,law}]）
    if (!p.states && (p.b != null || p.Dc != null || p.law != null)) {
      this.states = [{ b: p.b != null ? p.b : 0.01, Dc: p.Dc != null ? p.Dc : 1e-5, law: p.law || 'aging', c: p.c || 0 }];
    } else {
      this.states = p.states || [{ b: 0.01, Dc: 1e-5, law: 'aging' }];
    }
    this.states = this.states.map(function (s) {
      return {
        b: s.b != null ? s.b : 0.01,
        Dc: s.Dc != null ? s.Dc : 1e-5,
        law: s.law || 'aging',
        c: s.c || 0
      };
    });
    this.sumB = this.states.reduce(function (acc, s) { return acc + s.b; }, 0);
  }

  /** 单个状态变量在摩擦律中的 ln 自变量 (V₀·θ/Dc，PRZ 为 V₀·θ/(2Dc))。 */
  RateStateFriction.prototype._stateLogArg = function (state, theta) {
    var denom = (state.law === 'prz') ? (2 * state.Dc) : state.Dc;
    return (this.V0 * theta) / denom;
  };

  /** 状态变量对摩擦系数的贡献 Σ b·ln(...)。 */
  RateStateFriction.prototype._stateContribution = function (thetas) {
    var contrib = 0;
    for (var i = 0; i < this.states.length; i++) {
      var arg = this._stateLogArg(this.states[i], thetas[i]);
      contrib += this.states[i].b * Math.log(arg);
    }
    return contrib;
  };

  /** 稳态状态变量 θ_ss(V) = Dc/V（PRZ 为 2Dc/V）。 */
  RateStateFriction.prototype.thetaSS = function (V, stateIndex) {
    var s = this.states[stateIndex || 0];
    var f = (s.law === 'prz') ? 2 : 1;
    return (f * s.Dc) / V;
  };

  /** 正向本构：由速度与状态求摩擦系数 μ(V,θ)。要求 V>0。 */
  RateStateFriction.prototype.mu = function (V, thetas) {
    if (V <= 0) throw new Error('rsf.js: 速度 V 必须 > 0');
    thetas = thetas || this.states.map(function (s) { return this.thetaSS(this.V0, 0); }.bind(this));
    return this.mu0 + this.a * Math.log(V / this.V0) + this._stateContribution(thetas);
  };

  /** 反解：由摩擦系数与状态求速度 V(μ,θ)。 */
  RateStateFriction.prototype.velocity = function (mu, thetas) {
    var exponent = (mu - this.mu0 - this._stateContribution(thetas)) / this.a;
    exponent = clamp(exponent, -700, 700);
    return this.V0 * Math.exp(exponent);
  };

  /**
   * 正则化摩擦系数（Ran jith & Rice 1999），用于含惯性的动力粘滑仿真：
   *   μ = a·arcsinh( (|V|/(2V₀)) · exp( (μ₀ + Σb·ln(V₀θ/Dc)) / a ) )
   * 在 |V|→0 时 μ→0（光滑有界，避免 log 律 V→0 发散）；对实际速度与
   * 原始 log 律 μ₀ + a·ln(V/V₀) + Σb·ln(V₀θ/Dc) 几乎完全一致。
   */
  RateStateFriction.prototype.muRegularized = function (V, thetas) {
    var stateMu = this.mu0 + this._stateContribution(thetas);
    var av = Math.abs(V);
    if (av === 0) return 0;
    // ln(z) = ln(av/(2V₀)) + stateMu/a，用对数形式避免 exp 溢出
    var lnz = Math.log(av / (2 * this.V0)) + stateMu / this.a;
    if (lnz > 20) {
      // 大 z：asinh(z) ≈ ln(2z)，直接退化为原始 log 律
      return this.a * (Math.LN2 + lnz);
    }
    var z = Math.exp(lnz);
    return this.a * asinh(z);
  };

  /** 稳态摩擦系数 μ_ss(V) = μ₀ + (a - Σb)·ln(V/V₀)。 */
  RateStateFriction.prototype.muSS = function (V) {
    return this.mu0 + (this.a - this.sumB) * Math.log(V / this.V0);
  };

  /** 静摩擦系数 μ_s(θ) = μ₀ + Σ b·ln(V₀θ/Dc)（单状态；静止愈合的峰值摩擦）。 */
  RateStateFriction.prototype.staticMu = function (theta) {
    return this.mu0 + this._stateContribution([theta]);
  };

  /**
   * 静态愈合曲线：静止保持 Δt 秒后（θ = θ₀ + Δt，老化律），静摩擦
   * μ_s(Δt) = μ₀ + Σ b·ln(V₀(θ₀+Δt)/Dc)。返回 holdTimes 对应的 μ_s 数组。
   */
  RateStateFriction.prototype.healingCurve = function (holdTimes, theta0) {
    var th0 = theta0 != null ? theta0 : this.thetaSS(this.V0, 0);
    return holdTimes.map(function (dt) {
      return this.staticMu(th0 + dt);
    }.bind(this));
  };

  /** 稳态摩擦力 F_ss(V) = μ_ss(V)·N。 */
  RateStateFriction.prototype.steadyStateForce = function (V, normalForce) {
    return this.muSS(V) * normalForce;
  };

  /** 瞬时摩擦力 F = μ(V,θ)·N。 */
  RateStateFriction.prototype.frictionForce = function (V, thetas, normalForce) {
    return this.mu(V, thetas) * normalForce;
  };

  /** 瞬时摩擦剪应力 τ = μ(V,θ)·σₙ。 */
  RateStateFriction.prototype.frictionStress = function (V, thetas, sigmaN) {
    return this.mu(V, thetas) * sigmaN;
  };

  /** 临界刚度 k_crit = N·(Σb - a)/Dc（单状态用第一个 Dc）。 */
  RateStateFriction.prototype.criticalStiffness = function (normalForce) {
    return (normalForce * (this.sumB - this.a)) / this.states[0].Dc;
  };

  /** 稳定性分析：返回 { weakening, stickSlip, kcrit, message }。 */
  RateStateFriction.prototype.stability = function (normalForce, kPhys) {
    var ab = this.a - this.sumB;
    var weakening = ab < 0;
    var kcrit = this.criticalStiffness(normalForce);
    var stickSlip = weakening && (kPhys < kcrit);
    var message;
    if (!weakening) {
      message = '速度强化 (a-b ≥ 0)：稳定滑动，不发生粘滑';
    } else if (stickSlip) {
      message = '速度弱化 (a-b < 0) 且 k < k_crit：将发生粘滑 (stick-slip)';
    } else {
      message = '速度弱化 (a-b < 0) 但 k ≥ k_crit：稳定滑动';
    }
    return { weakening: weakening, stickSlip: stickSlip, kcrit: kcrit, ab: ab, message: message };
  };

  /** 以给定速度历史积分纯本构状态演化（用于速度阶跃 / 愈合演示），返回 {t, mu, theta}。 */
  RateStateFriction.prototype.imposedVelocityResponse = function (velocitySpec, totalTime, options) {
    options = options || {};
    var vfunc = makeVelocityFunction(velocitySpec);
    var ns = this.states.length;
    var theta0 = options.theta0 || this.states.map(function (s) {
      return this.thetaSS(vfunc(0), 0);
    }.bind(this));

    var self = this;
    var deriv = function (t, thetas) {
      var V = vfunc(t);
      var d = new Array(ns);
      for (var i = 0; i < ns; i++) {
        var s = self.states[i];
        d[i] = StateLaws[s.law](V, thetas[i], s.Dc, { b: s.b, c: s.c, dmu_dt: 0 });
      }
      return d;
    };

    var res = integrate(deriv, theta0, 0, totalTime, options);
    var muArr = new Array(res.t.length);
    for (var k = 0; k < res.t.length; k++) {
      muArr[k] = this.mu(vfunc(res.t[k]), res.y[k]);
    }
    return { t: res.t, mu: muArr, theta: res.y };
  };

  // ---------------------------------------------------------------------------
  // SpringBlockSlider —— 准静态弹簧-滑块加载系统（复现粘滑）
  // ---------------------------------------------------------------------------
  /**
   * @param {Object} p
   *   RSF 参数: mu0, a, V0, states
   *   N      : 法向力 (N)；若给定 sigmaN 与 area 则 N = sigmaN*area
   *   sigmaN : 正应力 (Pa)
   *   area   : 接触面积 (m²)
   *   k      : 加载系统物理刚度 (N/m)；若省略则用 kNorm（归一化刚度 1/m）
   *   kNorm  : 归一化刚度 (1/m) = k / N（对齐 rsfmodel 的约定）
   *   Vlp    : 加载点速度 (m/s)，可为数字/函数/分段数组
   *   初值   : mu0init, theta0init (默认稳态)
   */
  function SpringBlockSlider(p) {
    p = p || {};
    this.friction = new RateStateFriction(p);
    this.N = p.N != null ? p.N : (p.sigmaN != null && p.area != null ? p.sigmaN * p.area : 1000);
    this.sigmaN = p.sigmaN != null ? p.sigmaN : null;
    this.area = p.area != null ? p.area : (this.sigmaN != null ? this.N / this.sigmaN : null);

    if (p.kNorm != null) {
      this.kNorm = p.kNorm;
      this.k = this.kNorm * this.N;
    } else if (p.k != null) {
      this.k = p.k;
      this.kNorm = this.k / this.N;
    } else {
      this.k = 1e5;
      this.kNorm = this.k / this.N;
    }

    this.Vlp = makeVelocityFunction(p.Vlp != null ? p.Vlp : 1e-6);
    this.t = p.t0 || 0;
    this.mu = p.mu0init != null ? p.mu0init : this.friction.mu0;
    this.thetas = p.theta0init ? p.theta0init.slice()
      : this.friction.states.map(function (s) { return this.friction.thetaSS(this.Vlp(0), 0); }.bind(this));
    // 滑块位移初始化为 0
    this.x = p.x0 || 0;
  }

  /** 当前速度（由 μ、θ 反解）。 */
  SpringBlockSlider.prototype.velocity = function () {
    return this.friction.velocity(this.mu, this.thetas);
  };

  /** ODE 右端：状态向量 y = [μ, θ₁, θ₂, ...]。 */
  SpringBlockSlider.prototype.derivatives = function (t, y) {
    var ns = this.friction.states.length;
    var mu = y[0];
    var thetas = y.slice(1);
    var V = this.friction.velocity(mu, thetas);
    var Vlp = this.Vlp(t);
    var dmu = this.kNorm * (Vlp - V);

    var d = new Array(1 + ns);
    d[0] = dmu;
    for (var i = 0; i < ns; i++) {
      var s = this.friction.states[i];
      d[1 + i] = StateLaws[s.law](V, thetas[i], s.Dc, { b: s.b, c: s.c, dmu_dt: dmu });
    }
    return d;
  };

  /** 单步推进（可连续调用）。 */
  SpringBlockSlider.prototype.step = function (dt) {
    var y0 = [this.mu].concat(this.thetas);
    var res = integrate(this.derivatives.bind(this), y0, this.t, this.t + dt, { hmax: dt, rtol: 1e-9, atol: 1e-11 });
    var last = res.y[res.y.length - 1];
    this.mu = last[0];
    this.thetas = last.slice(1);
    this.t += dt;
    // 位移 = ∫V dt
    this.x += this.velocity() * dt;
    return this.getState();
  };

  /** 运行仿真至 tEnd，返回完整时间序列。 */
  SpringBlockSlider.prototype.run = function (tEnd, options) {
    options = options || {};
    var y0 = [this.mu].concat(this.thetas);
    var res = integrate(this.derivatives.bind(this), y0, this.t, tEnd, options);

    var n = res.t.length;
    var ns = this.friction.states.length;
    var out = {
      t: res.t,
      mu: new Array(n),
      theta: new Array(ns),
      velocity: new Array(n),
      frictionForce: new Array(n),
      springForce: new Array(n),
      loadpointVelocity: new Array(n),
      loadpointDisplacement: new Array(n),
      sliderDisplacement: new Array(n)
    };
    for (var s = 0; s < ns; s++) out.theta[s] = new Array(n);

    for (var i = 0; i < n; i++) {
      var mu = res.y[i][0];
      var thetas = res.y[i].slice(1);
      var V = this.friction.velocity(mu, thetas);
      out.mu[i] = mu;
      for (var s2 = 0; s2 < ns; s2++) out.theta[s2][i] = thetas[s2];
      out.velocity[i] = V;
      out.frictionForce[i] = mu * this.N;
      out.loadpointVelocity[i] = this.Vlp(res.t[i]);
    }

    // 加载点位移 = ∫Vlp dt，滑块位移 = ∫V dt（累积梯形积分），弹簧力 = k·(加载点位移 - 滑块位移)
    out.loadpointDisplacement[0] = 0;
    out.sliderDisplacement[0] = 0;
    out.springForce[0] = 0;
    for (var j = 1; j < n; j++) {
      var dtj = out.t[j] - out.t[j - 1];
      out.loadpointDisplacement[j] = out.loadpointDisplacement[j - 1] +
        0.5 * (out.loadpointVelocity[j - 1] + out.loadpointVelocity[j]) * dtj;
      out.sliderDisplacement[j] = out.sliderDisplacement[j - 1] +
        0.5 * (out.velocity[j - 1] + out.velocity[j]) * dtj;
      out.springForce[j] = this.k * (out.loadpointDisplacement[j] - out.sliderDisplacement[j]);
    }

    // 更新到末态
    this.t = tEnd;
    this.mu = res.y[n - 1][0];
    this.thetas = res.y[n - 1].slice(1);
    this.x = out.sliderDisplacement[n - 1];
    return out;
  };

  SpringBlockSlider.prototype._loadpointDisplacement = function (t) {
    // 分段常值速度的加载点位移（梯形）。直接积分函数即可，但这里用累积近似。
    // 简单起见：对常数/分段常值速度，加载点位移 = ∫₀ᵗ Vlp dt。
    // 这里用高精度数值积分（200 点辛普森）。
    return simpson(this.Vlp, 0, t, 200);
  };

  /** 当前状态摘要。 */
  SpringBlockSlider.prototype.getState = function () {
    var V = this.velocity();
    return {
      t: this.t,
      mu: this.mu,
      velocity: V,
      theta: this.thetas.slice(),
      frictionForce: this.mu * this.N,
      springForce: this.k * (this._loadpointDisplacement(this.t) - this.x)
    };
  };

  // 数值积分工具：辛普森求 ∫₀ᵗ f(x) dx
  function simpson(f, a, b, n) {
    if (n % 2 === 1) n++;
    var h = (b - a) / n;
    var s = f(a) + f(b);
    for (var i = 1; i < n; i++) {
      s += (i % 2 === 0 ? 2 : 4) * f(a + i * h);
    }
    return (s * h) / 3;
  }

  // ---------------------------------------------------------------------------
  // StickSlipSlider —— 准动力弹簧-滑块（显式黏/滑状态机，复现粘滑 stick-slip）
  // ---------------------------------------------------------------------------
  /**
   * 准动力 (quasi-dynamic) 弹簧-滑块模型（Rice 1993；EQcycle / RSF_solvers 同类）：
   * 忽略惯性、保留辐射阻尼 η（默认 η = N/(2·c_s)，c_s 为剪切波速），
   * 以显式"黏着/滑动"状态机复现有界的锯齿形粘滑循环。
   *
   *   黏着(stick)阶段：v = 0，θ 按老化律愈合 (dθ/dt = 1)，静摩擦
   *     μ_s(θ) = μ₀ + b·ln(V₀θ/Dc) 随静止时间对数增长；弹簧力 k(u_lp-x)
   *     线性加载；当弹簧力 ≥ μ_s(θ)·N 时触发滑动。
   *   滑动(slip)阶段：准动力力平衡
   *     k(u_lp-x) = μ(v,θ)·N + η·v ,  μ(v,θ) = μ₀ + a·ln(v/V₀) + b·ln(V₀θ/Dc)
   *     反解滑移速度 v（对数空间牛顿法），并积分 dx/dt = v、dθ/dt = 1 - vθ/Dc；
   *     当 v 降至阈值 vEps 以下且弹簧力低于静摩擦时重新黏着。
   *
   * @param {Object} p  RSF 参数同 SpringBlockSlider，另加：
   *   cs   : 剪切波速 (m/s, 默认 3000)，辐射阻尼 η = N/(2cs)
   *   eta  : 直接指定辐射阻尼 (N·s/m)，覆盖 cs；η 越大滑移越慢/越易分辨
   *   vEps : 黏着判定速度阈值 (m/s，默认 Vlp(0)·1e-3)
   *   初值 : x0, theta0init
   */
  function StickSlipSlider(p) {
    p = p || {};
    this.friction = new RateStateFriction(p);
    this.N = p.N != null ? p.N : (p.sigmaN != null && p.area != null ? p.sigmaN * p.area : 1000);
    this.sigmaN = p.sigmaN != null ? p.sigmaN : null;
    this.area = p.area != null ? p.area : (this.sigmaN != null ? this.N / this.sigmaN : null);
    this.k = p.k != null ? p.k : 1e5;
    this.cs = p.cs != null ? p.cs : 3000;
    this.eta = p.eta != null ? p.eta : this.N / (2 * this.cs);
    this.Vlp = makeVelocityFunction(p.Vlp != null ? p.Vlp : 1e-6);
    this.uLp = makeDisplacementFunction(p.Vlp != null ? p.Vlp : 1e-6);
    this.Vlp0 = this.Vlp(0);
    this.vEps = p.vEps != null ? p.vEps : this.Vlp0 * 1e-3;
    this.t = p.t0 || 0;
    this.x = p.x0 || 0;
    this.v = 0;
    this.theta = p.theta0init != null ? p.theta0init : this.friction.thetaSS(this.Vlp0, 0);
    this.phase = 'stick';
  }

  /** 静摩擦系数 μ_s(θ) = μ₀ + Σ b·ln(V₀θ/Dc)（黏着阶段的峰值摩擦）。 */
  StickSlipSlider.prototype.staticMu = function (theta) {
    return this.friction.mu0 + this.friction._stateContribution([theta]);
  };

  /** 滑动摩擦系数 μ(v,θ)（v>0 的对数律，含 v→0 保护）。 */
  StickSlipSlider.prototype.slidingMu = function (v, theta) {
    if (!(v > 0)) v = 1e-300;
    return this.friction.mu0 + this.friction.a * Math.log(v / this.friction.V0) +
      this.friction._stateContribution([theta]);
  };

  /** 准动力力平衡反解滑移速度 v：k(u_lp-x) = μ(v,θ)·N + η·v（对数空间牛顿法）。 */
  StickSlipSlider.prototype.solveV = function (t, x, theta) {
    var V0 = this.friction.V0, mu0 = this.friction.mu0, a = this.friction.a;
    var stateMu = mu0 + this.friction._stateContribution([theta]); // μ₀ + b·ln(V₀θ/Dc)
    var target = this.k * (this.uLp(t) - x);
    // 解 G(w) = η·e^w + [stateMu + a·(w - ln V₀)]·N - target = 0，w = ln v
    var w = this.v > 0 ? Math.log(this.v) : Math.log(Math.max(this.Vlp(t), 1e-12));
    for (var it = 0; it < 80; it++) {
      var vv = Math.exp(w);
      var G = this.eta * vv + (stateMu + a * (w - Math.log(V0))) * this.N - target;
      var Gp = this.eta * vv + a * this.N;
      var dw = G / Gp;
      w -= dw;
      if (Math.abs(dw) < 1e-13) break;
    }
    var v = Math.exp(w);
    if (!(v > 0) || v === Infinity || v !== v) v = 1e-30;
    return v;
  };

  /** 滑动阶段 ODE 右端：[x, θ] -> [dx/dt, dθ/dt]。 */
  StickSlipSlider.prototype.slipDeriv = function (t, y) {
    var x = y[0], theta = y[1];
    var v = this.solveV(t, x, theta);
    var s = this.friction.states[0];
    var dTheta = StateLaws[s.law](v, theta, s.Dc, { b: s.b, c: s.c, dmu_dt: 0 });
    return [v, dTheta];
  };

  /** 运行仿真至 tEnd，返回时间序列与滑移事件摘要。 */
  StickSlipSlider.prototype.run = function (tEnd, options) {
    options = options || {};
    var nSamples = options.samples || 4000;
    var dtOut = (tEnd - this.t) / nSamples;
    var rtol = options.rtol != null ? options.rtol : 1e-8;
    var atol = options.atol != null ? options.atol : 1e-12;

    var out = {
      t: [], mu: [], velocity: [], frictionForce: [], springForce: [],
      theta: [], displacement: [], loadpointDisplacement: [], events: []
    };
    var self = this;

    function record() {
      var uLp = self.uLp(self.t);
      var spring = self.k * (uLp - self.x);
      var mu, fric;
      if (self.phase === 'stick') {
        fric = spring;               // 静摩擦平衡弹簧力
        mu = spring / self.N;        // 有效摩擦系数（随加载线性上升 → 锯齿）
      } else {
        mu = self.slidingMu(self.v, self.theta);
        fric = mu * self.N;
      }
      out.t.push(self.t);
      out.mu.push(mu);
      out.velocity.push(self.v);
      out.frictionForce.push(fric);
      out.springForce.push(spring);
      out.theta.push(self.theta);
      out.displacement.push(self.x);
      out.loadpointDisplacement.push(uLp);
    }

    record();
    var guard = 0;
    while (self.t < tEnd - 1e-15 && guard < 5000000) {
      guard++;
      var tNext = Math.min(self.t + dtOut, tEnd);

      if (self.phase === 'stick') {
        // 黏着：θ 愈合，x 不变；细分检查区间内是否触发滑动
        var slipAt = null;
        var sub = 40;
        var dtSub = (tNext - self.t) / sub;
        for (var i = 1; i <= sub; i++) {
          var tt = self.t + i * dtSub;
          var thetaAt = self.theta + (tt - self.t);          // dθ/dt = 1
          var Fth = self.staticMu(thetaAt) * self.N;
          var Fs = self.k * (self.uLp(tt) - self.x);
          if (Fs >= Fth) { slipAt = tt; break; }
        }
        if (slipAt != null) {
          self.theta += (slipAt - self.t);
          self.t = slipAt;
          record();                 // 记录滑动起始（μ 达峰值 μ_s）
          self.phase = 'slip';
          self.v = self.solveV(slipAt, self.x, self.theta);
          out.events.push({ tOnset: slipAt, muPeak: self.staticMu(self.theta),
                            springPeak: self.k * (self.uLp(slipAt) - self.x), xOnset: self.x });
        } else {
          self.theta += (tNext - self.t);
          self.t = tNext;
          record();
        }
      } else {
        // 滑动：积分 [x, θ] 至 tNext，检测重新黏着
        var y0 = [self.x, self.theta];
        var integ = integrate(function (tt, yy) { return self.slipDeriv(tt, yy); },
                              y0, self.t, tNext, { rtol: rtol, atol: atol, hmax: dtOut });
        var restick = -1;
        var ev = out.events[out.events.length - 1];
        var vMax = 0, muMin = Infinity;
        for (var j = 1; j < integ.t.length; j++) {
          var xj = integ.y[j][0], thj = integ.y[j][1];
          var vj = self.solveV(integ.t[j], xj, thj);
          if (vj > vMax) vMax = vj;
          var muj = self.slidingMu(vj, thj);
          if (muj < muMin) muMin = muj;
          var springJ = self.k * (self.uLp(integ.t[j]) - xj);
          if (vj < self.vEps && springJ < self.staticMu(thj) * self.N * 0.999) {
            restick = j; break;
          }
        }
        var lastIdx = restick >= 0 ? restick : integ.t.length - 1;
        self.x = integ.y[lastIdx][0];
        self.theta = integ.y[lastIdx][1];
        self.t = integ.t[lastIdx];
        if (restick >= 0) {
          self.v = 0;
          self.phase = 'stick';
          ev.tEnd = self.t;
          ev.slipDistance = self.x - ev.xOnset;
          ev.vPeak = vMax;
          ev.muMin = muMin === Infinity ? 0 : muMin;
          ev.stressDrop = (ev.muPeak - ev.muMin) * self.N;
          record();
        } else {
          self.v = self.solveV(self.t, self.x, self.theta);
          record();
        }
      }
    }

    this.t = self.t; this.x = self.x; this.v = self.v;
    this.theta = self.theta; this.phase = self.phase;
    return out;
  };

  /** 当前状态摘要。 */
  StickSlipSlider.prototype.getState = function () {
    var spring = this.k * (this.uLp(this.t) - this.x);
    var mu = this.phase === 'stick' ? spring / this.N : this.slidingMu(this.v, this.theta);
    return {
      t: this.t, phase: this.phase, displacement: this.x, velocity: this.v,
      mu: mu, theta: this.theta,
      frictionForce: this.phase === 'stick' ? spring : mu * this.N,
      springForce: spring
    };
  };

  // ---------------------------------------------------------------------------
  // 便捷实验函数
  // ---------------------------------------------------------------------------
  /**
   * 速度阶跃实验：V 从 V1 阶跃到 V2（时刻 tStep），返回 μ(t) 响应。
   * 直接效应 Δμ = a·ln(V2/V1)；总变化 Δμ_ss = (a-b)·ln(V2/V1)。
   */
  function velocityStepExperiment(p) {
    var fric = (p instanceof RateStateFriction) ? p : new RateStateFriction(p);
    var V1 = p.V1 != null ? p.V1 : fric.V0;
    var V2 = p.V2 != null ? p.V2 : fric.V0 * 10;
    var tStep = p.tStep != null ? p.tStep : 10;
    var totalTime = p.totalTime != null ? p.totalTime : 40;
    var spec = function (t) { return t < tStep ? V1 : V2; };
    var res = fric.imposedVelocityResponse(spec, totalTime, p);
    var directEffect = fric.a * Math.log(V2 / V1);
    var steadyChange = (fric.a - fric.sumB) * Math.log(V2 / V1);
    res.directEffect = directEffect;
    res.steadyChange = steadyChange;
    res.V1 = V1; res.V2 = V2; res.tStep = tStep;
    return res;
  }

  /**
   * 静态愈合（slide-hold-slide）实验：以速度 V 滑动 → 静止 ts 秒 → 再滑动，
   * 通过弹簧-滑块加载系统求解，返回 μ(t)、V(t)。演示摩擦随静止时间的对数增长。
   */
  function slideHoldSlideExperiment(p) {
    var V = p.V != null ? p.V : 1e-6;
    var tSlide = p.tSlide != null ? p.tSlide : 20;
    var tHold = p.tHold != null ? p.tHold : 100;
    var totalTime = p.totalTime != null ? p.totalTime : (tSlide + tHold + tSlide);
    var spec = [
      [0, V],
      [tSlide, 0],
      [tSlide + tHold, V]
    ];
    var slider = new SpringBlockSlider(p);
    slider.Vlp = makeVelocityFunction(spec);
    var res = slider.run(totalTime, p);
    res.spec = spec;
    return res;
  }

  // ---------------------------------------------------------------------------
  // 简单库仑摩擦辅助（对照用）
  // ---------------------------------------------------------------------------
  /** 简单库仑摩擦力 F = μ·N。 */
  function coulombForce(mu, normalForce) {
    return mu * normalForce;
  }

  // ---------------------------------------------------------------------------
  // 材质预设表（材质名 -> 摩擦参数）
  // ---------------------------------------------------------------------------
  /**
   * 每种材质包含：
   *   name : 中文名
   *   mu   : 库仑动摩擦系数（滑动，教科书参考值）
   *   muS  : 库仑静摩擦系数（静止，教科书参考值）
   *   岩石类额外含 RSF 参数 mu0 / a / b / Dc / V0（实验室标定典型值）。
   *
   * 说明：库仑 μ / μ_s 为常见工程材料干摩擦的教科书量级参考值；
   * RSF 参数为岩石摩擦实验（Dieterich、Marone 等）的典型量级。
   * 实际仿真应优先用实测/标定值替换这些参考值。
   */
  var materials = {
    // 岩石类（含 RSF 参数，computeFriction 自动走 RSF 模式）
    granite:      { name: '花岗岩（岩石）',      category: 'rock',    mu: 0.60, muS: 0.65, mu0: 0.60, a: 0.008, b: 0.012, Dc: 5e-6, V0: 1e-6 },
    sandstone:    { name: '砂岩（岩石）',        category: 'rock',    mu: 0.55, muS: 0.60, mu0: 0.60, a: 0.005, b: 0.010, Dc: 1e-5, V0: 1e-6 },
    limestone:    { name: '石灰岩（岩石）',      category: 'rock',    mu: 0.50, muS: 0.55, mu0: 0.55, a: 0.006, b: 0.009, Dc: 1e-5, V0: 1e-6 },
    gabbro:       { name: '辉长岩（岩石）',      category: 'rock',    mu: 0.62, muS: 0.68, mu0: 0.62, a: 0.008, b: 0.013, Dc: 1e-5, V0: 1e-6 },
    basalt:       { name: '玄武岩（岩石）',      category: 'rock',    mu: 0.60, muS: 0.65, mu0: 0.60, a: 0.006, b: 0.011, Dc: 1e-5, V0: 1e-6 },
    marble:       { name: '大理岩（岩石）',      category: 'rock',    mu: 0.55, muS: 0.60, mu0: 0.58, a: 0.007, b: 0.010, Dc: 1e-5, V0: 1e-6 },
    quartzite:    { name: '石英岩（岩石）',      category: 'rock',    mu: 0.62, muS: 0.68, mu0: 0.62, a: 0.008, b: 0.012, Dc: 5e-6, V0: 1e-6 },
    serpentinite: { name: '蛇纹岩（岩石）',      category: 'rock',    mu: 0.40, muS: 0.45, mu0: 0.40, a: 0.006, b: 0.014, Dc: 1e-5, V0: 1e-6 },
    shale:        { name: '页岩（岩石）',        category: 'rock',    mu: 0.42, muS: 0.50, mu0: 0.45, a: 0.005, b: 0.010, Dc: 1e-5, V0: 1e-6 },
    dolomite:     { name: '白云岩（岩石）',      category: 'rock',    mu: 0.55, muS: 0.60, mu0: 0.58, a: 0.006, b: 0.010, Dc: 1e-5, V0: 1e-6 },
    andesite:     { name: '安山岩（岩石）',      category: 'rock',    mu: 0.60, muS: 0.65, mu0: 0.60, a: 0.006, b: 0.011, Dc: 1e-5, V0: 1e-6 },
    gneiss:       { name: '片麻岩（岩石）',      category: 'rock',    mu: 0.62, muS: 0.68, mu0: 0.62, a: 0.008, b: 0.012, Dc: 1e-5, V0: 1e-6 },
    slate:        { name: '板岩（岩石）',        category: 'rock',    mu: 0.45, muS: 0.50, mu0: 0.48, a: 0.005, b: 0.010, Dc: 1e-5, V0: 1e-6 },
    talc:         { name: '滑石（岩石）',        category: 'rock',    mu: 0.15, muS: 0.20, mu0: 0.16, a: 0.005, b: 0.012, Dc: 1e-5, V0: 1e-6 },
    // 金属类（库仑模式）
    steel:        { name: '钢-钢（干）',         category: 'metal',   mu: 0.42, muS: 0.60 },
    aluminum:     { name: '铝-钢（干）',         category: 'metal',   mu: 0.45, muS: 0.55 },
    castiron:     { name: '铸铁-铸铁（干）',     category: 'metal',   mu: 0.20, muS: 0.30 },
    copper:       { name: '铜-钢（干）',         category: 'metal',   mu: 0.36, muS: 0.53 },
    brass:        { name: '黄铜-钢（干）',       category: 'metal',   mu: 0.44, muS: 0.51 },
    bronze:       { name: '青铜-钢（干）',       category: 'metal',   mu: 0.20, muS: 0.25 },
    nickel:       { name: '镍-钢（干）',         category: 'metal',   mu: 0.35, muS: 0.50 },
    titanium:     { name: '钛-钛（干）',         category: 'metal',   mu: 0.40, muS: 0.55 },
    magnesium:    { name: '镁-镁（干）',         category: 'metal',   mu: 0.35, muS: 0.45 },
    lead:         { name: '铅-钢（干）',         category: 'metal',   mu: 0.50, muS: 0.90 },
    zinc:         { name: '锌-铸铁（干）',       category: 'metal',   mu: 0.21, muS: 0.85 },
    stainless_steel: { name: '不锈钢-不锈钢（干）', category: 'metal', mu: 0.50, muS: 0.70 },
    tin:          { name: '锡-钢（干）',         category: 'metal',   mu: 0.40, muS: 0.60 },
    platinum:     { name: '铂-铂（干）',         category: 'metal',   mu: 0.40, muS: 0.50 },
    silver:       { name: '银-银（干）',         category: 'metal',   mu: 0.40, muS: 0.50 },
    gold:         { name: '金-金（干）',         category: 'metal',   mu: 0.40, muS: 0.50 },
    tungsten:     { name: '碳化钨-钢（干）',     category: 'metal',   mu: 0.45, muS: 0.55 },
    // 聚合物类（库仑模式）
    rubber:       { name: '橡胶-混凝土（干）',   category: 'polymer', mu: 0.80, muS: 0.90 },
    rubber_wet:   { name: '橡胶-混凝土（湿）',   category: 'polymer', mu: 0.25, muS: 0.30 },
    ptfe:         { name: '聚四氟乙烯(PTFE)-钢', category: 'polymer', mu: 0.05, muS: 0.06 },
    nylon:        { name: '尼龙-尼龙',           category: 'polymer', mu: 0.25, muS: 0.25 },
    polyethylene: { name: '聚乙烯(PE)-钢',       category: 'polymer', mu: 0.20, muS: 0.20 },
    polypropylene:{ name: '聚丙烯(PP)',          category: 'polymer', mu: 0.25, muS: 0.25 },
    pvc:          { name: '聚氯乙烯(PVC)',       category: 'polymer', mu: 0.40, muS: 0.45 },
    acrylic:      { name: '有机玻璃(PMMA)',      category: 'polymer', mu: 0.40, muS: 0.50 },
    polycarbonate:{ name: '聚碳酸酯(PC)',        category: 'polymer', mu: 0.35, muS: 0.40 },
    abs:          { name: 'ABS 塑料',            category: 'polymer', mu: 0.35, muS: 0.40 },
    pom:          { name: '聚甲醛(POM/赛钢)',    category: 'polymer', mu: 0.20, muS: 0.20 },
    peek:         { name: '聚醚醚酮(PEEK)',      category: 'polymer', mu: 0.40, muS: 0.45 },
    epoxy:        { name: '环氧树脂',             category: 'polymer', mu: 0.40, muS: 0.50 },
    polyurethane: { name: '聚氨酯(PU)',          category: 'polymer', mu: 0.50, muS: 0.60 },
    silicone:     { name: '硅橡胶',               category: 'polymer', mu: 0.40, muS: 0.50 },
    phenolic:     { name: '酚醛树脂',             category: 'polymer', mu: 0.35, muS: 0.45 },
    polystyrene:  { name: '聚苯乙烯(PS)',        category: 'polymer', mu: 0.35, muS: 0.45 },
    // 其他非金属（库仑模式）
    glass:        { name: '玻璃-玻璃（干）',     category: 'other',   mu: 0.90, muS: 0.95 },
    wood:         { name: '木材-木材',           category: 'other',   mu: 0.30, muS: 0.40 },
    concrete:     { name: '混凝土-混凝土',       category: 'other',   mu: 0.75, muS: 1.00 },
    ice:          { name: '冰-钢',               category: 'other',   mu: 0.03, muS: 0.10 },
    leather:      { name: '皮革-金属（干）',     category: 'other',   mu: 0.40, muS: 0.60 },
    paper:        { name: '纸-纸',               category: 'other',   mu: 0.30, muS: 0.50 },
    graphite:     { name: '石墨-石墨',           category: 'other',   mu: 0.10, muS: 0.10 },
    diamond:      { name: '钻石-钻石',           category: 'other',   mu: 0.10, muS: 0.10 },
    ceramic:      { name: '陶瓷(氧化铝)-钢',     category: 'other',   mu: 0.45, muS: 0.55 },
    asphalt:      { name: '沥青路面',             category: 'other',   mu: 0.80, muS: 0.90 },
    brick:        { name: '砖-木（干）',         category: 'other',   mu: 0.50, muS: 0.60 },
    cork:         { name: '软木-钢',             category: 'other',   mu: 0.30, muS: 0.35 },
    felt:         { name: '毛毡-钢',             category: 'other',   mu: 0.25, muS: 0.30 },
    silk:         { name: '丝绸-丝绸',           category: 'other',   mu: 0.30, muS: 0.40 }
  };

  /**
   * 便捷接口：由「材质 + 法向力 + 速度」三变量计算摩擦力（嵌入仿真实验用）。
   *
   * @param {string|Object} material 材质名（见 RSF.materials），或自定义参数对象
   *                                  { mu[, muS] } 库仑模式 / { mu0, a, b, Dc, V0 } RSF 模式
   * @param {number} normalForce 法向力 N (N)。也可省略并改用 opts.sigma × opts.area
   * @param {number} velocity 物体运动速度 V (m/s)，可为 0
   * @param {Object} opts
   *   mode  : 'rsf' | 'coulomb'（默认：材质含 RSF 参数时用 rsf，否则 coulomb）
   *   theta : RSF 模式的状态变量（默认稳态 Dc/V）
   *   sigma, area : 法向力 N = sigma(Pa) × area(m²) 的替代输入
   * @returns {Object} { material, mode, mu, frictionForce, muSS, steadyForce, ... }
   */
  function computeFriction(material, normalForce, velocity, opts) {
    opts = opts || {};
    var mat = (typeof material === 'string') ? materials[material] : material;
    if (!mat) {
      throw new Error('rsf.js: 未知材质 "' + material + '"（可用: ' + Object.keys(materials).join(', ') + '）');
    }

    var N = normalForce;
    if (N == null && opts.sigma != null && opts.area != null) N = opts.sigma * opts.area;
    if (N == null || !(N > 0)) {
      throw new Error('rsf.js: 需提供法向力 normalForce (>0)，或用 opts.sigma × opts.area');
    }
    var V = velocity != null ? velocity : 0;

    var useRSF = (opts.mode === 'rsf') || (opts.mode !== 'coulomb' && mat.mu0 != null);

    if (!useRSF) {
      var muK = mat.mu;
      var muS = mat.muS != null ? mat.muS : muK;
      if (V === 0) {
        return {
          material: mat.name, mode: 'coulomb', velocity: 0,
          mu: muS, frictionForce: muS * N, muKinetic: muK, muStatic: muS, maxStaticForce: muS * N,
          note: '物体静止：返回静摩擦上限 μ_s·N；实际摩擦力由外力平衡决定（≤ μ_s·N）'
        };
      }
      return {
        material: mat.name, mode: 'coulomb', velocity: V,
        mu: muK, frictionForce: muK * N, muKinetic: muK, muStatic: muS, maxStaticForce: muS * N,
        note: '库仑滑动摩擦 F = μ_k·N（与速度无关）'
      };
    }

    var f = new RateStateFriction({ mu0: mat.mu0, a: mat.a, b: mat.b, Dc: mat.Dc, V0: mat.V0 });
    var vEff = Math.max(V, 1e-12);
    var theta = opts.theta != null ? opts.theta : f.thetaSS(vEff, 0);
    var mu = f.mu(vEff, [theta]);
    var muSS = f.muSS(vEff);
    var weakening = (f.a - f.sumB) < 0;
    return {
      material: mat.name, mode: 'rsf', velocity: V,
      mu: mu, frictionForce: mu * N, muSS: muSS, steadyForce: muSS * N, theta: theta,
      weakening: weakening,
      note: 'RSF 模式 F = μ(V,θ)·N；' + (weakening ? '速度弱化 (a-b<0)，可能粘滑' : '速度强化 (a-b≥0)，稳定滑动')
    };
  }

  // ---------------------------------------------------------------------------
  // 预设参数
  // ---------------------------------------------------------------------------
  var presets = {
    rsfmodelDefault: { mu0: 0.6, a: 0.005, V0: 1e-6, states: [{ b: 0.01, Dc: 1e-5, law: 'aging' }] },
    stickSlipDemo: {
      mu0: 0.6, a: 0.005, V0: 1e-6, states: [{ b: 0.01, Dc: 1e-5, law: 'aging' }],
      N: 1000, k: 1e5, Vlp: 1e-4, cs: 3000
    },
    velocityStrengthening: { mu0: 0.6, a: 0.01, V0: 1e-6, states: [{ b: 0.005, Dc: 1e-5, law: 'aging' }] }
  };

  // ---------------------------------------------------------------------------
  // 导出
  // ---------------------------------------------------------------------------
  return {
    RateStateFriction: RateStateFriction,
    SpringBlockSlider: SpringBlockSlider,
    StickSlipSlider: StickSlipSlider,
    StateLaws: StateLaws,
    LAW_LABELS: LAW_LABELS,
    integrate: integrate,
    makeVelocityFunction: makeVelocityFunction,
    makeDisplacementFunction: makeDisplacementFunction,
    velocityStepExperiment: velocityStepExperiment,
    slideHoldSlideExperiment: slideHoldSlideExperiment,
    coulombForce: coulombForce,
    materials: materials,
    computeFriction: computeFriction,
    presets: presets,
    version: '1.1.0'
  };
}));
