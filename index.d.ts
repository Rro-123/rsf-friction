// rsf.js —— 速率-状态摩擦定律（Rate-and-State Friction, RSF）工具库
// TypeScript 类型定义（v1.1.0）

/** 状态演化律名称。 */
export type StateLaw = 'aging' | 'slip' | 'prz' | 'nagata';

/** 单个状态变量的演化律参数。 */
export interface StateSpec {
  b?: number;
  Dc?: number;
  law?: StateLaw;
  c?: number;
}

/** RateStateFriction / SpringBlockSlider / StickSlipSlider 共用的 RSF 参数。 */
export interface RateStateParams {
  mu0?: number;
  a?: number;
  V0?: number;
  /** 多状态演化律数组；省略时用单状态便捷写法 b / Dc / law / c。 */
  states?: StateSpec[];
  /** 单状态便捷写法：等价于 states: [{ b, Dc, law, c }]。 */
  b?: number;
  Dc?: number;
  law?: StateLaw;
  c?: number;
}

/** 加载点速度规格：数字（恒定）/ 函数 t->V / 分段常值数组 [[t0,v0],[t1,v1],...]。 */
export type VelocitySpec = number | ((t: number) => number) | Array<[number, number]>;

/** 状态演化律函数签名：(V, θ, Dc, extra) -> dθ/dt。 */
export interface StateLawFunction {
  (V: number, theta: number, Dc: number, extra?: { b?: number; c?: number; dmu_dt?: number }): number;
}

/** 状态演化律字典。 */
export const StateLaws: {
  aging: StateLawFunction;
  slip: StateLawFunction;
  prz: StateLawFunction;
  nagata: StateLawFunction;
};

/** ODE 积分选项。 */
export interface IntegrateOptions {
  rtol?: number;
  atol?: number;
  h0?: number;
  hmax?: number;
  hmin?: number;
  maxSteps?: number;
}

/** integrate() 返回的时间序列。 */
export interface IntegrateResult {
  t: number[];
  y: number[][];
  steps: number;
}

/** imposedVelocityResponse / velocityStepExperiment 返回的 μ(t) 响应。 */
export interface VelocityResponse {
  t: number[];
  mu: number[];
  theta: number[][];
}

/** 稳定性分析结果。 */
export interface StabilityResult {
  weakening: boolean;
  stickSlip: boolean;
  kcrit: number;
  ab: number;
  message: string;
}

// ---------------------------------------------------------------------------
// 类
// ---------------------------------------------------------------------------

/** RSF 本构律：由速度与状态求摩擦系数。 */
export class RateStateFriction {
  constructor(p?: RateStateParams);
  mu0: number;
  a: number;
  V0: number;
  states: StateSpec[];
  sumB: number;
  /** 稳态状态变量 θ_ss(V) = Dc/V（PRZ 为 2Dc/V）。 */
  thetaSS(V: number, stateIndex?: number): number;
  /** 正向本构 μ(V,θ)，要求 V > 0。 */
  mu(V: number, thetas?: number[]): number;
  /** 反解速度 V(μ,θ)。 */
  velocity(mu: number, thetas: number[]): number;
  /** 正则化摩擦（Ran jith & Rice 1999），|V|→0 时有界。 */
  muRegularized(V: number, thetas: number[]): number;
  /** 稳态摩擦系数 μ_ss(V) = μ₀ + (a−Σb)·ln(V/V₀)。 */
  muSS(V: number): number;
  /** 静摩擦系数 μ_s(θ)。 */
  staticMu(theta: number): number;
  /** 静态愈合曲线 μ_s(Δt)。 */
  healingCurve(holdTimes: number[], theta0?: number): number[];
  /** 稳态摩擦力 F_ss(V) = μ_ss(V)·N。 */
  steadyStateForce(V: number, normalForce: number): number;
  /** 瞬时摩擦力 F = μ(V,θ)·N。 */
  frictionForce(V: number, thetas: number[], normalForce: number): number;
  /** 瞬时摩擦剪应力 τ = μ(V,θ)·σₙ。 */
  frictionStress(V: number, thetas: number[], sigmaN: number): number;
  /** 临界刚度 k_crit = N·(Σb−a)/Dc。 */
  criticalStiffness(normalForce: number): number;
  /** 稳定性分析。 */
  stability(normalForce: number, kPhys: number): StabilityResult;
  /** 以给定速度历史积分状态演化，返回 μ(t) 响应。 */
  imposedVelocityResponse(velocitySpec: VelocitySpec, totalTime: number, options?: IntegrateOptions & { theta0?: number[] }): VelocityResponse;
}

/** 准静态弹簧-滑块参数。 */
export interface SpringBlockParams extends RateStateParams {
  N?: number;
  sigmaN?: number;
  area?: number;
  k?: number;
  kNorm?: number;
  Vlp?: VelocitySpec;
  mu0init?: number;
  theta0init?: number[];
  t0?: number;
  x0?: number;
}

/** 弹簧-滑块状态摘要。 */
export interface SpringBlockState {
  t: number;
  mu: number;
  velocity: number;
  theta: number[];
  frictionForce: number;
  springForce: number;
}

/** SpringBlockSlider.run() 返回的时间序列。 */
export interface SpringBlockResult {
  t: number[];
  mu: number[];
  theta: number[][];
  velocity: number[];
  frictionForce: number[];
  springForce: number[];
  loadpointVelocity: number[];
  loadpointDisplacement: number[];
  sliderDisplacement: number[];
}

/** 准静态弹簧-滑块加载系统。 */
export class SpringBlockSlider {
  constructor(p?: SpringBlockParams);
  velocity(): number;
  derivatives(t: number, y: number[]): number[];
  step(dt: number): SpringBlockState;
  run(tEnd: number, options?: IntegrateOptions): SpringBlockResult;
  getState(): SpringBlockState;
}

/** 粘滑事件摘要。 */
export interface StickSlipEvent {
  tOnset: number;
  muPeak: number;
  springPeak: number;
  xOnset: number;
  tEnd?: number;
  slipDistance?: number;
  vPeak?: number;
  muMin?: number;
  stressDrop?: number;
}

/** 准动力粘滑仿真参数。 */
export interface StickSlipParams extends RateStateParams {
  N?: number;
  sigmaN?: number;
  area?: number;
  k?: number;
  cs?: number;
  eta?: number;
  Vlp?: VelocitySpec;
  vEps?: number;
  x0?: number;
  theta0init?: number;
  t0?: number;
}

/** StickSlipSlider.run() 返回的时间序列与事件。 */
export interface StickSlipResult {
  t: number[];
  mu: number[];
  velocity: number[];
  frictionForce: number[];
  springForce: number[];
  theta: number[];
  displacement: number[];
  loadpointDisplacement: number[];
  events: StickSlipEvent[];
}

/** 准动力弹簧-滑块（显式黏/滑状态机，复现粘滑）。 */
export class StickSlipSlider {
  constructor(p?: StickSlipParams);
  staticMu(theta: number): number;
  slidingMu(v: number, theta: number): number;
  solveV(t: number, x: number, theta: number): number;
  slipDeriv(t: number, y: number[]): number[];
  run(tEnd: number, options?: { samples?: number; rtol?: number; atol?: number }): StickSlipResult;
  getState(): { t: number; phase: 'stick' | 'slip'; displacement: number; velocity: number; mu: number; theta: number; frictionForce: number; springForce: number };
}

// ---------------------------------------------------------------------------
// 函数
// ---------------------------------------------------------------------------

/** 自适应 Cash-Karp RK45 积分器。 */
export function integrate(f: (t: number, y: number[]) => number[], y0: number[], t0: number, t1: number, options?: IntegrateOptions): IntegrateResult;

/** 将加载点速度规格统一为函数 t -> V。 */
export function makeVelocityFunction(spec: VelocitySpec): (t: number) => number;

/** 将加载点速度规格转化为加载点位移函数 t -> u_lp(t)。 */
export function makeDisplacementFunction(spec: VelocitySpec): (t: number) => number;

/** 速度阶跃实验参数。 */
export interface VelocityStepParams extends RateStateParams {
  V1?: number;
  V2?: number;
  tStep?: number;
  totalTime?: number;
}

/** 速度阶跃实验返回。 */
export interface VelocityStepResult extends VelocityResponse {
  directEffect: number;
  steadyChange: number;
  V1: number;
  V2: number;
  tStep: number;
}

/** 速度阶跃实验：V 从 V1 阶跃到 V2，返回 μ(t) 响应。 */
export function velocityStepExperiment(p: VelocityStepParams): VelocityStepResult;

/** 静态愈合（slide-hold-slide）实验参数。 */
export interface SlideHoldSlideParams extends SpringBlockParams {
  V?: number;
  tSlide?: number;
  tHold?: number;
  totalTime?: number;
}

/** 静态愈合实验：滑动 → 静止 → 再滑动，返回 μ(t)、V(t)。 */
export function slideHoldSlideExperiment(p: SlideHoldSlideParams): SpringBlockResult;

/** 简单库仑摩擦力 F = μ·N。 */
export function coulombForce(mu: number, normalForce: number): number;

// ---------------------------------------------------------------------------
// 三变量便捷接口
// ---------------------------------------------------------------------------

/** 材质类别：岩石（含 RSF 参数）/ 金属 / 聚合物 / 其他非金属。 */
export type MaterialCategory = 'rock' | 'metal' | 'polymer' | 'other';

/** 材质参数对象（自定义材质或预设材质的结构）。 */
export interface MaterialSpec {
  name?: string;
  /** 材质类别（预设材质附带；自定义材质可省略）。 */
  category?: MaterialCategory;
  mu?: number;
  muS?: number;
  mu0?: number;
  a?: number;
  b?: number;
  Dc?: number;
  V0?: number;
}

/** computeFriction 选项。 */
export interface ComputeFrictionOptions {
  mode?: 'rsf' | 'coulomb';
  theta?: number;
  sigma?: number;
  area?: number;
}

/** computeFriction 返回结果。 */
export interface ComputeFrictionResult {
  material: string;
  mode: 'rsf' | 'coulomb';
  velocity: number;
  mu: number;
  frictionForce: number;
  muSS?: number;
  steadyForce?: number;
  theta?: number;
  weakening?: boolean;
  muKinetic?: number;
  muStatic?: number;
  maxStaticForce?: number;
  note?: string;
}

/** 三变量便捷接口：由「材质 + 法向力 + 速度」计算摩擦力。 */
export function computeFriction(material: string | MaterialSpec, normalForce: number | null, velocity?: number, opts?: ComputeFrictionOptions): ComputeFrictionResult;

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

/** 内置材质参数表（材质名 -> 参数）。 */
export const materials: Record<string, MaterialSpec>;

/** 预设参数。 */
export const presets: {
  rsfmodelDefault: RateStateParams;
  stickSlipDemo: StickSlipParams;
  velocityStrengthening: RateStateParams;
};

/** 状态演化律中文标签。 */
export const LAW_LABELS: Record<StateLaw, string>;

/** 库版本号。 */
export const version: string;
