'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RANDOM_WAVE = 'randomWave';
const MAX_SECTIONS = 30;
const MAX_POINTS = 4800; // 25ms/点 = 120 秒

// 内置波形：t=毫秒，b=0-100
const BUILTIN = {
    const:    (t, b) => b,
    sine:     (t, b) => b * (0.5 + 0.5 * Math.sin((t / 400) * Math.PI * 2)),
    tide:     (t, b) => b * (0.5 + 0.5 * Math.sin((t / 1400) * Math.PI * 2)),
    heart:    (t, b) => { const p = t % 900; return p < 110 ? b : (p < 220 ? b * 0.35 : 0); },
    pulse:    (t, b) => (Math.floor(t / 160) % 2 === 0 ? b : 0),
    rampUp:   (t, b) => b * Math.min(1, (t % 2200) / 2200),
    rampDown: (t, b) => b * (1 - Math.min(1, (t % 2200) / 2200)),
    saw:      (t, b) => b * ((t % 1000) / 1000),
    random:   (t, b) => b * (0.25 + 0.75 * Math.random()),
    massage:  (t, b) => b * (0.6 + 0.4 * Math.sin((t / 180) * Math.PI * 2)),
    burst:    (t, b) => (t % 400 < 120 ? b : 0),
    wave:     (t, b) => b * (0.5 + 0.5 * Math.sin((t / 2000) * Math.PI * 2)),
    knock:    (t, b) => { const p = t % 1000; return (p < 90 || (p > 180 && p < 270)) ? b : 0; },
    crawl:    (t, b) => b * (0.2 + 0.8 * ((t % 3000) / 3000))
};

const BUILTIN_LABELS = {
    const: '持续', sine: '呼吸', tide: '潮汐', heart: '心跳', pulse: '脉冲',
    rampUp: '渐强', rampDown: '渐弱', saw: '锯齿', random: '随机', massage: '按摩',
    burst: '连击', wave: '波浪', knock: '敲击', crawl: '蠕动'
};

const ALIASES = {
    '低': 'sine', '中': 'sine', '强': 'const', '脉冲': 'pulse', '持续': 'const',
    '呼吸': 'sine', '潮汐': 'tide', '心跳': 'heart', '渐强': 'rampUp',
    '渐弱': 'rampDown', '锯齿': 'saw', '随机': 'random', '按摩': 'massage',
    '连击': 'burst', '波浪': 'wave', '敲击': 'knock', '蠕动': 'crawl',
    // 英文界面标签也能直接用于序列输入；导入波形仍优先按原名精确匹配。
    'constant': 'const', 'continuous': 'const', 'breathing': 'sine',
    'breath': 'sine', 'tide': 'tide', 'heartbeat': 'heart', 'pulse': 'pulse',
    'ramp up': 'rampUp', 'ramp down': 'rampDown', 'saw': 'saw',
    'random': 'random', 'massage': 'massage', 'burst': 'burst',
    'wave': 'wave', 'knock': 'knock', 'crawl': 'crawl',
    // 日本語 UI のラベル
    '連続': 'const', '鼓動': 'heart', 'パルス': 'pulse',
    '漸強': 'rampUp', '漸弱': 'rampDown', 'ノコギリ': 'saw',
    'ランダム': 'random', 'マッサージ': 'massage', '連打': 'burst',
    '波': 'wave', '打撃': 'knock', 'うねり': 'crawl'
};

class WaveLibrary {
    constructor(dataDir) {
        this.file = path.join(dataDir, 'waves.json');
        this.custom = [];
        this.load();
    }

    load() {
        try {
            let t = fs.readFileSync(this.file, 'utf8');
            if (t.charCodeAt(0) === 0xfeff) { t = t.slice(1); }
            const d = JSON.parse(t);
            if (Array.isArray(d.waves)) {
                this.custom = d.waves.filter((w) => w && w.name && Array.isArray(w.points)).map((w) => ({
                    name: String(w.name),
                    points: w.points.map((v) => clamp(v, 0, 100)).slice(0, MAX_POINTS),
                    header: w.header ? String(w.header) : ''
                }));
            }
        } catch (e) { this.custom = []; }
    }

    save() {
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        fs.writeFileSync(this.file, JSON.stringify({ waves: this.custom }, null, 2), 'utf8');
    }

    names() {
        return Object.keys(BUILTIN).concat(this.custom.map((w) => w.name));
    }

    list() {
        const builtins = Object.keys(BUILTIN).map((k) => ({ name: k, label: BUILTIN_LABELS[k] || k, type: 'builtin' }));
        const custom = this.custom.map((w) => ({ name: w.name, label: w.name, type: 'custom', points: w.points.length }));
        return [{ name: RANDOM_WAVE, label: '随机波形', type: 'special' }].concat(builtins, custom);
    }

    isRandom(name) {
        const n = String(name || '').trim().toLowerCase();
        return n === RANDOM_WAVE.toLowerCase() || n === '随机波形' || n === 'ランダム波形' ||
            n === 'random waveform' || n === 'random wave';
    }

    pickRandomName() {
        const names = Object.keys(BUILTIN).concat(this.custom.map((w) => w.name))
            .filter((n) => n && !this.isRandom(n));
        if (!names.length) { return 'const'; }
        // 独立均匀随机：每次都可能抽到同一个波形，不人为压制重复
        return names[crypto.randomInt(names.length)];
    }

    pickIfRandom(name) {
        return this.isRandom(name) ? this.pickRandomName() : name;
    }

    normalize(name) {
        const raw = String(name === undefined || name === null ? '' : name).trim();
        if (!raw) { return 'const'; }
        if (this.isRandom(raw)) { return RANDOM_WAVE; }
        if (BUILTIN[raw]) { return raw; }
        if (this.custom.some((w) => w.name === raw)) { return raw; }
        const lower = raw.toLowerCase();
        const lowerAliases = {
            sine: 'sine', const: 'const', tide: 'tide', heart: 'heart',
            pulse: 'pulse', rampup: 'rampUp', rampdown: 'rampDown', saw: 'saw',
            random: 'random', massage: 'massage', burst: 'burst', wave: 'wave',
            knock: 'knock', crawl: 'crawl'
        };
        return ALIASES[raw] || ALIASES[lower] || lowerAliases[lower] || 'const';
    }

    resolve(name) {
        const n = this.normalize(name);
        if (BUILTIN[n]) { return BUILTIN[n]; }
        const w = this.custom.filter((x) => x.name === n)[0];
        if (!w || !w.points.length) { return BUILTIN.const; }
        const pts = w.points;
        return (t, b) => pts[Math.floor(t / 25) % pts.length] * (b / 100);
    }

    addCustom(name, points, header) {
        const n = String(name || '').trim();
        if (!n) { throw new Error('波形名不能为空'); }
        const pts = (points || []).map((v) => clamp(v, 0, 100));
        if (pts.length < 2) { throw new Error('波形至少需要 2 个点'); }
        if (pts.length > MAX_POINTS) { throw new Error('波形超过 ' + MAX_POINTS + ' 个点'); }
        this.custom = this.custom.filter((w) => w.name !== n);
        this.custom.push({ name: n, points: pts, header: String(header || '') });
        this.save();
        return this.custom.filter((w) => w.name === n)[0];
    }

    removeCustom(name) {
        this.custom = this.custom.filter((w) => w.name !== name);
        this.save();
    }

    toPulse(name) {
        const n = this.normalize(name);
        if (BUILTIN[n]) {
            const fn = BUILTIN[n];
            const points = [];
            for (let i = 0; i < 200; i++) { points.push(clamp(fn(i * 25, 100), 0, 100)); }
            return { format: 'dgreader.pulse/1', name: n, points: points };
        }
        const w = this.custom.filter((x) => x.name === n)[0];
        return { format: 'dgreader.pulse/1', name: n, points: w ? w.points : [] };
    }

    // 导出 Dungeonlab+pulse 文本格式
    toPulseText(name) {
        const n = this.normalize(name);
        let points = [];
        let header = '0,1,8=0,20,0,1,1';
        if (BUILTIN[n]) {
            const fn = BUILTIN[n];
            for (let i = 0; i < 200; i++) { points.push(clamp(fn(i * 25, 100), 0, 100)); }
        } else {
            const w = this.custom.filter((x) => x.name === n)[0];
            if (w) {
                points = w.points;
            }
        }
        if (points.length < 2) { points = [50, 50]; }
        return 'Dungeonlab+pulse:' + header + '/' + points.map((v) => clamp(v, 0, 100) + '-1').join(',');
    }
}

function clamp(v, lo, hi) {
    const n = Number(v);
    if (!Number.isFinite(n)) { return 0; }
    return Math.max(lo, Math.min(hi, Math.round(n)));
}

// 解析 .pulse：
//   1. 本工具格式 {format:'dgreader.pulse/1', name, points}
//   2. 目录格式 {pulses:[{name, sections:[{atoms:[...]}]}]}
//   3. 单个 pulse 对象 {name, sections|atoms}
function parseDgPulse(text, name) {
    const raw = String(text || '').trim();
    const body = raw.slice(raw.indexOf(':') + 1);
    const parts = body.split('+section+');
    if (parts.length > MAX_SECTIONS) {
        throw new Error('波形有 ' + parts.length + ' 段，超过上限 ' + MAX_SECTIONS + ' 段');
    }

    let header = '0,1,8=0,20,0,1,1';
    const rawPoints = [];
    const external = parts.length > 1;
    let hasDecimal = false;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const slash = part.indexOf('/');
        if (slash < 0) { continue; }
        if (i === 0) { header = part.slice(0, slash).trim() || header; }
        if (header !== '0,1,8=0,20,0,1,1') { /* external header */ }
        const seq = part.slice(slash + 1);
        for (const token of seq.split(',')) {
            // 支持 100 / 100.00，也支持 100-1 / 100.00-0 这种强度-参数
            const m = /^(-?\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?$/.exec(token.trim());
            if (!m) { continue; }
            if (m[1].indexOf('.') >= 0) { hasDecimal = true; }
            rawPoints.push(clamp(parseFloat(m[1]), 0, 100));
        }
    }

    // 官方 App 的 .pulse 以 0.1 秒为一个点；DGReader 内部以 25ms 为一个点。
    const isExternal = external || hasDecimal || header !== '0,1,8=0,20,0,1,1';
    const points = [];
    for (const v of rawPoints) {
        if (isExternal) { points.push(v, v, v, v); }
        else { points.push(v); }
    }

    // 官方格式头部第一个字段是休息时间（0.1 秒为单位）
    if (isExternal) {
        const restUnits = parseInt(String(header).split(',')[0], 10);
        if (restUnits > 0) {
            for (let i = 0; i < restUnits * 4; i++) { points.push(0); }
        }
    }

    if (points.length < 2) { throw new Error('Dungeonlab+pulse 里没有足够的波形数据'); }
    if (points.length > MAX_POINTS) {
        throw new Error('波形有 ' + points.length + ' 个点，超过上限 ' + MAX_POINTS + ' 个点');
    }
    return { name: name || '导入波形', points: points, header: header };
}

function parsePulse(content, fallbackName) {
    fallbackName = String(fallbackName || '').replace(/\.(pulse|json)$/i, '');
    const raw = String(content).replace(/^\uFEFF/, '').trim();
    if (/^Dungeonlab\+pulse:/i.test(raw)) {
        return [parseDgPulse(raw, fallbackName)];
    }

    let d;
    try { d = JSON.parse(raw); }
    catch (e) { throw new Error('不是合法的 .pulse（应为 Dungeonlab+pulse 文本或 JSON）'); }

    const out = [];
    if (Array.isArray(d)) {
        for (const p of d) {
            const pts = pointsFromPulse(p);
            if (pts.length >= 2) { out.push({ name: p.name || (fallbackName + '-' + out.length), points: pts }); }
        }
    }
    if (Array.isArray(d.points)) {
        out.push({ name: d.name || fallbackName || '导入波形', points: d.points.map((v) => clamp(v, 0, 100)) });
    }
    if (Array.isArray(d.pulses)) {
        for (const p of d.pulses) {
            const pts = pointsFromPulse(p);
            if (pts.length >= 2) { out.push({ name: p.name || (fallbackName + '-' + out.length), points: pts }); }
        }
    }
    if (!out.length) {
        const pts = pointsFromPulse(d);
        if (pts.length >= 2) { out.push({ name: d.name || fallbackName || '导入波形', points: pts }); }
    }
    if (!out.length) { throw new Error('没有可识别的波形数据（points / sections.atoms）'); }
    return out;
}

function pointsFromPulse(p) {
    if (!p || typeof p !== 'object') { return []; }
    if (Array.isArray(p.points)) { return p.points.map((v) => clamp(v, 0, 100)); }
    const pts = [];
    const sections = Array.isArray(p.sections) ? p.sections : [];
    for (const sec of sections) {
        if (!sec.enabled && sec.enabled !== undefined) { continue; }
        const atoms = Array.isArray(sec.atoms) ? sec.atoms : [];
        for (const a of atoms) {
            if (a === null || a === undefined) { pts.push(0); }
            else { pts.push(clamp(a, 0, 100)); }
        }
    }
    if (!pts.length && Array.isArray(p.atoms)) {
        for (const a of p.atoms) { pts.push(a === null ? 0 : clamp(a, 0, 100)); }
    }
    return pts.slice(0, 4000);
}

module.exports = { WaveLibrary, parsePulse, BUILTIN, BUILTIN_LABELS };
