'use strict';

const fs = require('fs');
const path = require('path');

const PLUGIN_NAME = 'DGRMHook';
const ENTRY_PARAMS = {
    Port: '17870',
    WatchVars: '1021,1034,1026,1027,1022,1030,212,741,742',
    WatchSwitches: '267,883,886,261,18'
};

function resolveGame(gameDir) {
    const root = path.resolve(String(gameDir || ''));
    const pluginCandidates = [
        path.join(root, 'www', 'js', 'plugins'),
        path.join(root, 'js', 'plugins')
    ];
    const pluginDir = pluginCandidates.find((p) => fs.existsSync(p));
    if (!pluginDir) { return null; }
    const jsDir = path.dirname(pluginDir);
    return {
        root: root,
        pluginDir: pluginDir,
        pluginsFile: path.join(jsDir, 'plugins.js'),
        pluginFile: path.join(pluginDir, PLUGIN_NAME + '.js')
    };
}

// 只做“检测/显示”，绝不根据它重新编码整个文件
function detectEncoding(buf) {
    let bom = false;
    let body = buf;
    if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
        bom = true;
        body = buf.slice(3);
    }
    try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(body);
        return { encoding: 'utf-8', bom: bom, text: text, confident: true };
    } catch (e) { /* not utf-8 */ }

    const candidates = [];
    for (const enc of ['gb18030', 'shift_jis']) {
        try {
            const text = new TextDecoder(enc, { fatal: false }).decode(body);
            const bad = (text.match(/\uFFFD/g) || []).length;
            const cjk = (text.match(/[\u4e00-\u9fff\u3040-\u30ff]/g) || []).length;
            candidates.push({ encoding: enc, text: text, score: cjk - bad * 20, bad: bad });
        } catch (e) { /* unsupported */ }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length) {
        const best = candidates[0];
        return { encoding: best.encoding, bom: false, text: best.text, confident: false };
    }
    return { encoding: 'unknown', bom: false, text: body.toString('latin1'), confident: false };
}

function extractList(text) {
    const m = text.match(/var\s+\$plugins\s*=\s*(\[[\s\S]*?\])\s*;/);
    if (!m) { throw new Error('找不到标准 var $plugins = [...];'); }
    return JSON.parse(m[1]);
}

// 在字节层面找 $plugins 数组的 '[' 和配对的 ']'，不碰任何原有字节
function findArray(buf) {
    const latin = buf.toString('latin1');
    const m = /var\s+\$plugins\s*=\s*\[/.exec(latin);
    if (!m) { return null; }
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let quote = 0;
    let esc = false;
    for (let i = open; i < buf.length; i++) {
        const c = buf[i];
        if (quote) {
            if (esc) { esc = false; continue; }
            if (c === 0x5c) { esc = true; continue; }
            if (c === quote) { quote = 0; }
            continue;
        }
        if (c === 0x22 || c === 0x27) { quote = c; continue; }
        if (c === 0x5b) { depth++; }
        else if (c === 0x5d) {
            depth--;
            if (depth === 0) { return { open: open, close: i }; }
        }
    }
    return null;
}

function arrayHasEntry(buf, bounds) {
    const slice = buf.slice(bounds.open, bounds.close + 1).toString('latin1');
    return /"name"\s*:\s*"DGRMHook"/.test(slice);
}

function addEntryBytes(buf, bounds) {
    const before = buf.slice(bounds.open + 1, bounds.close).toString('latin1').trim();
    const entry = '{"name":"DGRMHook","status":true,"description":"","parameters":' + JSON.stringify(ENTRY_PARAMS) + '}';
    const insert = (before ? ',' : '') + '\n  ' + entry + '\n';
    return Buffer.concat([
        buf.slice(0, bounds.close),
        Buffer.from(insert, 'ascii'),
        buf.slice(bounds.close)
    ]);
}

function splitRanges(buf, bounds) {
    const ranges = [];
    let start = bounds.open + 1;
    let depth = 0;
    let quote = 0;
    let esc = false;
    for (let i = start; i < bounds.close; i++) {
        const c = buf[i];
        if (quote) {
            if (esc) { esc = false; continue; }
            if (c === 0x5c) { esc = true; continue; }
            if (c === quote) { quote = 0; }
            continue;
        }
        if (c === 0x22 || c === 0x27) { quote = c; continue; }
        if (c === 0x7b || c === 0x5b) { depth++; }
        else if (c === 0x7d || c === 0x5d) { depth--; }
        else if (c === 0x2c && depth === 0) {
            ranges.push({ start: start, end: i });
            start = i + 1;
        }
    }
    ranges.push({ start: start, end: bounds.close });
    return ranges;
}

function removeEntryBytes(buf, bounds) {
    const ranges = splitRanges(buf, bounds);
    for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        const text = buf.slice(r.start, r.end).toString('latin1');
        if (!/"name"\s*:\s*"DGRMHook"/.test(text)) { continue; }
        if (i > 0) {
            return Buffer.concat([buf.slice(0, ranges[i - 1].end), buf.slice(r.end)]);
        }
        if (i < ranges.length - 1) {
            return Buffer.concat([buf.slice(0, r.start), buf.slice(ranges[i + 1].start)]);
        }
        return Buffer.concat([buf.slice(0, r.start), buf.slice(r.end)]);
    }
    return null;
}

function readBytes(file) {
    return fs.readFileSync(file);
}

function status(gameDir) {
    const p = resolveGame(gameDir);
    if (!p) { return { ok: false, error: '找不到 www/js/plugins 或 js/plugins' }; }
    const installed = fs.existsSync(p.pluginFile);
    let registered = false;
    let entries = 0;
    let encoding = 'unknown';
    let bom = false;
    let parseError = '';
    try {
        const buf = readBytes(p.pluginsFile);
        const det = detectEncoding(buf);
        encoding = det.encoding;
        bom = det.bom;
        const list = extractList(det.text);
        entries = list.length;
        registered = list.some((x) => x && x.name === PLUGIN_NAME && x.status !== false);
    } catch (e) {
        parseError = e.message;
    }
    return {
        ok: true,
        gameDir: p.root,
        pluginDir: p.pluginDir,
        installed: installed,
        registered: registered,
        entries: entries,
        encoding: encoding,
        bom: bom,
        parseError: parseError
    };
}

function install(gameDir, options) {
    const p = resolveGame(gameDir);
    if (!p) { throw new Error('找不到 plugins 目录，确认路径是游戏根目录'); }
    const buf = readBytes(p.pluginsFile);
    const det = detectEncoding(buf);
    const bounds = findArray(buf);
    if (!bounds) { throw new Error('plugins.js 里找不到 var $plugins = [...]'); }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = p.pluginsFile + '.dgrmhook.bak-' + stamp;

    if (arrayHasEntry(buf, bounds)) {
        fs.copyFileSync(p.pluginsFile, backup);
        fs.copyFileSync(path.join(__dirname, PLUGIN_NAME + '.js'), p.pluginFile);
        return { ok: true, already: true, encoding: det.encoding, bom: det.bom, backup: backup, entries: extractList(det.text).length };
    }

    const out = addEntryBytes(buf, bounds);
    fs.copyFileSync(p.pluginsFile, backup);
    fs.writeFileSync(p.pluginsFile, out);
    fs.copyFileSync(path.join(__dirname, PLUGIN_NAME + '.js'), p.pluginFile);
    let entries = 0;
    try { entries = extractList(det.text).length + 1; } catch (e) { entries = 0; }
    return { ok: true, already: false, encoding: det.encoding, bom: det.bom, backup: backup, entries: entries };
}

function remove(gameDir) {
    const p = resolveGame(gameDir);
    if (!p) { throw new Error('找不到 plugins 目录，确认路径是游戏根目录'); }
    const buf = readBytes(p.pluginsFile);
    const det = detectEncoding(buf);
    const bounds = findArray(buf);
    if (!bounds) { throw new Error('plugins.js 里找不到 var $plugins = [...]'); }
    const out = removeEntryBytes(buf, bounds);
    if (!out) {
        return { ok: true, removed: 0, encoding: det.encoding, bom: det.bom, entries: extractList(det.text).length };
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = p.pluginsFile + '.dgrmhook.bak-' + stamp;
    fs.copyFileSync(p.pluginsFile, backup);
    fs.writeFileSync(p.pluginsFile, out);
    if (fs.existsSync(p.pluginFile)) { fs.unlinkSync(p.pluginFile); }
    return { ok: true, removed: 1, encoding: det.encoding, bom: det.bom, backup: backup };
}

module.exports = { resolveGame, status, install, remove, detectEncoding, PLUGIN_NAME };
