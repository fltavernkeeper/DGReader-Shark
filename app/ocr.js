'use strict';

const { spawn } = require('child_process');
const net = require('net');

function normalizeOcr(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .replace(/([\u4e00-\u9fff\u3040-\u30ff])\s+(?=[\u4e00-\u9fff\u3040-\u30ff])/g, '$1')
        .trim();
}

class OcrService {
    constructor(options) {
        this.daemon = options.daemon;
        this.port = options.port || 17892;
        this.child = null;
        this.sock = null;
        this.buffer = '';
        this.pending = null;
        this.chain = Promise.resolve();
        this.languages = [];
        this.monitoring = false;
        this.timer = null;
        this.lastError = '';
        this.lastText = '';
        this.candidate = '';
        this.candidateCount = 0;
        this.emptyCount = 0;
        this.opts = null;
        this.onText = null;
    }

    status() {
        return {
            running: !!this.child,
            connected: !!this.sock,
            monitoring: this.monitoring,
            languages: this.languages,
            lastText: this.lastText,
            error: this.lastError
        };
    }

    async ensure() {
        if (this.sock && !this.sock.destroyed) { return; }
        if (!this.child) {
            this.child = spawn('powershell', [
                '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', this.daemon, '-Port', String(this.port)
            ], { windowsHide: true, stdio: 'ignore' });
            this.child.on('exit', () => {
                this.child = null;
                this.sock = null;
                this.monitoring = false;
                if (this.timer) { clearTimeout(this.timer); this.timer = null; }
            });
        }
        await this.connect();
        await this.request({ cmd: 'ping' });
    }

    connect() {
        return new Promise((resolve, reject) => {
            let tries = 0;
            const attempt = () => {
                if (this.sock && !this.sock.destroyed) { resolve(); return; }
                const sock = net.connect({ host: '127.0.0.1', port: this.port });
                sock.setEncoding('utf8');
                sock.setNoDelay(true);
                sock.once('connect', () => {
                    this.sock = sock;
                    this.buffer = '';
                    sock.on('data', (chunk) => this.onData(chunk));
                    sock.on('error', () => { });
                    sock.on('close', () => { this.sock = null; });
                    resolve();
                });
                sock.once('error', () => {
                    try { sock.destroy(); } catch (e) { }
                    tries++;
                    if (tries > 40) { reject(new Error('OCR 服务启动失败')); return; }
                    setTimeout(attempt, 150);
                });
            };
            attempt();
        });
    }

    onData(chunk) {
        this.buffer += chunk;
        let idx;
        while ((idx = this.buffer.indexOf('\n')) >= 0) {
            const line = this.buffer.slice(0, idx).trim();
            this.buffer = this.buffer.slice(idx + 1);
            if (!line) { continue; }
            let resp;
            try { resp = JSON.parse(line); } catch (e) { continue; }
            if (this.pending) {
                const p = this.pending;
                this.pending = null;
                if (p.timer) { clearTimeout(p.timer); }
                p.resolve(resp);
            }
        }
    }

    request(obj) {
        this.chain = this.chain.then(() => this._request(obj), () => this._request(obj));
        return this.chain;
    }

    _request(obj) {
        return new Promise((resolve, reject) => {
            if (!this.sock || this.sock.destroyed) { reject(new Error('OCR 服务未连接')); return; }
            this.pending = {
                resolve: resolve,
                reject: reject,
                timer: setTimeout(() => {
                    this.pending = null;
                    reject(new Error('OCR 超时'));
                }, 30000)
            };
            try {
                this.sock.write(JSON.stringify(obj) + '\n');
            } catch (e) {
                if (this.pending) { clearTimeout(this.pending.timer); this.pending = null; }
                reject(e);
            }
        });
    }

    async listLanguages() {
        await this.ensure();
        const r = await this.request({ cmd: 'langs' });
        if (!r.ok) { throw new Error(r.error || '读取 OCR 语言失败'); }
        this.languages = r.languages || [];
        return this.languages;
    }

    async screenshot(path, region) {
        await this.ensure();
        const req = { cmd: 'shot', path: path };
        if (region) {
            req.x = region.x; req.y = region.y; req.w = region.w; req.h = region.h;
        }
        const r = await this.request(req);
        if (!r.ok) { throw new Error(r.error || '截图失败'); }
        return r;
    }

    async recognize(region, lang) {
        await this.ensure();
        const r = await this.request({
            cmd: 'ocr',
            x: region.x, y: region.y, w: region.w, h: region.h,
            lang: lang || ''
        });
        if (!r.ok) { throw new Error(r.error || 'OCR 识别失败'); }
        return { text: r.text || '', lines: r.lines || [] };
    }

    async startMonitor(opts, onText) {
        await this.ensure();
        this.stopMonitor();
        this.opts = opts;
        this.onText = onText;
        this.monitoring = true;
        this.lastError = '';
        this.lastText = '';
        this.candidate = '';
        this.candidateCount = 0;
        this.emptyCount = 0;
        const interval = Math.max(500, Number(opts.intervalMs) || 1500);

        const tick = async () => {
            if (!this.monitoring) { return; }
            try {
                const r = await this.recognize(opts.region, opts.lang);
                const text = normalizeOcr(r.text);
                if (text) {
                    this.emptyCount = 0;
                    if (text === this.candidate) { this.candidateCount++; }
                    else { this.candidate = text; this.candidateCount = 1; }
                    if (this.candidateCount >= 2 && text !== this.lastText) {
                        this.lastText = text;
                        if (this.onText) { this.onText(text); }
                    }
                } else {
                    this.emptyCount++;
                    if (this.emptyCount >= 2 && this.lastText) {
                        this.lastText = '';
                        this.candidate = '';
                        this.candidateCount = 0;
                        if (this.onText) { this.onText(''); }
                    }
                }
            } catch (e) {
                this.lastError = e.message;
            } finally {
                if (this.monitoring) { this.timer = setTimeout(tick, interval); }
            }
        };
        tick();
        return this.status();
    }

    stopMonitor() {
        this.monitoring = false;
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    }

    async stop() {
        this.stopMonitor();
        if (this.sock && !this.sock.destroyed) {
            try { await this.request({ cmd: 'quit' }); } catch (e) { }
            try { this.sock.destroy(); } catch (e) { }
        }
        this.sock = null;
        if (this.child) {
            try { this.child.kill(); } catch (e) { }
            this.child = null;
        }
        this.languages = [];
    }
}

module.exports = OcrService;
