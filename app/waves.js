'use strict';

const fs = require('fs');
const path = require('path');

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
    '连击': 'burst', '波浪': 'wave', '敲击': 'knock', '蠕动': 'crawl'
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
                    points: w.points.map((v) => clamp(v, 0, 100)).slice(0, 4000),
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
        return builtins.concat(custom);
    }

    normalize(name) {
        if (!name) { return 'const'; }
        if (BUILTIN[name]) { return name; }
        if (this.custom.some((w) => w.name === name)) { return name; }
        return ALIASES[name] || 'const';
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
        const pts = (points || []).map((v) => clamp(v, 0, 100)).slice(0, 4000);
        if (pts.length < 2) { throw new Error('波形至少需要 2 个点'); }
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
                if (w.header) { header = w.header; }
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
    const slash = body.indexOf('/');
    const header = slash >= 0 ? body.slice(0, slash) : '0,1,8=0,20,0,1,1';
    const seq = slash >= 0 ? body.slice(slash + 1) : body;
    const points = [];
    for (const token of seq.split(',')) {
        const m = /^(-?\d+)(?:-(\d+))?$/.exec(token.trim());
        if (!m) { continue; }
        points.push(clamp(m[1], 0, 100));
    }
    if (points.length < 2) { throw new Error('Dungeonlab+pulse 里没有足够的波形数据'); }
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
