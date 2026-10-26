// Adapted from 一笔江山 by 臻陌然, MIT. See THIRD-PARTY-NOTICES.md.

/* ===========================================================================
   一笔江山  ·  Ink Landscape
   笔迹 → 高程图 → 低多边形山水（Three.js r160）
   =========================================================================== */
import * as THREE from 'three';
import {placementHeight} from './ground.js?v=mist06';
import { OrbitControls } from './vendor/OrbitControls.js';

/* ============================ 一、可调参数 ============================ */
const SMALL = Math.min(innerWidth, innerHeight) < 820;

const CFG = {
  SEG:            SMALL ? 88 : 132,  // 地形网格分段数（越高越细腻，128~160 比较合适）
  WORLD:          62,                // 地形平面边长（世界单位）
  MAX_HEIGHT:     11.0,              // 山体最高点（相对值）
  SEA_FLOOR:      1.45,              // 水底相对水面（y=0）的深度
  BRUSH_RADIUS:   4.5,               // 笔刷影响半径
  BRUSH_SIGMA:    1.30,              // 高斯衰减 σ（越小山脊越锐利）
  INK:            0.33,              // 单位长度落墨量（越大山越高）
  RIDGE_POWER:    1.45,              // 高度曲线指数（越大山脊越陡）

  NOISE_AMP:      1.40,              // 山体噪声幅度
  NOISE_FREQ:     0.075,             // 山体噪声频率（基频）
  EDGE_POWER:     6,                 // 边缘回落的陡峭程度

  WATER_SIZE_K:   4.0,               // 水面尺寸 = WORLD × 该系数
  WAVE_SPEED:     0.85,              // 水波速度
  WAVE_AMP:       0.11,              // 水面几何起伏幅度
  DEPTH_MAX:      5.0,               // 水深编码上限

  TREES_MAX:      SMALL ? 60 : 120,  // 树木数量上限
  TREE_MIN_H:     0.75,              // 树木生长的最低海拔
  TREE_MAX_H:     6.0,               // 树木生长的最高海拔（以上露岩）
  TREE_MAX_SLOPE: 2.00,              // 最大坡度（山变陡后需放宽）
  PAVILION_MAX:   2,                 // 亭子数量

  MIST_COUNT:     SMALL ? 9 : 14,    // 雾气片数（少而大，才不会看出重复感）
  MIST_SPEED:     0.36,              // 雾气漂移速度

  AUTO_ROTATE:    0.85,              // 自动旋转速度（约 0.5~1 比较舒缓）
  GROW_DURATION:  1.15,              // 山体生长时长（秒）
  TRAIL_FADE:     0.9,               // 笔迹淡出时长（秒）

  PHI_DRAW:       0.10,              // 绘制时相机极角（接近俯视，画得准）
  PHI_VIEW:       1.20,              // 成景后相机极角（3/4 侧视，露一点天际）
  CAM_DURATION:   1.9                // 相机过渡时长
};

/* ============================ 二、小工具 ============================ */
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp  = (a, b, t) => a + (b - a) * t;
const smooth01 = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// 全局时间（主循环每帧推进）。声明放在这里：初始化阶段重建地形时就要用到它，
// 写在主循环那边会撞上 TDZ。
let nowT = 0;

// 确定性伪随机（保证每次刷新布局一致）
let _seed = 20260923;
function rnd() { _seed = (_seed * 1664525 + 1013904223) % 4294967296; return _seed / 4294967296; }

// 2D 值噪声 + fbm
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, y, oct) {
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) { sum += amp * vnoise(x * f, y * f); norm += amp; amp *= 0.5; f *= 2.03; }
  return sum / norm;
}

/* ============================ 三、渲染基础 ============================ */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('scene').appendChild(renderer.domElement);
renderer.domElement.id='world'; renderer.domElement.setAttribute('aria-label','按住绘制山脉，右键旋转的三维山水');

const scene = new THREE.Scene();

// 背景：宣纸渐变。色停由设置面板传入，最下一档同时用作雾色，
// 这样远处水面与天空无缝衔接。
function makeSky(stops) {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  stops.forEach(s => g.addColorStop(s[1], s[0]));
  ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const SKY_COLOR = 0xdde8ea;
scene.background = makeSky([
  ['#f6fafa', 0.00], ['#e9f1f3', 0.18], ['#dde8ea', 0.38], ['#dde8ea', 1.00]
]);
scene.fog = new THREE.Fog(SKY_COLOR, 36, 138);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 900);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.6, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minDistance = 26;
controls.maxDistance = 230;
controls.minPolarAngle = 0.10;
controls.maxPolarAngle = 1.46;
controls.autoRotate = false;
controls.autoRotateSpeed = CFG.AUTO_ROTATE;
// 左键留给"绘制"：旋转走右键 / 触摸双指
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };

// 视野适配：窄屏时把相机拉远
// R_DRAW 决定绘制时的可视范围（约 62×35 个世界单位，正好落在地形内），
// 这样"屏幕上的一笔"和"生成的山"位置完全对得上。
let R_DRAW = 42, R_VIEW = 48;
function updateCamDistance() {
  const a = innerWidth / innerHeight;
  // 太宽的屏幕上可视范围会超出地形，适当拉远把可视宽度压回 62 以内
  R_DRAW = Math.min(42, 74.9 / Math.max(a, 1));
  R_VIEW = Math.min(50, 88 / Math.max(a, 1));
}
updateCamDistance();

/* ------------------------------ 光照 ------------------------------ */
const hemi = new THREE.HemisphereLight(0xeef8ff, 0x8fae9f, 0.62);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfffbf2, 1.32);
sun.position.set(-46, 58, 30);          // 左上角来光
sun.castShadow = true;
sun.shadow.mapSize.set(SMALL ? 1024 : 2048, SMALL ? 1024 : 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 220;
sun.shadow.camera.left = -58; sun.shadow.camera.right = 58;
sun.shadow.camera.top = 58;  sun.shadow.camera.bottom = -58;
sun.shadow.bias = -0.0012;
sun.shadow.normalBias = 0.06;
scene.add(sun);

const fill = new THREE.DirectionalLight(0xdfeef2, 0.25);
fill.position.set(40, 26, -34);
scene.add(fill);

/* ============================ 四、地形 ============================ */
const N = CFG.SEG + 1;                    // 每边顶点数
const STEP = CFG.WORLD / CFG.SEG;
const HALF = CFG.WORLD / 2;
const FLOOR = -CFG.SEA_FLOOR;             // 水底高度

const landAcc  = new Float32Array(N * N); // 落墨累积量（0 起）
const heights  = new Float32Array(N * N).fill(FLOOR); // 地表最终高度
const growStart = new Float32Array(N * N).fill(1e9);  // 每个顶点的生长起始时刻

// 飞白场：笔毫含墨不匀 + 行笔涩滞。预计算一次，落墨时按格查表。
// 有了它，即便是匀速画一笔，也会自然起峰落谷，而不是砌出一道均匀的土墙。
const unevenField = new Float32Array(N * N);
for (let j = 0; j < N; j++) {
  for (let i = 0; i < N; i++) {
    const x = -HALF + i * STEP, z = -HALF + j * STEP;
    unevenField[j * N + i] =
      (0.52 + 0.62 * vnoise(x * 0.185 + 3.3, z * 0.185 - 1.7)) *
      (0.82 + 0.32 * vnoise(x * 0.550 - 8.1, z * 0.550 + 5.4));
  }
}

const terrainGeo = new THREE.PlaneGeometry(CFG.WORLD, CFG.WORLD, CFG.SEG, CFG.SEG);
terrainGeo.rotateX(-Math.PI / 2);
// 顶点索引 (j*N+i) 对应世界坐标 x=-HALF+i*STEP, z=-HALF+j*STEP（与 PlaneGeometry 顶点顺序一致）
terrainGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * N * 3), 3));
terrainGeo.setAttribute('aGrowStart', new THREE.BufferAttribute(growStart, 1));


const terrainMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,        // 低多边形质感
  roughness: 0.94,
  metalness: 0.0
});
// 顶点着色器注入：按 aGrowStart 从下往上"长"出来
terrainMat.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = { value: 0 };
  shader.uniforms.uGrowDur = { value: CFG.GROW_DURATION };
  shader.uniforms.uFloor = { value: FLOOR };
  shader.vertexShader =
    'attribute float aGrowStart;\nuniform float uTime;\nuniform float uGrowDur;\nuniform float uFloor;\n' +
    shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float g = clamp((uTime - aGrowStart) / uGrowDur, 0.0, 1.0);
      g = g * g * (3.0 - 2.0 * g);
      transformed.y = uFloor + (transformed.y - uFloor) * g;
    `);
  terrainMat.userData.shader = shader;
};

const terrain = new THREE.Mesh(terrainGeo, terrainMat);
terrain.castShadow = true;
terrain.receiveShadow = true;
terrain.frustumCulled = false;
scene.add(terrain);

// 高度 → 颜色（水墨层次：水底青灰 → 滩涂青绿 → 山腰墨绿 → 山巅灰白）
const RAMP = [
  [-1.45, new THREE.Color(0x2f4d55)],   // 水底（青灰）
  [-1.00, new THREE.Color(0x3d6165)],
  [ 0.00, new THREE.Color(0x6b9977)],   // 滩涂
  [ 0.90, new THREE.Color(0x54825f)],   // 低坡（重墨起笔）
  [ 2.60, new THREE.Color(0x55795f)],   // 山腰（墨绿）
  [ 4.60, new THREE.Color(0x6f8a74)],   // 上部（灰绿）
  [ 6.40, new THREE.Color(0x97a698)],   // 山脊（浅灰绿）
  [ 8.00, new THREE.Color(0xcbd3c8)],   // 近顶（灰白）
  [ 9.40, new THREE.Color(0xf2f5f0)]    // 峰顶（留白）
];
const _c = new THREE.Color();
function rampColor(y, out) {
  if (y <= RAMP[0][0]) return out.copy(RAMP[0][1]);
  for (let i = 1; i < RAMP.length; i++) {
    if (y <= RAMP[i][0]) {
      const t = (y - RAMP[i - 1][0]) / (RAMP[i][0] - RAMP[i - 1][0]);
      return out.copy(RAMP[i - 1][1]).lerp(RAMP[i][1], t);
    }
  }
  return out.copy(RAMP[RAMP.length - 1][1]);
}

// 供树木/亭子采样地表高度（双线性插值）
function surfaceAt(x, z) {
  const fx = (x + HALF) / STEP, fz = (z + HALF) / STEP;
  const i = Math.floor(fx), j = Math.floor(fz);
  if (i < 0 || j < 0 || i >= N - 1 || j >= N - 1) return FLOOR;
  const tx = fx - i, tz = fz - j;
  const h00 = heights[j * N + i],     h10 = heights[j * N + i + 1];
  const h01 = heights[(j + 1) * N + i], h11 = heights[(j + 1) * N + i + 1];
  return lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), tz);
}
function slopeAt(x, z) {
  const e = STEP * 1.5;
  const dx = (surfaceAt(x + e, z) - surfaceAt(x - e, z)) / (2 * e);
  const dz = (surfaceAt(x, z + e) - surfaceAt(x, z - e)) / (2 * e);
  return Math.hypot(dx, dz);
}

/* ============================ 五、水面 ============================ */
// 水深贴图：把地表高度编码成 R 通道，供水面着色器判断"深浅"
const depthData = new Uint8Array(N * N * 4);
for (let k = 0; k < N * N; k++) depthData[k * 4 + 3] = 255;
const depthTex = new THREE.DataTexture(depthData, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
depthTex.magFilter = THREE.LinearFilter;
depthTex.minFilter = THREE.LinearFilter;
depthTex.generateMipmaps = false;
depthTex.needsUpdate = true;

const WATER_SIZE = CFG.WORLD * CFG.WATER_SIZE_K;
const waterMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  fog: true,
  uniforms: THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime:     { value: 0 },
      uWaveSpeed:{ value: CFG.WAVE_SPEED },
      uWaveAmp:  { value: CFG.WAVE_AMP },
      uDeep:     { value: new THREE.Color(0x9dbfd0) },   // 深水
      uShallow:  { value: new THREE.Color(0xdfeee9) },   // 浅滩
      uHeight:   { value: depthTex },
      uWorld:    { value: CFG.WORLD },
      uDepthMax: { value: CFG.DEPTH_MAX }
    }
  ]),
  vertexShader: /* glsl */`
    uniform float uTime, uWaveSpeed, uWaveAmp;
    varying float vWave;
    varying vec3  vWorld;
    #include <fog_pars_vertex>
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      float w = sin(wp.x * 0.40 + uTime * uWaveSpeed) * 0.55
              + sin(wp.z * 0.33 - uTime * uWaveSpeed * 0.8) * 0.45
              + sin((wp.x + wp.z) * 0.62 + uTime * uWaveSpeed * 1.7) * 0.25;
      w *= uWaveAmp;
      // Preserve flowing colour while keeping the buildable mist ground at y=0.
      vWave  = w / max(uWaveAmp, 0.0001);
      vWorld = wp.xyz;
      vec4 mvPosition = viewMatrix * wp;
      #include <fog_vertex>
      gl_Position = projectionMatrix * mvPosition;
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D uHeight;
    uniform vec3  uDeep, uShallow;
    uniform float uWorld, uDepthMax, uTime;
    varying float vWave;
    varying vec3  vWorld;
    #include <fog_pars_fragment>
    void main(){
      vec2 uv = (vWorld.xz + vec2(uWorld * 0.5)) / uWorld;
      float depth = texture2D(uHeight, clamp(uv, 0.0, 1.0)).r * uDepthMax;
      // 地形范围之外平滑过渡为深水，避免露出贴图边界
      float outside = smoothstep(0.41, 0.50, max(abs(uv.x - 0.5), abs(uv.y - 0.5)));
      depth = mix(depth, uDepthMax, outside);
      float shallow = 1.0 - smoothstep(0.0, 1.0, depth);   // 1 = 岸边浅水
      vec3 col = mix(uDeep, uShallow, shallow * 0.9);
      // 细波光（逐像素计算，避免顶点插值出网格感）
      // 柔和的大尺度明暗：水面像一层缓慢流动的薄雾，不用周期性子波（会有网格感）
      float w1 = sin(vWorld.x * 0.33 + uTime * 0.52) * sin(vWorld.z * 0.27 - uTime * 0.41);
      float w2 = sin((vWorld.x * 0.62 - vWorld.z * 0.47) * 0.55 + uTime * 0.30);
      // 明暗必须走乘性。加性在浅色水面上只是"淡淡的"，一换成夜月那种深水，
      // 同样的绝对偏移相对亮度就大得多，会浮出一片规则的格子斑。
      col *= 1.0 + 0.065 * (w1 + w2 * 0.55);
      col *= 1.0 + 0.022 * vWave;
      float alpha = mix(0.985, 0.28, shallow * 0.92);
      gl_FragColor = vec4(col, alpha);
      #include <fog_fragment>
      #include <colorspace_fragment>   /* 自定义着色器必须自己做线性→sRGB 转换 */
    }`
});

// merge 会 clone 贴图对象，这里换回原始对象，保证后续 needsUpdate 生效
waterMat.uniforms.uHeight.value = depthTex;

const waterGeo = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, SMALL ? 90 : 130, SMALL ? 90 : 130);
waterGeo.rotateX(-Math.PI / 2);
const water = new THREE.Mesh(waterGeo, waterMat);
water.renderOrder = 1;
scene.add(water);

/* ============================ 六、雾气 ============================ */
function radialTexture(size, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(s => g.addColorStop(s[0], s[1]));
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const mistTex = radialTexture(160, [
  [0.0, 'rgba(255,255,255,0.52)'],
  [0.26, 'rgba(255,255,255,0.34)'],
  [0.62, 'rgba(255,255,255,0.11)'],
  [1.0, 'rgba(255,255,255,0)']
]);

const mists = [];
const mistGroup = new THREE.Group();
scene.add(mistGroup);
for (let i = 0; i < CFG.MIST_COUNT; i++) {
  const mat = new THREE.SpriteMaterial({
    map: mistTex, transparent: true, depthWrite: false, fog: false,
    opacity: 0.07 + rnd() * 0.08,
    color: 0xffffff,
    rotation: (rnd() - 0.5) * 1.2
  });
  const sp = new THREE.Sprite(mat);
  const w = 56 + rnd() * 78;
  sp.scale.set(w, w * (0.13 + rnd() * 0.15), 1);
  const ang = rnd() * Math.PI * 2, rad = 5 + rnd() * 38;
  sp.position.set(Math.cos(ang) * rad, 0.9 + rnd() * 9, Math.sin(ang) * rad * 0.85);
  sp.renderOrder = 2;          // 雾气在水面之后绘制（水 renderOrder = 1）
  mistGroup.add(sp);
  mists.push({ sp, speed: (0.30 + rnd() * 0.9) * CFG.MIST_SPEED, y0: sp.position.y, phase: rnd() * 6.28 });
}

// 山间雾气：落笔成山后，在山腰挂几片雾（更"仙境"）
function addPeakMist() {
  if (mists.length > 80) return;
  let made = 0;
  for (let n = 0; n < 90 && made < 6; n++) {
    const x = (rnd() - 0.5) * CFG.WORLD * 0.82;
    const z = (rnd() - 0.5) * CFG.WORLD * 0.82;
    const y = surfaceAt(x, z);
    if (y < 3.0) continue;
    made++;
    const mat = new THREE.SpriteMaterial({
      map: mistTex, transparent: true, depthWrite: false, fog: false,
      opacity: 0.24 + rnd() * 0.20, rotation: (rnd() - 0.5) * 0.8
    });
    const sp = new THREE.Sprite(mat);
    const w = 11 + rnd() * 17;
    sp.scale.set(w, w * 0.32, 1);
    sp.position.set(x + (rnd() - 0.5) * 7, y * 0.66 + 0.9, z + (rnd() - 0.5) * 7);
    sp.renderOrder = 2;
    mistGroup.add(sp);
    mists.push({ sp, speed: (0.2 + rnd() * 0.5) * CFG.MIST_SPEED, y0: sp.position.y, phase: rnd() * 6.28 });
  }
}

/* ====================== 六点五、远山（背景剪影，不参与生成） ====================== */
// 用无光照的纯色圆锥做远山剪影，靠场景雾自然淡入天色，撑起画面纵深
const farMatA = new THREE.MeshBasicMaterial({ color: 0x93aebe, fog: true });
const farMatB = new THREE.MeshBasicMaterial({ color: 0xa6bcc9, fog: true });
(function buildFarMountains() {
  const group = new THREE.Group();
  const palette = [farMatA, farMatB];
  for (let i = 0; i < 11; i++) {
    const ang = (i / 11) * Math.PI * 2 + rnd() * 0.45;
    const dist = 84 + rnd() * 52;
    const cx = Math.cos(ang) * dist, cz = Math.sin(ang) * dist * 0.9;
    const n = 1 + Math.floor(rnd() * 2);
    for (let k = 0; k < n; k++) {
      const w = 11 + rnd() * 15;
      const h = 3.2 + rnd() * 6.2;
      const geo = new THREE.ConeGeometry(w * 0.5, h, 5 + Math.floor(rnd() * 3), 1);
      const m = new THREE.Mesh(geo, palette[rnd() < 0.5 ? 0 : 1]);
      m.position.set(cx + (rnd() - 0.5) * 22, h * 0.5 - 2.8, cz + (rnd() - 0.5) * 22);
      m.rotation.y = rnd() * Math.PI;
      m.scale.set(1 + rnd() * 1.1, 1, 0.55 + rnd() * 0.6);
      group.add(m);
    }
  }
  group.renderOrder = 0;
  scene.add(group);
})();

// 每个风格给出：地形色阶 / 地面色 / 树冠 HSL 范围 / 三盏灯的色与强度 / 推荐背景。
// 色阶档位与下面 RAMP 的 9 个高度一一对应，切换时只换颜色，不动高度。

const THEMES = {
  classic: {
    label: '原色', bg: 'xuan',
    ramp: [0x2f4d55, 0x3d6165, 0x6b9977, 0x54825f, 0x55795f, 0x6f8a74, 0x97a698, 0xcbd3c8, 0xf2f5f0],
    deep: 0x9dbfd0, shallow: 0xdfeee9,
    leaf: [0.30, 0.07, 0.55, 0.22, 0.045, 0.050],
    hemi: [0xeef8ff, 0x8fae9f, 0.62],
    sun:  [0xfffbf2, 1.32],
    fill: [0xdfeef2, 0.25],
    trail: [0x1f6d8c, 0x9fe4ff]
  },
  // 纯单色墨阶：深墨 → 纸白，不带彩。想要"真·水墨"就用这一档。
  ink: {
    label: '水墨', bg: 'xuan',
    ramp: [0x2b3237, 0x3a4247, 0x515a5f, 0x475055, 0x5f686c, 0x788084, 0x98a0a3, 0xc8cfd1, 0xf5f6f6],
    deep: 0xa9bdc7, shallow: 0xe6eff2,
    leaf: [0.55, 0.06, 0.10, 0.06, 0.038, 0.030],
    hemi: [0xf1f5f6, 0x8d9598, 0.60],
    sun:  [0xffffff, 1.30],
    fill: [0xe0e7e9, 0.24],
    trail: [0x2c4a57, 0xa9d9ea]
  },
  green: {
    label: '青绿', bg: 'qing',
    ramp: [0x1c4448, 0x2a6360, 0x53a06b, 0x3a8a54, 0x2d7a49, 0x4e9161, 0x86a97c, 0xd2ddc0, 0xf7f7e9],
    deep: 0x7fb5bb, shallow: 0xd9ecdc,
    leaf: [0.32, 0.06, 0.60, 0.20, 0.042, 0.040],
    hemi: [0xf2fbff, 0x7fa587, 0.66],
    sun:  [0xfff6e0, 1.40],
    fill: [0xe6f4e8, 0.28],
    trail: [0x1d6b4f, 0x9ff0c8]
  },
  dusk: {
    label: '暮色', bg: 'mu',
    ramp: [0x33293c, 0x4a3a52, 0x9a7a72, 0x8a6a70, 0x7b5f6e, 0x92778c, 0xbca4b0, 0xe4d0d6, 0xfbf0ea],
    deep: 0x7a5f74, shallow: 0xe8cabe,
    leaf: [0.025, 0.075, 0.45, 0.18, 0.075, 0.050],
    hemi: [0xffe9d8, 0x9a7f86, 0.64],
    sun:  [0xffd9b0, 1.42],
    fill: [0xd9b6c4, 0.26],
    trail: [0xb1562f, 0xffd8a8]
  },
  night: {
    label: '夜月', bg: 'ye',
    ramp: [0x0c1826, 0x132436, 0x1d3b4c, 0x1a3346, 0x24405a, 0x33536b, 0x4d6d84, 0x8fa6ba, 0xe2ebf4],
    deep: 0x122a3e, shallow: 0x4d7590,
    leaf: [0.55, 0.08, 0.30, 0.18, 0.032, 0.030],
    hemi: [0x9fc0e8, 0x1e2c3c, 0.50],
    sun:  [0xd6e6ff, 0.90],
    fill: [0x7f9fc4, 0.20],
    trail: [0x7fd8ff, 0xdff4ff]
  }
};

// 背景底色不再开放给用户自选，改由每套风格自己的 `bg` 指定。
// 这张表留着，是因为天空渐变 / 雾色 / 远山剪影 / 水色都要从它派生。
const BG_PRESETS = [
  { id: 'xuan', label: '宣白', top: '#f7fbfb', mid: '#e9f1f3', bottom: '#dde8ea' },
  { id: 'qing', label: '淡青', top: '#eff9f6', mid: '#d9ece7', bottom: '#c7e0dc' },
  { id: 'mi',   label: '米黄', top: '#fdfaf1', mid: '#f4e9d6', bottom: '#e8dcc0' },
  { id: 'mu',   label: '暮粉', top: '#fcf1e8', mid: '#f1dad1', bottom: '#d9bfbe' },
  { id: 'ye',   label: '夜蓝', top: '#2b3d50', mid: '#1b2a3a', bottom: '#101a26', dark: true }
];

let leafRange = THEMES.classic.leaf;
let themeId = 'classic';
let bgId = 'xuan';

// 用户显式选择的"自动旋转"要压过代码逻辑：否则关掉它、画一笔又会被重新打开。
let autoRotatePref = false;

// 树冠取色：三个 0~1 随机量 + 主题给的 HSL 范围。
// 存随机量而不是存颜色，换风格时才能"换个色系但保持同一批树的高低错落"。
function leafColor(hr, sr, lr, out) {
  const L = leafRange;
  return out.setHSL(L[0] + hr * L[1], L[2] + sr * L[3], L[4] + lr * L[5]);
}
function recolorTrees() {
  const c = new THREE.Color();
  for (let i = 0; i < trees.length; i++) {
    const t = trees[i];
    leafColor(t.hr, t.sr, t.lr, c);
    t.color.copy(c);
    canopyMesh.instanceColor.setXYZ(i, c.r, c.g, c.b);
  }
  if (canopyMesh.instanceColor) canopyMesh.instanceColor.needsUpdate = true;
}

/* ============================ 七、树木 ============================ */
const trunkGeo = new THREE.CylinderGeometry(0.06, 0.105, 1.15, 5);
trunkGeo.translate(0, 0.58, 0);
const canopyGeo = new THREE.ConeGeometry(0.60, 1.75, 6);
canopyGeo.translate(0, 1.75, 0);

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b5140, roughness: 0.9, flatShading: true });
// 基色必须是白：InstancedMesh 的 instanceColor 是"乘"在 material.color 上的。
// 这里若留一个绿色（原来就是 0x4e7350），四套风格全被染成同一个绿调，
// 夜月下的树叶也是绿的。设成白，主题给的色阶才是唯一来源。
const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, flatShading: true, vertexColors: false });

const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, CFG.TREES_MAX);
const canopyMesh = new THREE.InstancedMesh(canopyGeo, canopyMat, CFG.TREES_MAX);
for (const m of [trunkMesh, canopyMesh]) {
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.castShadow = true; m.receiveShadow = true;
  m.count = 0; m.frustumCulled = false;
  scene.add(m);
}
canopyMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CFG.TREES_MAX * 3), 3);

// 固定的候选点（抖动网格），保证多次落笔时只"新增"不"重排"
const treeSpots = [];
{
  const G = 28, span = CFG.WORLD * 0.92;
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    const x = -span / 2 + (i + 0.5 + (rnd() - 0.5) * 0.85) * (span / G);
    const z = -span / 2 + (j + 0.5 + (rnd() - 0.5) * 0.85) * (span / G);
    treeSpots.push({ x, z, used: false });
  }
}
let trees = [];   // {x,y,z,rot,scale,t0}

/* ============================ 八、亭子 ============================ */
let pavilions = [];
const pavilionSpots = [];

function makePavilion(scale) {
  const g = new THREE.Group();
  const wood  = new THREE.MeshStandardMaterial({ color: 0x8d6a4f, roughness: 0.88, flatShading: true });
  const roof  = new THREE.MeshStandardMaterial({ color: 0x8c4b3b, roughness: 0.72, flatShading: true });
  const stone = new THREE.MeshStandardMaterial({ color: 0xc3c6bb, roughness: 0.95, flatShading: true });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.3, 0.34, 8), stone);
  base.position.y = 0.17; g.add(base);

  const pillarGeo = new THREE.CylinderGeometry(0.085, 0.085, 1.5, 6);
  for (const [px, pz] of [[-1.02, -1.02], [1.02, -1.02], [-1.02, 1.02], [1.02, 1.02]]) {
    const p = new THREE.Mesh(pillarGeo, wood);
    p.position.set(px, 1.05, pz); g.add(p);
  }
  const eave = new THREE.Mesh(new THREE.CylinderGeometry(1.58, 1.58, 0.12, 8), roof);
  eave.position.y = 1.86; g.add(eave);

  const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.98, 4), roof);
  top.position.y = 2.36; top.rotation.y = Math.PI / 4; g.add(top);

  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), roof);
  bead.position.y = 2.95; g.add(bead);

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(scale);
  return g;
}

/* ============================ 九、笔迹输入 ============================ */
const MIN_STEP = 0.22;                       // 采样最小间距（世界单位）
const MAX_PTS  = 1400;                       // 单笔最大点数
const glowTex = radialTexture(64, [
  [0.0, 'rgba(120,215,255,0.95)'],
  [0.35, 'rgba(60,165,215,0.42)'],
  [1.0, 'rgba(60,165,215,0)']
]);

let strokePts = [];      // [{x,z,px,py}]
let drawing = false;
let strokeId = null;     // 当前绘制的手指/指针 id
let trailTime = -99;     // 笔迹淡出计时

const trailPos = new Float32Array(MAX_PTS * 3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3).setUsage(THREE.DynamicDrawUsage));
trailGeo.setDrawRange(0, 0);

const trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({
  color: 0x1f6d8c, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false
}));
const trailDots = new THREE.Points(trailGeo, new THREE.PointsMaterial({
  map: glowTex, size: 3.0, sizeAttenuation: true, transparent: true,
  opacity: 0.75, depthTest: false, depthWrite: false, color: 0x9fe4ff
}));
trailLine.renderOrder = 20; trailDots.renderOrder = 21;
trailLine.frustumCulled = false; trailDots.frustumCulled = false;
scene.add(trailLine, trailDots);

const TRAIL_Y = 0.55;

// 屏幕坐标 → 地面（y=0 平面）精确交点：用射线投射，笔迹才能严丝合缝跟着光标
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit = new THREE.Vector3();
function screenToWorld(sx, sy) {
  _ndc.set((sx / innerWidth) * 2 - 1, -(sy / innerHeight) * 2 + 1);
  camera.updateMatrixWorld();       // 首帧前 matrixWorld 还是旧的，必须刷新
  _ray.setFromCamera(_ndc, camera);
  if (!_ray.ray.intersectPlane(_groundPlane, _hit)) return null;
  const lim = HALF - 3;
  return { x: clamp(_hit.x, -lim, lim), z: clamp(_hit.z, -lim, lim) };
}

function pushPoint(sx, sy) {
  const p = screenToWorld(sx, sy);
  if (!p) return false;
  const { x, z } = p;
  const last = strokePts[strokePts.length - 1];
  if (last && Math.hypot(x - last.x, z - last.z) < MIN_STEP) return false;
  strokePts.push({ x, z });
  return true;
}

function syncTrail() {
  const n = Math.min(strokePts.length, MAX_PTS);
  for (let i = 0; i < n; i++) {
    trailPos[i * 3] = strokePts[i].x;
    trailPos[i * 3 + 1] = TRAIL_Y;
    trailPos[i * 3 + 2] = strokePts[i].z;
  }
  trailGeo.attributes.position.needsUpdate = true;
  trailGeo.setDrawRange(0, n);
  trailGeo.computeBoundingSphere();
}

function clearTrail() {
  strokePts = [];
  trailGeo.setDrawRange(0, 0);
  trailLine.material.opacity = 0.85;
  trailDots.material.opacity = 0.75;
}

const canvas = renderer.domElement;
let inputMode='draw';
const leadEl = document.getElementById('lead');

canvas.addEventListener('pointerdown', (e) => {
  if(inputMode!=='draw')return;
  if (e.button === 2 || e.button === 1) return;          // 右键/中键留给相机
  if (e.pointerType === 'touch' && strokeId !== null) {  // 第二根手指 → 交还给 OrbitControls
    endStroke();
    controls.autoRotate = false;
    return;
  }
  if (strokeId !== null && e.pointerId !== strokeId) return;

  strokeId = e.pointerId;
  drawing = true;
  controls.autoRotate = false;
  camAnim = null;
  clearTrail();
  trailTime = -99;
  pushPoint(e.clientX, e.clientY);
  syncTrail();
  leadEl.classList.add('fade-out');
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  e.preventDefault();
}, { capture: true });

canvas.addEventListener('pointermove', (e) => {
  if (!drawing || e.pointerId !== strokeId) return;
  if (strokePts.length >= MAX_PTS) return;
  if (pushPoint(e.clientX, e.clientY)) syncTrail();
  e.preventDefault();
}, { capture: true });

function endStroke() {
  if (!drawing) return;
  drawing = false;
  const pid = strokeId;
  strokeId = null;
  try { canvas.releasePointerCapture?.(pid); } catch (_) {}
  if (strokePts.length >= 2) {
    depositStroke(strokePts);
    rebuildTerrain();
    addPeakMist();
    startCamAnim();
    controls.autoRotate = autoRotatePref;   // 按用户在设置里的选择
    window.dispatchEvent(new Event('landscape-stroke'));
    trailTime = nowT;                       // 开始淡出
  } else {
    clearTrail();
  }
}
canvas.addEventListener('pointerup', endStroke, { capture: true });
canvas.addEventListener('pointercancel', endStroke, { capture: true });
canvas.addEventListener('contextmenu', e => e.preventDefault());

/* ======================= 十、笔迹 → 高程图 ======================= */
function depositStroke(pts, wfn) {
  const R2 = CFG.BRUSH_RADIUS * CFG.BRUSH_RADIUS;
  const inv2s2 = 1 / (2 * CFG.BRUSH_SIGMA * CFG.BRUSH_SIGMA);
  const n = pts.length;

  // 起笔/收笔：沿弧长收锋，让山体两端自然没入水中（短笔靠下限保护，不受影响）
  const arc = new Float32Array(n);
  for (let p = 1; p < n; p++) {
    arc[p] = arc[p - 1] + Math.hypot(pts[p].x - pts[p - 1].x, pts[p].z - pts[p - 1].z);
  }
  const total = n ? arc[n - 1] : 0;
  const feather = Math.min(3.4, total * 0.14);
  const useFeather = !wfn && total > 1.0;

  for (let p = 0; p < n; p++) {
    const pt = pts[p];
    const prev = p > 0 ? pts[p - 1] : pts[p];
    const seg = Math.max(Math.hypot(pt.x - prev.x, pt.z - prev.z), 0.10);
    // 沿笔迹落墨；wfn 可给出逐点的运笔强度（默认匀速）
    let weight = seg * CFG.INK * (wfn ? wfn(p / Math.max(1, n - 1)) : 1);
    let startT = nowT + (p / n) * 0.55;                 // 沿笔迹方向依次生长
    if (useFeather) {
      const tip = smooth01(Math.min(arc[p], total - arc[p]) / feather + 0.02);
      weight *= tip;
      if (tip < 0.02) continue;                         // 收锋到无墨
    }

    const i0 = Math.max(0, Math.floor((pt.x - CFG.BRUSH_RADIUS + HALF) / STEP));
    const i1 = Math.min(N - 1, Math.ceil((pt.x + CFG.BRUSH_RADIUS + HALF) / STEP));
    const j0 = Math.max(0, Math.floor((pt.z - CFG.BRUSH_RADIUS + HALF) / STEP));
    const j1 = Math.min(N - 1, Math.ceil((pt.z + CFG.BRUSH_RADIUS + HALF) / STEP));

    for (let j = j0; j <= j1; j++) {
      const dz = (-HALF + j * STEP) - pt.z;
      const row = j * N;
      for (let i = i0; i <= i1; i++) {
        const dx = (-HALF + i * STEP) - pt.x;
        const d2 = dx * dx + dz * dz;
        if (d2 > R2) continue;
        const add = Math.exp(-d2 * inv2s2) * weight * unevenField[row + i];
        const k = row + i;
        landAcc[k] += add;
        if (add > 0.012 && growStart[k] > 1e8) growStart[k] = startT;
      }
    }
  }
}

/* ---------------------- 由 landAcc 计算地表并刷新网格 ---------------------- */
function refreshTerrain() {
  const pos = terrainGeo.attributes.position.array;
  const col = terrainGeo.attributes.color.array;
  const edgeP = CFG.EDGE_POWER;
  const nf = CFG.NOISE_FREQ;

  for (let j = 0; j < N; j++) {
    const z = -HALF + j * STEP;
    for (let i = 0; i < N; i++) {
      const k = j * N + i;
      const x = -HALF + i * STEP;

      const t = 1 - Math.exp(-landAcc[k]);              // 饱和：密集处高、稀疏处低
      let h = Math.pow(t, CFG.RIDGE_POWER) * CFG.MAX_HEIGHT;

      if (h > 0.001) {
        // 山体噪声（越高的地方越碎）
        // 三频段叠加：大尺度山势 + 中频起伏 + 高频碎石（低多边形面片感）
        const n1 = fbm(x * nf, z * nf, 3) - 0.5;
        const n2 = fbm(x * nf * 3.1 + 17.0, z * nf * 3.1 - 9.0, 2) - 0.5;
        const n3 = vnoise(x * nf * 8.5 - 5.0, z * nf * 8.5 + 23.0) - 0.5;
        const nz = n1 + n2 * 0.55 + n3 * 0.30;
        h += nz * CFG.NOISE_AMP * Math.pow(t, 0.55) * 2.0;
        // 边缘回落：让地形在平面边界沉入水中，不留断崖
        const bx = 1 - Math.pow(Math.abs(x) / HALF, edgeP);
        const bz = 1 - Math.pow(Math.abs(z) / HALF, edgeP);
        h *= clamp(bx * bz, 0, 1);
      } else {
        // 水底轻微起伏
        h = (fbm(x * 0.09 + 11.3, z * 0.09 + 5.7, 2) - 0.5) * 0.22 + 0.22;
      }

      const y = FLOOR + Math.max(h, 0);

      // 坡度（用已更新的邻点做后向差分，用于压暗陡坡，模拟皴擦）
      const yx = i > 0 ? heights[k - 1] : y;
      const yz = j > 0 ? heights[k - N] : y;
      const slope = Math.hypot(y - yx, y - yz) / STEP;

      heights[k] = y;
      pos[k * 3 + 1] = y;

      // 颜色
      rampColor(y, _c);
      const jit = 0.94 + 0.12 * vnoise(x * 0.5 + 3.1, z * 0.5 + 7.9);
      const shade = jit * (1 - 0.18 * Math.min(1, slope * 0.55));
      col[k * 3]     = _c.r * shade;
      col[k * 3 + 1] = _c.g * shade;
      col[k * 3 + 2] = _c.b * shade;

      // 水深编码（0 = 水面及以上，1 = 最深）
      const d = clamp(-y / CFG.DEPTH_MAX, 0, 1) * 255;
      depthData[k * 4] = d;
      depthData[k * 4 + 1] = d;
      depthData[k * 4 + 2] = d;
    }
  }

  terrainGeo.attributes.position.needsUpdate = true;
  terrainGeo.attributes.color.needsUpdate = true;
  terrainGeo.attributes.aGrowStart.needsUpdate = true;
  terrainGeo.computeVertexNormals();
  depthTex.needsUpdate = true;
}

/* ---------- 地形重建：保留原始山势，不再生成溪沟或水带 ---------- */
function rebuildTerrain() {
  refreshTerrain();
}

/* ======================= 十一、树木 & 亭子 ======================= */
function plantDecor() {
  // --- 树 ---
  const nowCount = trees.length;
  if (nowCount < CFG.TREES_MAX) {
    for (const s of treeSpots) {
      if (trees.length >= CFG.TREES_MAX) break;
      if (s.used) continue;
      const y = surfaceAt(s.x, s.z);
      if (y < CFG.TREE_MIN_H || y > CFG.TREE_MAX_H) continue;
      if (slopeAt(s.x, s.z) > CFG.TREE_MAX_SLOPE) continue;
      // 避免过密
      let ok = true;
      for (const t of trees) { if (Math.hypot(t.x - s.x, t.z - s.z) < 1.5) { ok = false; break; } }
      if (!ok) continue;

      s.used = true;
      // 只记随机量，颜色由当前风格决定（换风格时整片树一起换色）
      const hr = rnd(), sr = rnd(), lr = rnd();
      const tint = new THREE.Color();
      leafColor(hr, sr, lr, tint);
      trees.push({
        x: s.x, y: y - 0.12, z: s.z,
        rot: rnd() * Math.PI * 2,
        scale: 0.55 + rnd() * 0.50,
        t0: nowT + 0.35 + rnd() * 0.5,
        hr, sr, lr, color: tint
      });
    }
  }
  // 树冠颜色：落笔时定色并缓存，避免每次重算导致闪色
  for (let i = 0; i < trees.length; i++) {
    const c = trees[i].color;
    canopyMesh.instanceColor.setXYZ(i, c.r, c.g, c.b);
  }
  canopyMesh.instanceColor.needsUpdate = true;

  // --- 亭子 ---
  if (pavilions.length < CFG.PAVILION_MAX) {
    let best = null, bestScore = -1e9;
    for (const s of treeSpots) {
      if (pavilionSpots.includes(s)) continue;
      const y = surfaceAt(s.x, s.z);
      if (y < 1.30 || y > 5.40) continue;
      const sl = slopeAt(s.x, s.z);
      if (sl > 0.78) continue;
      let near = false;
      for (const p of pavilions) if (Math.hypot(p.x - s.x, p.z - s.z) < 12) { near = true; break; }
      if (near) continue;
      const score = y * 1.2 - sl * 9;
      if (score > bestScore) { bestScore = score; best = s; }
    }
    if (best) {
      pavilionSpots.push(best);
      const base = 0.82 + rnd() * 0.24;
      const g = makePavilion(1);
      g.position.set(best.x, surfaceAt(best.x, best.z) - 0.06, best.z);
      g.rotation.y = rnd() * Math.PI * 2;
      g.scale.setScalar(base * 0.001);
      scene.add(g);
      pavilions.push({ group: g, x: best.x, z: best.z, t0: nowT + 0.6, base });
    }
  }

  addPeakMist();
}

const _dummy = new THREE.Object3D();
function updateDecor() {
  // 树
  for (let i = 0; i < trees.length; i++) {
    const t = trees[i];
    const g = smooth01((nowT - t.t0) / 0.85);
    const s = Math.max(0.0001, t.scale * (0.15 + 0.85 * g));
    _dummy.position.set(t.x, t.y, t.z);
    _dummy.rotation.set(0, t.rot, 0);
    _dummy.scale.set(s, s * (0.2 + 0.8 * g), s);
    _dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, _dummy.matrix);
    canopyMesh.setMatrixAt(i, _dummy.matrix);
  }
  trunkMesh.count = trees.length;
  canopyMesh.count = trees.length;
  trunkMesh.instanceMatrix.needsUpdate = true;
  canopyMesh.instanceMatrix.needsUpdate = true;

  // 亭子
  for (const p of pavilions) {
    p.group.scale.setScalar(Math.max(0.001, p.base * smooth01((nowT - p.t0) / 0.9)));
  }
}

/* ============================ 十二、相机动画 ============================ */
let camAnim = null;
function startCamAnim() {
  const off = camera.position.clone().sub(controls.target);
  const sph = new THREE.Spherical().setFromVector3(off);
  camAnim = {
    t: 0, dur: CFG.CAM_DURATION,
    fromPhi: sph.phi, toPhi: CFG.PHI_VIEW,
    fromR: sph.radius, toR: R_VIEW
  };
}

function applyCamAnim(dt) {
  if (!camAnim) return;
  camAnim.t += dt;
  const e = smooth01(camAnim.t / camAnim.dur);
  const off = camera.position.clone().sub(controls.target);
  const sph = new THREE.Spherical().setFromVector3(off);
  sph.phi = lerp(camAnim.fromPhi, camAnim.toPhi, e);
  sph.radius = lerp(camAnim.fromR, camAnim.toR, e);
  off.setFromSpherical(sph);
  camera.position.copy(controls.target).add(off);
  camera.lookAt(controls.target);
  if (camAnim.t >= camAnim.dur) camAnim = null;
}

/* ============================ 十三、清除 ============================ */
function resetAll() {
  landAcc.fill(0);
  heights.fill(FLOOR);
  growStart.fill(1e9);
  rebuildTerrain();

  trees = [];
  treeSpots.forEach(s => s.used = false);
  trunkMesh.count = 0; canopyMesh.count = 0;

  pavilions.forEach(p => {
    scene.remove(p.group);
    p.group.traverse(o => {
      if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); }
    });
  });
  pavilions = [];
  pavilionSpots.length = 0;

  clearTrail();
  trailTime = -99;
  drawing = false;
  strokeId = null;

  controls.autoRotate = false;
  // 相机回到俯视，方便重新落笔
  const off = camera.position.clone().sub(controls.target);
  const sph = new THREE.Spherical().setFromVector3(off);
  camAnim = {
    t: 0, dur: 1.2,
    fromPhi: sph.phi, toPhi: CFG.PHI_DRAW,
    fromR: sph.radius, toR: R_DRAW
  };
  leadEl.classList.remove('fade-out');
}

document.getElementById('clearBtn').addEventListener('click', resetAll);

/* ============================ 十四、初始化 ============================ */
function initCamera() {
  const r = R_DRAW;
  camera.position.set(
    0,
    controls.target.y + r * Math.cos(CFG.PHI_DRAW),
    r * Math.sin(CFG.PHI_DRAW)
  );
  camera.lookAt(controls.target);
}
initCamera();
rebuildTerrain();

/* ============================ 十五、主循环 ============================ */
const clock = new THREE.Clock();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  nowT += dt;

  // 着色器时间
  const ts = terrainMat.userData.shader;
  if (ts) ts.uniforms.uTime.value = nowT;
  waterMat.uniforms.uTime.value = nowT;

  // 笔迹淡出
  if (trailTime > -90) {
    const p = clamp((nowT - trailTime) / CFG.TRAIL_FADE, 0, 1);
    trailLine.material.opacity = 0.85 * (1 - p);
    trailDots.material.opacity = 0.75 * (1 - p);
    if (p >= 1) { trailTime = -99; trailGeo.setDrawRange(0, 0); }
  } else if (!drawing && trailGeo.drawRange.count > 0) {
    trailGeo.setDrawRange(0, 0);
  }

  // 雾气飘移
  for (const m of mists) {
    m.sp.position.x += m.speed * dt;
    if (m.sp.position.x > 88) m.sp.position.x = -88;
    m.sp.position.y = m.y0 + Math.sin(nowT * 0.22 + m.phase) * 0.35;
  }

  updateDecor();
  controls.update(dt);
  applyCamAnim(dt);

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(tick);

/* ============ 十五、演示模式：URL 加 #demo 直接带一幅成景（方便分享） ============ */
function runDemo() {
  const W = innerWidth, H = innerHeight;

  // 运笔模型：两端收锋（墨轻待尽），中途"顿笔"处墨重成峰
  const brush = peaks => t => {
    let w = 0.22;
    for (const [c, a, s] of peaks) w += a * Math.exp(-((t - c) * (t - c)) / (2 * s * s));
    return w;
  };
  const draw = (screenPath, wfn) => {
    const wp = screenPath.map(q => screenToWorld(q[0], q[1])).filter(Boolean);
    if (wp.length >= 2) depositStroke(wp, wfn);
  };

  // 主脉：一条长笔，两个顿笔各起一峰
  const ridge = [];
  for (let i = 0; i <= 58; i++) {
    const t = i / 58;
    ridge.push([W * 0.135 + t * W * 0.66,
                H * 0.63 + Math.sin(t * Math.PI * 2.05) * H * 0.150 - t * H * 0.11]);
  }
  draw(ridge, brush([[0.27, 2.50, 0.075], [0.53, 1.35, 0.060], [0.78, 1.85, 0.065]]));

  // 次峰：右后一小笔，拉开纵深
  const sub = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    sub.push([W * 0.50 + t * W * 0.21, H * 0.325 + Math.sin(t * Math.PI * 1.6) * H * 0.045]);
  }
  draw(sub, brush([[0.55, 0.90, 0.15]]));

  // 岛尾：近处一小笔低丘陵，避免前景空
  const spur = [];
  for (let i = 0; i <= 22; i++) {
    const t = i / 22;
    spur.push([W * 0.20 + t * W * 0.17, H * 0.795 + Math.sin(t * Math.PI * 1.2) * H * 0.035]);
  }
  draw(spur, brush([[0.50, 0.45, 0.18]]));
  rebuildTerrain();
  addPeakMist();
  leadEl.classList.add('fade-out');
  const off = new THREE.Vector3().setFromSphericalCoords(R_VIEW, CFG.PHI_VIEW, 0);
  camera.position.copy(controls.target).add(off);
  camera.lookAt(controls.target);
  camAnim = null;
  controls.autoRotate = autoRotatePref;
}


/* ============================ 十六、窗口变化 ============================ */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  updateCamDistance();
});

/* ============================ 十七、设置面板 ============================ */
const panelEl = document.getElementById('panel');
const setBtn  = document.getElementById('setBtn');
const chipsEl = document.getElementById('themeChips');
const rotSw   = document.getElementById('rotSwitch');

function applyBackground(preset) {
  bgId = preset.id;

  const tex = makeSky([
    [preset.top, 0.00], [preset.mid, 0.18],
    [preset.bottom, 0.38], [preset.bottom, 1.00]
  ]);
  const old = scene.background;
  scene.background = tex;
  if (old && old.dispose) old.dispose();

  scene.fog.color.set(preset.bottom);      // 雾色跟天底一致，远处才无缝

  // 远山剪影从背景色派生：暗一档、稍加饱和，剪影就浮出来了
  const hsl = {};
  new THREE.Color(preset.mid).getHSL(hsl);
  // 用"按比例压暗"而不是固定减一档：固定减法在夜蓝这类深色背景上会把远山
  // 直接压到接近纯黑，硬得像纸片剪影。
  farMatA.color.setHSL(hsl.h, Math.min(1, hsl.s + 0.12), clamp(hsl.l * 0.80 - 0.02, 0.06, 0.94));
  farMatB.color.setHSL(hsl.h, Math.min(1, hsl.s + 0.07), clamp(hsl.l * 0.88 - 0.01, 0.08, 0.95));

  document.body.classList.toggle('night', !!preset.dark);
  refreshWaterColors();
  syncPanelState();
}

// 地面颜色采用风格基调，并与背景衔接。
// 不这么做的话，初始画面整屏都是水面，换背景色等于没换。
const _wc = new THREE.Color();
function refreshWaterColors() {
  const T = THEMES[themeId];
  const preset = BG_PRESETS.find(b => b.id === bgId) || BG_PRESETS[0];
  _wc.set(preset.bottom);

  waterMat.uniforms.uDeep.value.set(T.deep).lerp(_wc, 0.50);
  waterMat.uniforms.uShallow.value.set(T.shallow).lerp(_wc, 0.34);

}

function applyTheme(id) {
  const T = THEMES[id];
  themeId = id;

  for (let i = 0; i < RAMP.length; i++) RAMP[i][1].set(T.ramp[i]);   // 地形色阶

  hemi.color.set(T.hemi[0]); hemi.groundColor.set(T.hemi[1]); hemi.intensity = T.hemi[2];
  sun.color.set(T.sun[0]);   sun.intensity = T.sun[1];
  fill.color.set(T.fill[0]); fill.intensity = T.fill[1];

  trailLine.material.color.set(T.trail[0]);
  trailDots.material.color.set(T.trail[1]);

  leafRange = T.leaf;
  recolorTrees();

  applyBackground(BG_PRESETS.find(b => b.id === T.bg));   // 内含 refreshWaterColors

  refreshTerrain();      // 重算地形顶点色
  syncPanelState();
}

function syncPanelState() {
  chipsEl.querySelectorAll('.chip').forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.id === themeId)));
  rotSw.setAttribute('aria-checked', String(autoRotatePref));
}

/* ---------- 建 UI ---------- */
for (const id of Object.keys(THEMES)) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'chip';
  b.dataset.id = id; b.textContent = THEMES[id].label;
  b.addEventListener('click', () => applyTheme(id));
  chipsEl.appendChild(b);
}

rotSw.addEventListener('click', () => {
  autoRotatePref = !autoRotatePref;
  controls.autoRotate = autoRotatePref;
  syncPanelState();
});

/* ---------- 开合 ---------- */
function togglePanel(open) {
  const show = (open === undefined) ? panelEl.hidden : open;
  panelEl.hidden = !show;
  setBtn.setAttribute('aria-expanded', String(show));
  if (show) syncPanelState();
}
setBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
document.addEventListener('pointerdown', (e) => {
  if (panelEl.hidden) return;
  if (panelEl.contains(e.target) || setBtn.contains(e.target)) return;
  togglePanel(false);
}, true);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !panelEl.hidden) togglePanel(false);
});

applyTheme('classic');

window.__booted = true;

export const landscape={scene,camera,controls,renderer,canvas,surfaceAt,placementAt:(x,z)=>placementHeight(surfaceAt(x,z)),slopeAt,screenToWorld,makePavilion,
 time:()=>nowT,
 pickSurface(sx,sy){_ndc.set(sx/innerWidth*2-1,-sy/innerHeight*2+1);camera.updateMatrixWorld();_ray.setFromCamera(_ndc,camera);const hits=_ray.intersectObject(terrain,false);if(hits.length&&hits[0].point.y>0)return{x:hits[0].point.x,y:hits[0].point.y,z:hits[0].point.z};const p=screenToWorld(sx,sy);return p?{...p,y:surfaceAt(p.x,p.z)}:null;},
 setMode(mode){inputMode=mode;autoRotatePref=mode==='view';controls.autoRotate=autoRotatePref;if(mode==='view')startCamAnim();else camAnim=null;syncPanelState();controls.mouseButtons.LEFT=mode==='view'?THREE.MOUSE.ROTATE:null;controls.touches.ONE=mode==='view'?THREE.TOUCH.ROTATE:null;canvas.style.cursor=mode==='draw'?'crosshair':'grab';},
 reset(){resetAll();},
 demo(){resetAll();runDemo();window.dispatchEvent(new Event('landscape-stroke'));},
 view(){camAnim=null;const off=new THREE.Vector3().setFromSphericalCoords(R_VIEW,CFG.PHI_VIEW,0);camera.position.copy(controls.target).add(off);camera.lookAt(controls.target);controls.update();},
 support(x,z){return placementHeight(surfaceAt(x,z));},
};
