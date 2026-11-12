'use strict';

/**
 * Opossum BLE 设备管理（PowerShell WinRT 常驻服务）
 *
 * 官方协议：
 *   0x180C/0x150A 写
 *   B3 设强度（0-200）
 *   B0 100ms 振动波形（每通道 4 字节，每字节 25ms，0-100）
 *
 * 支持 A/B 两通道独立强度、独立波形、独立持续时间。
 */

const { spawn } = require('child_process');
const net = require('net');

function clamp(v, lo, hi) {
    const n = Number(v);
    if (!Number.isFinite(n)) { return lo; }
    return Math.max(lo, Math.min(hi, Math.round(n)));
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function newChannel() {
    return {
        strength: 0,
        wave: 'const',
        base: 0,
        active: false,
        start: 0,
        owner: '',
        timer: null
    };
}

class OpossumDevice {
    constructor(options) {
        this.daemon = options.daemon;
        this.port = options.port || 17890;
        this.waves = options.waves;
        this.child = null;
        this.sock = null;
        this.pending = new Map();
        this.nextId = 1;
        this.buffer = '';
        this.connected = false;
        this.name = '';
        this.address = '';
        this.lastError = '';
        this.waveTimer = null;
        this.channels = { A: newChannel(), B: newChannel() };
        this.sequences = { A: null, B: null };
        this.sequenceToken = { A: 0, B: 0 };
    }

    log(msg) { console.log(`[设备] ${msg}`); }

    async start() {
        if (this.sock) { return; }
        if (await this.tryConnect(400)) { return; }
        this.log('启动 BLE 服务…');
        try {
            this.child = spawn('powershell', [
                '-NoProfile', '-ExecutionPolicy', 'Bypass',
                '-File', this.daemon, '-Port', String(this.port)
            ], { stdio: 'ignore', windowsHide: true });
        } catch (e) {
            this.lastError = '无法启动 PowerShell: ' + e.message;
            throw new Error(this.lastError);
        }
        for (let i = 0; i < 20; i++) {
            await sleep(300);
            if (await this.tryConnect(500)) { return; }
        }
        this.lastError = 'BLE 服务启动超时';
        throw new Error(this.lastError);
    }

    tryConnect(timeoutMs) {
        return new Promise((resolve) => {
            const sock = net.connect(this.port, '127.0.0.1');
            let done = false;
            const finish = (ok) => {
                if (done) { return; }
                done = true;
                if (!ok) { try { sock.destroy(); } catch (e) { } }
                resolve(ok);
            };
            sock.setTimeout(timeoutMs, () => finish(false));
            sock.on('error', () => finish(false));
            sock.on('connect', () => {
                this.sock = sock;
                sock.setEncoding('utf8');
                sock.setNoDelay(true);
                sock.on('data', (d) => this.onData(d));
                sock.on('close', () => { this.sock = null; this.connected = false; });
                finish(true);
            });
        });
    }

    onData(chunk) {
        this.buffer += chunk;
        let idx;
        while ((idx = this.buffer.indexOf('\n')) >= 0) {
            const line = this.buffer.slice(0, idx).trim();
            this.buffer = this.buffer.slice(idx + 1);
            if (!line) { continue; }
            let msg;
            try { msg = JSON.parse(line); } catch (e) { continue; }
            const p = this.pending.get(msg.id);
            if (p) {
                this.pending.delete(msg.id);
                clearTimeout(p.timer);
                if (msg.ok) { p.resolve(msg); } else { p.reject(new Error(msg.error || 'device error')); }
            }
        }
    }

    call(cmd, timeoutMs) {
        if (!this.sock) { return Promise.reject(new Error('BLE 服务未启动')); }
        const id = this.nextId++;
        const payload = Object.assign({ id }, cmd);
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error('设备命令超时'));
            }, timeoutMs || 20000);
            this.pending.set(id, { resolve, reject, timer });
            try {
                this.sock.write(JSON.stringify(payload) + '\n');
            } catch (e) {
                clearTimeout(timer);
                this.pending.delete(id);
                reject(e);
            }
        });
    }

    async scan() {
        await this.start();
        const r = await this.call({ cmd: 'scan' }, 30000);
        return r.devices || [];
    }

    async connect(address) {
        const normalized = String(address || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
        if (normalized.length !== 12) {
            throw new Error('蓝牙地址应为 12 位十六进制，');
        }
        await this.start();
        const r = await this.call({ cmd: 'connect', address: normalized });
        this.connected = true;
        this.name = r.name || '';
        this.address = normalized;
        this.lastError = '';
        this.log(`已连接 ${this.name} (${normalized})`);
        return r;
    }

    async setStrength(a, b, timeoutMs) {
        return this.call({ cmd: 'b3', a: clamp(a, 0, 200), b: clamp(b, 0, 200) }, timeoutMs || 5000);
    }

    async sendB0(aArr, bArr) {
        const aa = (Array.isArray(aArr) ? aArr : [aArr, aArr, aArr, aArr]).map((v) => clamp(v, 0, 100));
        const bb = (Array.isArray(bArr) ? bArr : [bArr, bArr, bArr, bArr]).map((v) => clamp(v, 0, 100));
        return this.call({ cmd: 'b0', aa: aa, bb: bb }, 3000);
    }

    // ---- 波形 / 通道 -----------------------------------------------------
    ensureWaveTimer() {
        if (this.waveTimer) { return; }
        this.waveTimer = setInterval(() => {
            if (!this.connected) { return; }
            if (this.pending.size > 12) { return; }
            const active = this.channels.A.active || this.channels.B.active;
            if (!active) { return; }
            const now = Date.now();
            const aBytes = this.channelBytes('A', now);
            const bBytes = this.channelBytes('B', now);
            this.sendB0(aBytes, bBytes).catch(() => { });
        }, 100);
    }

    stopWaveTimer() {
        if (this.waveTimer) {
            clearInterval(this.waveTimer);
            this.waveTimer = null;
        }
    }

    channelBytes(ch, now) {
        const c = this.channels[ch];
        if (!c.active) { return [0, 0, 0, 0]; }
        const fn = this.waves.resolve(c.wave);
        const out = [];
        for (let i = 0; i < 4; i++) {
            const t = now - c.start + i * 25;
            out.push(clamp(fn(t, c.base), 0, 100));
        }
        return out;
    }

    startChannel(ch, opts, owner) {
        const c = this.channels[ch];
        if (!c) { return; }
        if (c.timer) { clearTimeout(c.timer); c.timer = null; }
        const strength = clamp(opts.strength, 0, 200);
        c.strength = strength;
        c.wave = this.waves.normalize(this.waves.pickIfRandom(opts.wave || opts.pulse));
        c.base = Math.round(strength / 2);
        c.start = Date.now();
        c.active = strength > 0;
        c.owner = owner || '';
        this.ensureWaveTimer();
        if (opts.seconds > 0) {
            c.timer = setTimeout(() => {
                if (c.owner === (owner || '')) { this.stopChannel(ch); }
            }, opts.seconds * 1000);
        }
        this.setStrength(this.channels.A.strength, this.channels.B.strength).catch(() => { });
    }

    stopSequence(ch) {
        const token = ++this.sequenceToken[ch];
        if (this.sequences[ch]) { clearTimeout(this.sequences[ch]); this.sequences[ch] = null; }
        return token;
    }

    playSequence(ch, steps, owner, options) {
        const c = this.channels[ch];
        if (!c || !Array.isArray(steps) || !steps.length) { return; }
        const opts = options || {};
        if (this.sequences[ch]) {
            if (opts.overlap === 'skip') { return; }
            this.stopSequence(ch);
        }
        const token = this.stopSequence(ch);
        const loop = Math.max(0, Number(opts.loop) || 0);
        let index = 0;
        let loops = 0;
        const run = () => {
            if (token !== this.sequenceToken[ch]) { return; }
            if (index >= steps.length) {
                if (loop === 0 || loops < loop - 1) {
                    index = 0;
                    loops++;
                } else {
                    this.sequences[ch] = null;
                    this.stopChannel(ch);
                    return;
                }
            }
            const step = steps[index];
            const seconds = Math.max(0.1, Number(step.seconds) || 0.1);
            this.startChannel(ch, {
                strength: clamp(step.strength, 0, 200),
                wave: step.wave || 'const',
                seconds: 0
            }, owner);
            index++;
            this.sequences[ch] = setTimeout(run, seconds * 1000);
        };
        run();
    }

    stopChannel(ch) {
        const c = this.channels[ch];
        if (!c) { return; }
        if (this.sequences[ch]) {
            clearTimeout(this.sequences[ch]);
            this.sequences[ch] = null;
            this.sequenceToken[ch]++;
        }
        if (c.timer) { clearTimeout(c.timer); c.timer = null; }
        c.active = false;
        c.strength = 0;
        c.base = 0;
        c.owner = '';
        if (!this.channels.A.active && !this.channels.B.active) { this.stopWaveTimer(); }
        this.setStrength(this.channels.A.strength, this.channels.B.strength).catch(() => { });
    }

    // ---- 规则动作 ---------------------------------------------------------
    applyAction(action, edge, ruleId) {
        if (!this.connected) { return; }
        const a = action || {};
        const ch = a.channel ? String(a.channel).toUpperCase() : 'A';
        if (!this.channels[ch]) { return; }
        const owner = ruleId || '';
        if (edge === 'OFF') {
            const c = this.channels[ch];
            if (c.owner && c.owner !== owner) { return; }
            this.stopChannel(ch);
            return;
        }
        const strength = a.strength !== undefined ? clamp(a.strength, 0, 200) : this.channels[ch].strength;
        if (strength <= 0 && !Array.isArray(a.steps)) { this.stopChannel(ch); return; }
        if (Array.isArray(a.steps) && a.steps.length) {
            this.playSequence(ch, a.steps, owner, { loop: a.loop, overlap: a.overlap });
            return;
        }
        this.startChannel(ch, {
            strength: strength,
            wave: a.wave || a.pulse,
            seconds: Number(a.seconds) || 0
        }, owner);
    }

    async test(a, b, waveA, waveB, seconds) {
        if (!this.connected) { throw new Error('设备未连接'); }
        const pickedA = this.waves.pickIfRandom(waveA);
        const pickedB = this.waves.pickIfRandom(waveB);
        this.startChannel('A', { strength: a, wave: pickedA, seconds: seconds }, 'test');
        this.startChannel('B', { strength: b, wave: pickedB, seconds: seconds }, 'test');
        return { a: a, b: b, waveA: this.waves.normalize(pickedA), waveB: this.waves.normalize(pickedB), seconds: seconds };
    }

    testActions(actions, fallbackSeconds) {
        if (!this.connected) { throw new Error('设备未连接'); }
        const list = Array.isArray(actions) ? actions : [actions];
        const applied = [];
        for (const a of list) {
            if (!a || !a.channel) { continue; }
            const ch = String(a.channel).toUpperCase();
            if (!this.channels[ch]) { continue; }
            if (Array.isArray(a.steps) && a.steps.length) {
                this.playSequence(ch, a.steps, 'test', { loop: a.loop, overlap: a.overlap });
                applied.push({ channel: ch, steps: a.steps, loop: a.loop, seconds: fallbackSeconds });
                continue;
            }
            const strength = clamp(a.strength, 0, 200);
            if (strength <= 0) { continue; }
            const seconds = Number(a.seconds) > 0 ? Number(a.seconds) : (fallbackSeconds || 3);
            const pickedWave = this.waves.pickIfRandom(a.wave || a.pulse);
            this.startChannel(ch, { strength: strength, wave: pickedWave, seconds: seconds }, 'test');
            applied.push({ channel: ch, strength: strength, wave: this.waves.normalize(pickedWave), seconds: seconds });
        }
        if (!applied.length) { throw new Error('规则没有可测试的输出'); }
        return applied;
    }

    stopAll() {
        this.stopChannel('A');
        this.stopChannel('B');
        this.stopWaveTimer();
    }

    async disconnect() {
        this.stopAll();
        if (this.sock && this.connected) {
            try { await this.setStrength(0, 0, 2000); } catch (e) { }
            try { await this.call({ cmd: 'disconnect' }, 5000); } catch (e) { }
        }
        this.connected = false;
    }

    async shutdown() {
        this.stopAll();
        try { await this.call({ cmd: 'quit' }, 3000); } catch (e) { }
        if (this.sock) { try { this.sock.destroy(); } catch (e) { } this.sock = null; }
        if (this.child) { try { this.child.kill(); } catch (e) { } this.child = null; }
        this.connected = false;
    }

    status() {
        return {
            running: !!this.sock,
            connected: this.connected,
            name: this.name,
            address: this.address,
            channels: {
                A: { strength: this.channels.A.strength, wave: this.channels.A.wave, active: this.channels.A.active },
                B: { strength: this.channels.B.strength, wave: this.channels.B.wave, active: this.channels.B.active }
            },
            waves: this.waves.list(),
            error: this.lastError
        };
    }
}

module.exports = OpossumDevice;
