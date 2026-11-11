#!/usr/bin/env node
'use strict';

/**
 * DGRMHook 接收端 + 规则引擎
 *
 * 用法：
 *   node bridge.js --profile ..\profiles\celesphonia.json
 *   node bridge.js --profile ..\profiles\celesphonia.json --http http://127.0.0.1:9000/action
 *   node bridge.js --profile ..\profiles\celesphonia.json --verbose
 *
 * 它接收 DGRMHook.js 发来的 JSONL，维护变量/开关/地图/角色状态/文本，
 * 按 profile 里的 when 表达式做边沿触发，输出到控制台 / HTTP / 命名管道。
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');
const { spawn, execFile } = require('child_process');
const BROWSE_SCRIPT = path.join(__dirname, 'browse.ps1');
const OpossumDevice = require('./device');
const ProjectStore = require('./projectstore');
const { WaveLibrary, parsePulse } = require('./waves');
const installer = require('./installer');
const unityInstaller = require('./unity-installer');

// ---------------------------------------------------------------------------
// 参数
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
function arg(name, fallback) {
    const i = argv.indexOf('--' + name);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
}
let LEGACY_PROFILE = path.resolve(path.join(__dirname, '..', 'profiles', 'celesphonia.json'));
if (!fs.existsSync(LEGACY_PROFILE)) {
    LEGACY_PROFILE = path.resolve(path.join(__dirname, '..', '..', 'profiles', 'celesphonia.json'));
}
if (arg('profile', null)) { LEGACY_PROFILE = path.resolve(arg('profile', null)); }
const DATA_DIR = path.join(__dirname, 'data');
const PORT = parseInt(arg('port', '17870'), 10);
const HTTP_PORT = parseInt(arg('http-port', '0'), 10);
const WEB_DIR = path.resolve(arg('web', path.join(__dirname, '..', 'web')));
const OPEN_BROWSER = argv.includes('--open');
const HTTP_URL = arg('http', null);
const VERBOSE = argv.includes('--verbose');

const store = new ProjectStore(DATA_DIR, LEGACY_PROFILE);
const waves = new WaveLibrary(DATA_DIR);
const OcrService = require('./ocr');
const OCR_DAEMON = path.join(__dirname, 'ocr-daemon.ps1');
const ocr = new OcrService({ daemon: OCR_DAEMON, port: 17892 });

let DEVICE_DAEMON = path.join(__dirname, 'opossum-daemon.ps1');
if (!fs.existsSync(DEVICE_DAEMON)) {
    DEVICE_DAEMON = path.join(__dirname, '..', 'OpossumBle', 'opossum-daemon.ps1');
}
const device = new OpossumDevice({ daemon: DEVICE_DAEMON, port: 17890, waves: waves });

function buildActiveProfile() {
    const p = store.activeProject();
    const s = store.activeScene(p);
    return {
        name: p ? p.name : '',
        game: p ? p.name : '',
        gameDir: p ? p.gameDir : '',
        vars: (p && p.vars) || {},
        switches: (p && p.switches) || {},
        output: (s && s.output) || { mode: 'device' },
        rules: (s && s.rules) || []
    };
}

let profile = buildActiveProfile();
const varById = new Map();       // id -> name
const varByName = new Map();     // name -> id
const swById = new Map();
const swByName = new Map();
let rules = [];

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

const OP_MAP = { gte: '>=', lte: '<=', eq: '==', neq: '!=' };

function compileTrigger(t) {
    if (!t || typeof t !== 'object') { return 'false'; }
    const src = t.source;
    const op = t.op;
    const v = t.value;
    if (src === 'expression') { return String(v || 'true'); }
    if (src === 'msg' || src === 'ticker' || src === 'battlelog') {
        if (op === 'contains') { return `${src}.includes(${JSON.stringify(String(v == null ? '' : v))})`; }
        if (op === 'regex') { return `new RegExp(${JSON.stringify(String(v == null ? '' : v))}).test(${src})`; }
        if (op === 'icon') {
            const arr = src === 'msg' ? 'msgIcons' : 'tickerIcons';
            return `${arr}.includes(${Number(v) || 0})`;
        }
        if (op === 'color') {
            const arr = src === 'msg' ? 'msgColors' : 'tickerColors';
            return `${arr}.includes(${Number(v) || 0})`;
        }
    }
    if (src === 'ocr') {
        if (op === 'contains') { return `ocr.includes(${JSON.stringify(String(v == null ? '' : v))})`; }
        if (op === 'regex') { return `new RegExp(${JSON.stringify(String(v == null ? '' : v))}).test(ocr)`; }
    }
    if (src === 'unity') {
        if (op === 'contains') { return `unity.includes(${JSON.stringify(String(v == null ? '' : v))})`; }
        if (op === 'regex') { return `new RegExp(${JSON.stringify(String(v == null ? '' : v))}).test(unity)`; }
    }
    if (src === 'tickerId') {
        if (op === 'equals') { return `tickerId === ${JSON.stringify(String(v || ''))}`; }
        if (op === 'prefix') { return `tickerId.startsWith(${JSON.stringify(String(v || ''))})`; }
        if (op === 'contains') { return `tickerId.includes(${JSON.stringify(String(v || ''))})`; }
    }
    if (src === 'var') {
        const id = varByName.get(String(t.name || ''));
        if (id === undefined) { return 'false'; }
        return `v(${id}) ${OP_MAP[op] || '>='} ${Number(v) || 0}`;
    }
    if (src === 'switch') {
        const id = swByName.get(String(t.name || ''));
        if (id === undefined) { return 'false'; }
        return `sw(${id}) === ${op === 'off' ? 'false' : 'true'}`;
    }
    return 'false';
}

function actionsFromOutputs(outputs) {
    const actions = [];
    const releases = [];
    for (const ch of ['A', 'B']) {
        const o = outputs && outputs[ch];
        if (!o || !o.enabled) { continue; }
        const strength = Math.max(0, Math.min(200, num(o.strength)));
        if (strength <= 0) { continue; }
        actions.push({
            channel: ch,
            strength: strength,
            wave: o.wave || 'const',
            seconds: num(o.seconds) || 0
        });
        releases.push({ channel: ch, strength: 0 });
    }
    return {
        action: actions.length ? actions : { channel: 'A', strength: 0 },
        release: releases.length ? releases : null
    };
}

function buildRules(list) {
    return (list || []).map((r, i) => {
        let when = r.when;
        let action = r.action;
        let release = r.release || null;
        if (r.trigger) {
            when = compileTrigger(r.trigger);
            const compiled = actionsFromOutputs(r.outputs || {});
            action = compiled.action;
            release = compiled.release;
        }
        return {
            id: r.id || ('rule#' + (i + 1)),
            enabled: r.enabled !== false,
            when: when,
            trigger: r.trigger || null,
            outputs: r.outputs || null,
            mode: r.mode || 'hold',
            action: action,
            release: release,
            cooldownMs: num(r.cooldownMs) || 800,
            repeatMs: num(r.repeatMs) || 1000,
            lastFire: 0,
            lastErrorAt: 0,
            active: false,
            broken: false
        };
    });
}

function applyProfile(p) {
    profile = p;
    varById.clear();
    varByName.clear();
    swById.clear();
    swByName.clear();
    for (const [name, id] of Object.entries(p.vars || {})) {
        varById.set(Number(id), name);
        varByName.set(name, Number(id));
    }
    for (const [name, id] of Object.entries(p.switches || {})) {
        swById.set(Number(id), name);
        swByName.set(name, Number(id));
    }
    rules = buildRules(p.rules);
}

applyProfile(profile);

function projectSummary() {
    return store.list().map((p) => ({
        id: p.id, name: p.name, gameDir: p.gameDir,
        activeScene: p.activeScene,
        scenes: p.scenes.map((s) => ({ id: s.id, name: s.name, count: (s.rules || []).length }))
    }));
}

function reloadActive() {
    profile = buildActiveProfile();
    if (profile.gameDir) { gameDir = path.resolve(profile.gameDir); }
    applyProfile(profile);
    resetChannels();
    const p = store.activeProject();
    const s = store.activeScene(p);
    broadcast({
        type: 'config', profile: profile, output: profile.output,
        project: p ? { id: p.id, name: p.name, gameDir: p.gameDir } : null,
        scene: s ? { id: s.id, name: s.name } : null,
        projects: projectSummary(), ts: Date.now()
    });
}

// ---------------------------------------------------------------------------
// 状态
// ---------------------------------------------------------------------------
const state = {
    connected: false,
    vars: {},          // id -> number
    switches: {},      // id -> boolean
    mapId: 0,
    mapName: '',
    actor: null,
    message: '',
    messageRaw: '',
    messageSpeaker: '',
    messageMapId: 0,
    messageEventId: 0,
    messageEventName: '',
    actors: [],
    party: [],
    battlelog: '',
    battlelogRaw: '',
    lastBattlelogAt: 0,
    ticker: '',
    tickerRaw: '',
    tickerId: '',
    tickerKind: '',
    tickerPattern: '',
    tickerActor: 0,
    tickerMetaAt: 0,
    ocr: '',
    ocrRaw: '',
    ocrAt: 0,
    unityText: '',
    unityName: '',
    unityChoices: [],
    unityAt: 0,
    lastMessageAt: 0,
    lastTickerAt: 0,
    events: 0
};

const channelOwner = {};

function resetChannels() {
    for (const k of Object.keys(channelOwner)) { delete channelOwner[k]; }
}

// ---------------------------------------------------------------------------
// SSE（给浏览器界面用）
// ---------------------------------------------------------------------------
const sseClients = new Set();
const BROADCAST_TYPES = new Set(['hello', 'map', 'message', 'message_end', 'ticker', 'ticker_meta', 'snapshot', 'var', 'switch', 'battlelog', 'unity']);

function broadcast(obj) {
    const line = 'data: ' + JSON.stringify(obj) + '\n\n';
    for (const res of sseClients) {
        try { res.write(line); } catch (e) { sseClients.delete(res); }
    }
}

// ---------------------------------------------------------------------------
// 文本展开/清洗
// ---------------------------------------------------------------------------
function expandText(text) {
    if (typeof text !== 'string') { return ''; }
    let s = text.replace(/\\v\[(\d+)\]/gi, (_, id) => String(num(state.vars[Number(id)])));
    // 图标/颜色/控制符：保留成可匹配的占位，再统一清洗
    s = s.replace(/\\[iI]\[(\d+)\]/g, ' [icon:$1] ');
    s = s.replace(/\\[cC]\[(\d+)\]/g, ' [color:$1] ');
    s = s.replace(/\\[nN]\[(\d+)\]/g, (_, id) => ' ' + (state.actors[Number(id)] || ('角色' + id)) + ' ');
    s = s.replace(/\\[pP]\[(\d+)\]/g, (_, i) => {
        const member = state.party[Number(i) - 1];
        return ' ' + ((member && member.name) || ('队员' + i)) + ' ';
    });
    s = s.replace(/\\[gG]/g, ' ');
    s = s.replace(/\\[{}$>!<.^|]/g, '');
    s = s.replace(/\\+/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
}

// YEP_MessageCore 的名字框：\n<名字>（名字里可以再含 \N[n] / \V[n] / \P[n]）
function splitNameBox(raw) {
    let speaker = '';
    const text = String(raw || '').replace(/\\[nN]<([\s\S]*?)>/g, (_, inner) => {
        if (!speaker) {
            speaker = String(inner)
                .replace(/\\[vV]\[(\d+)\]/g, (__, id) => String(num(state.vars[Number(id)])))
                .replace(/\\[nN]\[(\d+)\]/g, (__, id) => state.actors[Number(id)] || '')
                .replace(/\\[pP]\[(\d+)\]/g, (__, i) => {
                    const member = state.party[Number(i) - 1];
                    return (member && member.name) || '';
                })
                .replace(/\\[iI]\[(\d+)\]/g, '')
                .replace(/\\[cC]\[(\d+)\]/g, '')
                .replace(/\\+/g, '')
                .trim();
        }
        return '';
    });
    return { speaker, text };
}

// ---------------------------------------------------------------------------
// 图标 / 颜色（从原文提取，供规则和界面使用）
// ---------------------------------------------------------------------------
function extractCodes(text) {
    const icons = [];
    const colors = [];
    if (typeof text === 'string') {
        let m;
        const re = /\\[iI]\[(\d+)\]|\\[cC]\[(\d+)\]/g;
        while ((m = re.exec(text)) !== null) {
            if (m[1] !== undefined) { icons.push(Number(m[1])); }
            if (m[2] !== undefined) { colors.push(Number(m[2])); }
        }
    }
    return { icons, colors };
}

function buildContext() {
    const msgCodes = extractCodes(state.messageRaw);
    const tickCodes = extractCodes(state.tickerRaw);
    const blCodes = extractCodes(state.battlelogRaw);
    const ctx = {
        v: (id) => num(state.vars[Number(id)]),
        sw: (id) => !!state.switches[Number(id)],
        mapId: state.mapId,
        map: state.mapName,
        actor: state.actor || {},
        msg: state.message,
        rawMsg: state.messageRaw,
        speaker: state.messageSpeaker,
        battlelog: state.battlelog,
        battlelogRaw: state.battlelogRaw,
        ticker: state.ticker,
        rawTicker: state.tickerRaw,
        tickerId: state.tickerId,
        tickerKind: state.tickerKind,
        tickerPattern: state.tickerPattern,
        tickerActor: state.tickerActor,
        ocr: state.ocr,
        ocrRaw: state.ocrRaw,
        unity: state.unityText,
        unityName: state.unityName,
        unityChoices: state.unityChoices,
        msgIcons: msgCodes.icons,
        msgColors: msgCodes.colors,
        tickerIcons: tickCodes.icons,
        tickerColors: tickCodes.colors,
        battlelogIcons: blCodes.icons,
        battlelogColors: blCodes.colors,
        eventId: state.messageEventId,
        eventName: state.messageEventName,
        now: Date.now(),
        Math, Number, String, Boolean, JSON, Array, Object, RegExp
    };
    for (const [id, name] of varById) { ctx[name] = num(state.vars[id]); }
    for (const [id, name] of swById) { ctx[name] = !!state.switches[id]; }
    return ctx;
}

function evalRule(rule, context) {
    try {
        return Boolean(vm.runInContext(rule.when, context, { timeout: 50 }));
    } catch (e) {
        const now = Date.now();
        if (!rule.broken || now - rule.lastErrorAt > 10000) {
            console.error(`[规则错误] ${rule.id}: ${e.message}`);
            rule.lastErrorAt = now;
            rule.broken = true;
        }
        return false;
    }
}

// ---------------------------------------------------------------------------
// 输出适配器
// ---------------------------------------------------------------------------
const outputs = [];

const outputSettings = {
    mode: (profile.output && profile.output.mode) || 'display'
};

function logOutput() {
    return {
        name: 'log',
        apply(rule, action, ctx, edge) {
            const ch = action.channel ? action.channel.toUpperCase() : '?';
            const parts = [];
            if (action.strength !== undefined) { parts.push(`强度=${action.strength}`); }
            if (action.pulse) { parts.push(`波形=${action.pulse}`); }
            if (action.seconds) { parts.push(`时长=${action.seconds}s`); }
            if (action.label) { parts.push(`标签=${action.label}`); }
            console.log(`[${edge}] ${rule.id}  通道${ch}  ${parts.join('  ')}`);
        }
    };
}

function httpOutput(url) {
    return {
        name: 'http',
        apply(rule, action, ctx, edge) {
            const body = JSON.stringify({
                rule: rule.id, edge, action,
                state: { vars: state.vars, switches: state.switches, mapId: state.mapId, actor: state.actor },
                ts: Date.now()
            });
            fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
                .catch((e) => console.error('[http] ' + e.message));
        }
    };
}

// ---------------------------------------------------------------------------
// 触发
// ---------------------------------------------------------------------------
let evalTimer = null;

function scheduleEval() {
    if (evalTimer) { return; }
    evalTimer = setTimeout(() => {
        evalTimer = null;
        evaluateAll();
    }, 30);
}

function evaluateAll() {
    const context = vm.createContext(buildContext());
    for (const rule of rules) {
        if (!rule.enabled) {
            if (rule.active) {
                rule.active = false;
                if (rule.release) { fire(rule, rule.release, null, 'OFF'); }
            }
            continue;
        }
        const result = evalRule(rule, context);
        const now = Date.now();
        if (rule.mode === 'repeat') {
            if (result && now - rule.lastFire >= rule.repeatMs) {
                rule.lastFire = now;
                fire(rule, rule.action, null, 'ON');
            }
            continue;
        }
        if (result && !rule.active) {
            if (now - rule.lastFire >= rule.cooldownMs) {
                rule.lastFire = now;
                fire(rule, rule.action, null, 'ON');
            }
            rule.active = true;
        } else if (!result && rule.active) {
            rule.active = false;
            if (rule.release) { fire(rule, rule.release, null, 'OFF'); }
        }
    }
}

function ruleActions(rule) {
    return Array.isArray(rule.action) ? rule.action : [rule.action];
}

// 当一条规则释放通道时，如果还有别的规则在占用同一通道，恢复其中强度最高的那条
function findFallback(ch, exclude) {
    let best = null;
    for (const r of rules) {
        if (r === exclude || !r.active) { continue; }
        for (const a of ruleActions(r)) {
            if (a && a.channel && String(a.channel).toUpperCase() === ch && num(a.strength) > 0) {
                if (!best || num(a.strength) > num(best.action.strength)) {
                    best = { rule: r, action: a };
                }
            }
        }
    }
    return best;
}

function fire(rule, action, ctx, edge) {
    const actions = Array.isArray(action) ? action : [action];
    for (const raw of actions) {
        if (!raw || raw.enabled === false) { continue; }
        // 强度范围按 DG-LAB 官方：0–200
        const a = Object.assign({}, raw);
        if (a.strength !== undefined) {
            a.strength = Math.max(0, Math.min(200, num(a.strength)));
        }
        if (waves.isRandom(a.wave)) { a.wave = waves.pickRandomName(); }
        // 通道归属：避免 A 规则把 B 规则正在用的通道清零
        if (a.channel) {
            const ch = String(a.channel).toUpperCase();
            if (edge === 'ON') {
                channelOwner[ch] = rule.id;
            } else if (edge === 'OFF') {
                if (channelOwner[ch] && channelOwner[ch] !== rule.id) { continue; }
                const fallback = findFallback(ch, rule);
                if (fallback) {
                    channelOwner[ch] = fallback.rule.id;
                    for (const out of outputs) { out.apply(fallback.rule, fallback.action, ctx, 'ON'); }
                    continue;
                }
                delete channelOwner[ch];
            }
        }
        for (const out of outputs) { out.apply(rule, a, ctx, edge); }
        if (outputSettings.mode === 'device') { device.applyAction(a, edge, rule.id); }
        broadcast({ type: 'action', rule: rule.id, edge: edge, action: a, ts: Date.now() });
    }
}

// ---------------------------------------------------------------------------
// 事件处理
// ---------------------------------------------------------------------------
function handle(obj) {
    state.events++;
    let changed = false;

    switch (obj.t) {
        case 'hello':
            console.log(`[连接] ${obj.game}  ${obj.engine} ${obj.version}  map=${obj.mapId}`);
            state.mapId = obj.mapId || state.mapId;
            if (Array.isArray(obj.actors)) { state.actors = obj.actors; }
            break;

        case 'unity': {
            const kind = String(obj.kind || '').toUpperCase();
            const text = String(obj.text || '');
            if (!text) { break; }
            state.unityAt = Date.now();
            if (kind === 'NAME') {
                state.unityName = text;
                state.messageSpeaker = text;
                changed = true;
            } else if (kind === 'DIALOGUE') {
                if (text !== state.unityText) { state.unityChoices = []; }
                state.unityText = text;
                state.messageRaw = text;
                state.message = expandText(text);
                state.messageSpeaker = state.unityName || '';
                changed = true;
            } else if (kind === 'CHOICE') {
                if (state.unityChoices.indexOf(text) < 0) { state.unityChoices.push(text); }
                changed = true;
            }
            if (VERBOSE) { console.log(`  unity ${kind}: ${text}`); }
            break;
        }

        case 'var': {
            const id = Number(obj.id);
            state.vars[id] = obj.value;
            changed = true;
            if (VERBOSE) { console.log(`  var ${id} ${varById.get(id) || obj.name || ''} = ${obj.value}`); }
            break;
        }

        case 'switch': {
            const id = Number(obj.id);
            state.switches[id] = !!obj.value;
            changed = true;
            if (VERBOSE) { console.log(`  switch ${id} ${swById.get(id) || obj.name || ''} = ${obj.value}`); }
            break;
        }

        case 'map':
            state.mapId = obj.id;
            state.mapName = obj.name || '';
            changed = true;
            console.log(`[地图] ${obj.id} ${obj.name}`);
            break;

        case 'snapshot':
            state.mapId = obj.mapId || state.mapId;
            state.mapName = obj.map || state.mapName;
            state.actor = obj.actor || state.actor;
            if (Array.isArray(obj.party)) { state.party = obj.party; }
            if (obj.vars) {
                for (const [id, value] of Object.entries(obj.vars)) { state.vars[Number(id)] = value; }
            }
            if (obj.switches) {
                for (const [id, value] of Object.entries(obj.switches)) { state.switches[Number(id)] = !!value; }
            }
            changed = true;
            break;

        case 'battlelog': {
            const now = Date.now();
            const text = String(obj.text || '');
            if (text === state.battlelogRaw && now - state.lastBattlelogAt < 100) { break; }
            state.battlelogRaw = text;
            state.battlelog = expandText(text);
            state.lastBattlelogAt = now;
            changed = true;
            if (VERBOSE) { console.log(`  battlelog: ${state.battlelog}`); }
            break;
        }

        case 'ticker_meta': {
            state.tickerId = obj.id || '';
            state.tickerKind = obj.kind || '';
            state.tickerPattern = obj.pattern || '';
            state.tickerActor = Number(obj.actorId || 0);
            state.tickerMetaAt = Date.now();
            changed = true;
            if (VERBOSE) { console.log(`  ticker_meta: ${state.tickerKind}/${state.tickerId}/${state.tickerPattern}`); }
            break;
        }

        case 'ticker': {
            const now = Date.now();
            if (obj.text === state.tickerRaw && now - state.lastTickerAt < 200) { break; }
            // 若这条 ticker 不是紧跟在 TickerBTM/TickerSys 之后，清掉上一条的语义 ID
            if (now - state.tickerMetaAt > 150) {
                state.tickerId = '';
                state.tickerKind = '';
                state.tickerPattern = '';
                state.tickerActor = 0;
            }
            state.tickerRaw = obj.text || '';
            state.ticker = expandText(state.tickerRaw);
            state.lastTickerAt = now;
            changed = true;
            if (VERBOSE) { console.log(`  ticker[${state.tickerId || '-'}]: ${state.ticker}`); }
            break;
        }

        case 'message': {
            const now = Date.now();
            if (obj.text === state.messageRaw && now - state.lastMessageAt < 300) { break; }
            const parsed = splitNameBox(obj.text || '');
            state.messageRaw = parsed.text;
            state.message = expandText(parsed.text);
            state.messageSpeaker = parsed.speaker || obj.speaker || '';
            state.messageMapId = Number(obj.mapId || state.mapId || 0);
            state.messageEventId = Number(obj.eventId || 0);
            state.messageEventName = obj.eventName || '';
            state.lastMessageAt = now;
            changed = true;
            // 给界面的事件也去掉名字框、补上 speaker
            obj.text = parsed.text;
            obj.speaker = state.messageSpeaker;
            if (VERBOSE) { console.log(`  message[${obj.phase}] (${state.messageSpeaker || '-'} / ${state.messageEventName || state.messageEventId}): ${state.message}`); }
            break;
        }

        case 'message_end': {
            state.message = '';
            state.messageRaw = '';
            state.messageSpeaker = '';
            state.messageEventId = 0;
            state.messageEventName = '';
            changed = true;
            if (VERBOSE) { console.log('  message_end'); }
            break;
        }

        default:
            break;
    }

    if (changed) { scheduleEval(); }
    if (obj.t === 'unity') { obj.speaker = state.messageSpeaker; }
    if (BROADCAST_TYPES.has(obj.t)) { broadcast({ type: 'event', event: obj }); }
}

// ---------------------------------------------------------------------------
// 启动
// ---------------------------------------------------------------------------
console.log(`DGRMHook bridge`);
{
    const p = store.activeProject();
    const s = store.activeScene(p);
    console.log(`项目: ${p ? p.name : '-'}  (${p && p.gameDir ? p.gameDir : '未选择游戏'})`);
    console.log(`场景: ${s ? s.name : '-'}`);
}
console.log(`信号: ${[...varByName.keys()].join(', ') || '(无变量)'} | 开关: ${[...swByName.keys()].join(', ') || '(无)'}`);
console.log(`规则: ${rules.length} 条`);
for (const r of rules) { console.log(`  - ${r.id}: ${r.when}`); }

outputs.push(logOutput());
if (HTTP_URL) { outputs.push(httpOutput(HTTP_URL)); console.log(`HTTP 输出: ${HTTP_URL}`); }
console.log(`输出模式: ${outputSettings.mode === 'device' ? '直接驱动负鼠' : '仅界面/日志'}`);

let gameDir = path.resolve(profile.gameDir || arg('game', '.'));

function jsonRes(res, code, obj) {
    res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(obj));
}

function readBody(req, cb) {
    let body = '';
    let tooBig = false;
    req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 2 * 1024 * 1024) { tooBig = true; req.destroy(); }
    });
    req.on('end', () => {
        if (tooBig) { cb(new Error('请求体过大')); return; }
        cb(null, body);
    });
    req.on('error', (e) => cb(e));
}

function validateProfile(p) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) { throw new Error('profile 必须是对象'); }
    if (!Array.isArray(p.rules)) { throw new Error('rules 必须是数组'); }
    const seen = new Set();
    for (const r of p.rules) {
        if (!r || typeof r !== 'object') { throw new Error('规则必须是对象'); }
        if (!r.id || typeof r.id !== 'string') { throw new Error('规则缺少 id'); }
        if (seen.has(r.id)) { throw new Error('规则 id 重复：' + r.id); }
        seen.add(r.id);

        if (r.trigger && typeof r.trigger === 'object') {
            const t = r.trigger;
            if (t.source === 'expression') {
                if (typeof t.value !== 'string' || !t.value.trim()) { throw new Error(r.id + ' 的高级表达式为空'); }
                try { new vm.Script(t.value); } catch (e) { throw new Error(r.id + ' 的表达式语法错误：' + e.message); }
            } else if (t.source === 'var') {
                if (!t.name || !(p.vars && Object.prototype.hasOwnProperty.call(p.vars, t.name))) {
                    throw new Error(r.id + ' 的变量不存在：' + (t.name || ''));
                }
                if (!Number.isFinite(Number(t.value))) { throw new Error(r.id + ' 的阈值不是数字'); }
            } else if (t.source === 'switch') {
                if (!t.name || !(p.switches && Object.prototype.hasOwnProperty.call(p.switches, t.name))) {
                    throw new Error(r.id + ' 的开关不存在：' + (t.name || ''));
                }
            } else if (['msg', 'ticker', 'battlelog', 'ocr', 'unity', 'tickerId'].indexOf(t.source) < 0) {
                throw new Error(r.id + ' 的触发来源无效');
            } else if (t.source === 'tickerId') {
                if (t.value === undefined || String(t.value).trim() === '') { throw new Error(r.id + ' 缺少播报 ID'); }
            } else {
                if (t.value === undefined || String(t.value).trim() === '') { throw new Error(r.id + ' 缺少条件值'); }
            }
        } else if (typeof r.when === 'string' && r.when.trim()) {
            try { new vm.Script(r.when); } catch (e) { throw new Error(r.id + ' 的条件语法错误：' + e.message); }
        } else {
            throw new Error(r.id + ' 缺少 trigger 或 when');
        }

        if (r.outputs && typeof r.outputs === 'object') {
            const any = ['A', 'B'].some((ch) => r.outputs[ch] && r.outputs[ch].enabled && Number(r.outputs[ch].strength) > 0);
            if (!any) { throw new Error(r.id + ' 至少需要一个通道，且强度大于 0'); }
        } else if (r.action && typeof r.action === 'object') {
            const a = Array.isArray(r.action) ? r.action[0] : r.action;
            if (!a || !a.channel) { throw new Error(r.id + ' 的 action 缺少 channel'); }
        } else {
            throw new Error(r.id + ' 缺少 outputs 或 action');
        }
    }
    return true;
}

function withJson(req, res, fn) {
    readBody(req, (err, body) => {
        if (err) { jsonRes(res, 400, { ok: false, error: err.message }); return; }
        let m;
        try { m = JSON.parse(body || '{}'); } catch (e) { jsonRes(res, 400, { ok: false, error: 'JSON 解析失败' }); return; }
        try { fn(m); } catch (e) { jsonRes(res, 400, { ok: false, error: e.message }); }
    });
}
function runAsync(res, fn) {
    Promise.resolve().then(fn).catch((e) => {
        jsonRes(res, 500, { ok: false, error: e.message });
    });
}
function findSystemAsset(name) {
    if (!/^[A-Za-z0-9_.\-]+$/.test(name)) { return null; }
    const candidates = [
        path.join(gameDir, 'www', 'img', 'system', name),
        path.join(gameDir, 'img', 'system', name)
    ];
    for (const c of candidates) {
        try { if (fs.existsSync(c)) { return c; } } catch (e) { /* ignore */ }
    }
    return null;
}

if (require.main === module) {
    const server = net.createServer((socket) => {
        console.log('[+] 游戏端已连接');
        state.connected = true;
        broadcast({ type: 'conn', connected: true, ts: Date.now() });
        socket.setEncoding('utf8');
        let buf = '';
        socket.on('data', (chunk) => {
            buf += chunk;
            let idx;
            while ((idx = buf.indexOf('\n')) >= 0) {
                const line = buf.slice(0, idx).trim();
                buf = buf.slice(idx + 1);
                if (!line) { continue; }
                let obj;
                try { obj = JSON.parse(line); } catch (e) { continue; }
                handle(obj);
            }
        });
        socket.on('close', () => {
            console.log('[-] 游戏端断开');
            state.connected = false;
            broadcast({ type: 'conn', connected: false, ts: Date.now() });
        });
        socket.on('error', () => { /* ignore */ });
    });
    server.listen(PORT, '127.0.0.1', () => {
        console.log(`\n监听 127.0.0.1:${PORT}，等待游戏连接…\n`);
    });

    // -----------------------------------------------------------------------
    // 可选的浏览器界面
    // -----------------------------------------------------------------------
    if (HTTP_PORT > 0) {
        const indexFile = path.join(WEB_DIR, 'index.html');
        const httpServer = http.createServer((req, res) => {
            const url = req.url.split('?')[0];

            if (url === '/' || url === '/index.html') {
                fs.readFile(indexFile, (err, data) => {
                    if (err) {
                        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
                        res.end('找不到 web/index.html：' + indexFile);
                        return;
                    }
                    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
                    res.end(data);
                });
                return;
            }

            if (url === '/i18n.js') {
                fs.readFile(path.join(WEB_DIR, 'i18n.js'), (err, data) => {
                    if (err) { res.writeHead(404); res.end('not found'); return; }
                    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' });
                    res.end(data);
                });
                return;
            }

            if (url === '/state') {
                const body = JSON.stringify({
                    connected: state.connected,
                    mapId: state.mapId,
                    map: state.mapName,
                    message: state.message,
                    messageRaw: state.messageRaw,
                    messageEventName: state.messageEventName,
                    messageSpeaker: state.messageSpeaker,
                    battlelog: state.battlelog,
                    battlelogRaw: state.battlelogRaw,
                    actors: state.actors,
                    party: state.party,
                    ticker: state.ticker,
                    tickerRaw: state.tickerRaw,
                    tickerId: state.tickerId,
                    tickerKind: state.tickerKind,
                    ocr: state.ocr,
                    ocrRaw: state.ocrRaw,
                    unity: state.unityText,
                    unityName: state.unityName,
                    unityChoices: state.unityChoices,
                    actor: state.actor,
                    vars: state.vars,
                    rules: rules.map((r) => ({ id: r.id, active: r.active, enabled: r.enabled, when: r.when })),
                    output: outputSettings,
                    device: device.status(),
                    gameDir: gameDir,
                    ts: Date.now()
                });
                res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
                res.end(body);
                return;
            }

            if (url === '/api/profile' && req.method === 'GET') {
                const p = store.activeProject();
                const s = store.activeScene(p);
                jsonRes(res, 200, {
                    ok: true, profile: profile, output: outputSettings, gameDir: gameDir,
                    project: p ? { id: p.id, name: p.name, gameDir: p.gameDir } : null,
                    scene: s ? { id: s.id, name: s.name } : null,
                    projects: projectSummary()
                });
                return;
            }

            if (url === '/api/profile' && req.method === 'POST') {
                readBody(req, (err, body) => {
                    if (err) { jsonRes(res, 400, { ok: false, error: err.message }); return; }
                    try {
                        const p = JSON.parse(body);
                        validateProfile(p);
                        const proj = store.activeProject();
                        const scene = store.activeScene(proj);
                        if (!proj || !scene) { throw new Error('没有活动项目/场景'); }
                        store.setRules(proj.id, scene.id, p.rules);
                        if (p.output && p.output.mode) {
                            store.setOutput(proj.id, scene.id, { mode: p.output.mode === 'device' ? 'device' : 'display' });
                        }
                        if (p.vars && typeof p.vars === 'object') { proj.vars = p.vars; }
                        if (p.switches && typeof p.switches === 'object') { proj.switches = p.switches; }
                        store.save();
                        reloadActive();
                        console.log(`[配置] 已保存 ${p.rules.length} 条规则 (${proj.name} / ${scene.name})`);
                        jsonRes(res, 200, { ok: true, rules: p.rules.length });
                    } catch (e) {
                        jsonRes(res, 400, { ok: false, error: e.message });
                    }
                });
                return;
            }

            if (url === '/api/output' && req.method === 'POST') {
                readBody(req, (err, body) => {
                    if (err) { jsonRes(res, 400, { ok: false, error: err.message }); return; }
                    try {
                        const o = JSON.parse(body);
                        outputSettings.mode = o.mode === 'device' ? 'device' : 'display';
                        const proj = store.activeProject();
                        const scene = store.activeScene(proj);
                        if (proj && scene) { store.setOutput(proj.id, scene.id, { mode: outputSettings.mode }); }
                        profile.output = { mode: outputSettings.mode };
                        broadcast({ type: 'config', profile: profile, output: outputSettings, ts: Date.now() });
                        console.log(`[输出] 模式=${outputSettings.mode}`);
                        jsonRes(res, 200, { ok: true, output: outputSettings });
                    } catch (e) {
                        jsonRes(res, 400, { ok: false, error: e.message });
                    }
                });
                return;
            }

            // ---------------- 项目 / 场景 / 预设 ----------------
            if (url === '/api/projects' && req.method === 'GET') {
                jsonRes(res, 200, { ok: true, active: store.data.activeProject, projects: projectSummary() });
                return;
            }

            if (url === '/api/projects' && req.method === 'POST') {
                withJson(req, res, (m) => {
                    const p = store.createProject(m.name, m.gameDir, {
                        vars: profile.vars, switches: profile.switches, rules: []
                    });
                    reloadActive();
                    jsonRes(res, 200, { ok: true, project: { id: p.id, name: p.name }, projects: projectSummary() });
                });
                return;
            }

            if (url === '/api/projects/import' && req.method === 'POST') {
                withJson(req, res, (m) => {
                    const obj = JSON.parse(m.content);
                    const src = obj.project || obj;
                    if (!src || !Array.isArray(src.scenes)) { throw new Error('不是有效的项目文件'); }
                    const p = store.createProject(src.name, src.gameDir, { vars: src.vars, switches: src.switches, rules: [] });
                    p.scenes = src.scenes.map((s, i) => ({
                        id: 's_' + Date.now().toString(36) + i,
                        name: s.name || ('场景' + (i + 1)),
                        rules: s.rules || [],
                        output: s.output || { mode: 'device' }
                    }));
                    p.activeScene = p.scenes[0].id;
                    store.save();
                    reloadActive();
                    jsonRes(res, 200, { ok: true, project: { id: p.id, name: p.name }, projects: projectSummary() });
                });
                return;
            }

            let mm = url.match(/^\/api\/projects\/([^/]+)\/export$/);
            if (mm && req.method === 'GET') {
                jsonRes(res, 200, { ok: true, data: store.exportProject(decodeURIComponent(mm[1])) });
                return;
            }

            mm = url.match(/^\/api\/projects\/([^/]+)\/activate$/);
            if (mm && req.method === 'POST') {
                store.activateProject(decodeURIComponent(mm[1]));
                reloadActive();
                jsonRes(res, 200, { ok: true, projects: projectSummary() });
                return;
            }

            mm = url.match(/^\/api\/projects\/([^/]+)\/scenes$/);
            if (mm && req.method === 'POST') {
                withJson(req, res, (m) => {
                    const s = store.createScene(decodeURIComponent(mm[1]), m.name);
                    reloadActive();
                    jsonRes(res, 200, { ok: true, scene: { id: s.id, name: s.name }, projects: projectSummary() });
                });
                return;
            }

            mm = url.match(/^\/api\/projects\/([^/]+)\/scenes\/([^/]+)\/activate$/);
            if (mm && req.method === 'POST') {
                store.activateScene(decodeURIComponent(mm[1]), decodeURIComponent(mm[2]));
                reloadActive();
                jsonRes(res, 200, { ok: true, projects: projectSummary() });
                return;
            }

            mm = url.match(/^\/api\/projects\/([^/]+)\/scenes\/([^/]+)$/);
            if (mm) {
                const pid = decodeURIComponent(mm[1]);
                const sid = decodeURIComponent(mm[2]);
                if (req.method === 'PATCH') {
                    withJson(req, res, (m) => {
                        const s = store.renameScene(pid, sid, m.name);
                        reloadActive();
                        jsonRes(res, 200, { ok: true, scene: { id: s.id, name: s.name }, projects: projectSummary() });
                    });
                    return;
                }
                if (req.method === 'DELETE') {
                    store.deleteScene(pid, sid);
                    reloadActive();
                    jsonRes(res, 200, { ok: true, projects: projectSummary() });
                    return;
                }
            }

            mm = url.match(/^\/api\/projects\/([^/]+)$/);
            if (mm) {
                const pid = decodeURIComponent(mm[1]);
                if (req.method === 'PATCH') {
                    withJson(req, res, (m) => {
                        const p = store.renameProject(pid, m.name);
                        reloadActive();
                        jsonRes(res, 200, { ok: true, project: { id: p.id, name: p.name }, projects: projectSummary() });
                    });
                    return;
                }
                if (req.method === 'DELETE') {
                    store.deleteProject(pid);
                    reloadActive();
                    jsonRes(res, 200, { ok: true, projects: projectSummary() });
                    return;
                }
            }

            if (url === '/api/scene/export' && req.method === 'GET') {
                const p = store.activeProject();
                const s = store.activeScene(p);
                jsonRes(res, 200, { ok: true, name: s.name, rules: s.rules });
                return;
            }

            if (url === '/api/scene/import' && req.method === 'POST') {
                withJson(req, res, (m) => {
                    const obj = JSON.parse(m.content);
                    const p = store.activeProject();
                    const s = store.activeScene(p);
                    store.importScene(p.id, s.id, obj, m.replace !== false);
                    reloadActive();
                    jsonRes(res, 200, { ok: true, rules: s.rules.length });
                });
                return;
            }

            // ---------------- 波形库 ----------------
            if (url === '/api/waves' && req.method === 'GET') {
                jsonRes(res, 200, { ok: true, waves: waves.list() });
                return;
            }

            if (url === '/api/waves/import' && req.method === 'POST') {
                withJson(req, res, (m) => {
                    const list = parsePulse(m.content, m.filename || '导入波形');
                    list.forEach((w) => waves.addCustom(w.name, w.points, w.header));
                    jsonRes(res, 200, { ok: true, imported: list.map((w) => w.name), waves: waves.list() });
                });
                return;
            }

            if (url === '/api/waves/export' && req.method === 'GET') {
                const q = new URL(req.url, 'http://localhost').searchParams;
                const name = q.get('name') || 'const';
                jsonRes(res, 200, { ok: true, filename: name + '.pulse', content: waves.toPulseText(name) });
                return;
            }

            mm = url.match(/^\/api\/waves\/([^/]+)$/);
            if (mm && req.method === 'DELETE') {
                waves.removeCustom(decodeURIComponent(mm[1]));
                jsonRes(res, 200, { ok: true, waves: waves.list() });
                return;
            }

            // ---------------- 游戏插件安装 ----------------
            function pickGameInstaller(dir) {
                try {
                    if (unityInstaller.detect(dir).ok) { return unityInstaller; }
                } catch (e) { /* fallback */ }
                return installer;
            }

            if (url === '/api/game/status' && req.method === 'GET') {
                const q = new URL(req.url, 'http://localhost').searchParams;
                const dir = q.get('dir') || profile.gameDir || '';
                const inst = pickGameInstaller(dir);
                jsonRes(res, 200, { ok: true, status: inst.status(dir) });
                return;
            }

            if (url === '/api/game/install' && req.method === 'POST') {
                withJson(req, res, (m) => {
                    const inst = pickGameInstaller(m.gameDir);
                    const r = inst.install(m.gameDir);
                    const proj = store.activeProject();
                    if (proj && m.gameDir) {
                        proj.gameDir = path.resolve(m.gameDir);
                        store.save();
                        reloadActive();
                    }
                    jsonRes(res, 200, { ok: true, result: r, status: inst.status(m.gameDir) });
                });
                return;
            }

            if (url === '/api/game/remove' && req.method === 'POST') {
                withJson(req, res, (m) => {
                    const inst = pickGameInstaller(m.gameDir);
                    const r = inst.remove(m.gameDir);
                    jsonRes(res, 200, { ok: true, result: r, status: inst.status(m.gameDir) });
                });
                return;
            }

            if (url === '/api/game/browse' && req.method === 'POST') {
                withJson(req, res, (m) => {
                    const mode = m.mode === 'file' ? 'file' : 'folder';
                    execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', BROWSE_SCRIPT, '-Mode', mode], { windowsHide: true, encoding: 'utf8' }, (err, stdout) => {
                        if (err) { jsonRes(res, 500, { ok: false, error: err.message }); return; }
                        const raw = String(stdout || '').trim();
                        let picked = '';
                        if (raw) {
                            if (/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
                                try { picked = Buffer.from(raw, 'base64').toString('utf8'); } catch (e) { picked = ''; }
                            } else {
                                // 兼容旧版 browse.ps1 直接输出的路径
                                picked = raw;
                            }
                        }
                        jsonRes(res, 200, { ok: true, path: picked });
                    });
                });
                return;
            }

            // ---------------- OCR（Windows OCR，本地） ----------------
            if (url === '/api/ocr/status' && req.method === 'GET') {
                jsonRes(res, 200, { ok: true, status: ocr.status() });
                return;
            }

            if (url === '/api/ocr/start' && req.method === 'POST') {
                runAsync(res, async () => {
                    await ocr.ensure();
                    const languages = await ocr.listLanguages();
                    broadcast({ type: 'ocr', status: ocr.status(), ts: Date.now() });
                    jsonRes(res, 200, { ok: true, status: ocr.status(), languages: languages });
                });
                return;
            }

            if (url === '/api/ocr/stop' && req.method === 'POST') {
                runAsync(res, async () => {
                    await ocr.stop();
                    state.ocr = '';
                    state.ocrRaw = '';
                    scheduleEval();
                    broadcast({ type: 'ocr', text: '', status: ocr.status(), ts: Date.now() });
                    jsonRes(res, 200, { ok: true, status: ocr.status() });
                });
                return;
            }

            if (url === '/api/ocr/shot' && req.method === 'POST') {
                runAsync(res, async () => {
                    const file = path.join(DATA_DIR, 'ocr-shot.png');
                    const r = await ocr.screenshot(file, null);
                    jsonRes(res, 200, {
                        ok: true, url: '/api/ocr/shot.png?t=' + Date.now(),
                        x: r.x, y: r.y, width: r.width, height: r.height
                    });
                });
                return;
            }

            if (url === '/api/ocr/shot.png' && req.method === 'GET') {
                const file = path.join(DATA_DIR, 'ocr-shot.png');
                fs.readFile(file, (err, data) => {
                    if (err) { res.writeHead(404); res.end('no screenshot'); return; }
                    res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' });
                    res.end(data);
                });
                return;
            }

            if (url === '/api/ocr/recognize' && req.method === 'POST') {
                withJson(req, res, (m) => {
                    const region = m.region || {};
                    const lang = String(m.lang || '');
                    if (!region.w || !region.h) { throw new Error('请先框选 OCR 区域'); }
                    ocr.recognize({
                        x: Math.round(region.x), y: Math.round(region.y),
                        w: Math.round(region.w), h: Math.round(region.h)
                    }, lang).then((r) => {
                        jsonRes(res, 200, { ok: true, text: r.text, lines: r.lines });
                    }).catch((e) => jsonRes(res, 500, { ok: false, error: e.message }));
                });
                return;
            }

            if (url === '/api/ocr/monitor/start' && req.method === 'POST') {
                withJson(req, res, (m) => {
                    const region = m.region || {};
                    if (!region.w || !region.h) { throw new Error('请先框选 OCR 区域'); }
                    ocr.startMonitor({
                        region: {
                            x: Math.round(region.x), y: Math.round(region.y),
                            w: Math.round(region.w), h: Math.round(region.h)
                        },
                        lang: String(m.lang || ''),
                        intervalMs: Number(m.intervalMs) || 1500
                    }, (text) => {
                        state.ocr = text;
                        state.ocrRaw = text;
                        state.ocrAt = Date.now();
                        scheduleEval();
                        broadcast({ type: 'ocr', text: text, status: ocr.status(), ts: Date.now() });
                    }).then((s) => jsonRes(res, 200, { ok: true, status: s }))
                        .catch((e) => jsonRes(res, 500, { ok: false, error: e.message }));
                });
                return;
            }

            if (url === '/api/ocr/monitor/stop' && req.method === 'POST') {
                ocr.stopMonitor();
                state.ocr = '';
                state.ocrRaw = '';
                scheduleEval();
                broadcast({ type: 'ocr', text: '', status: ocr.status(), ts: Date.now() });
                jsonRes(res, 200, { ok: true, status: ocr.status() });
                return;
            }
            if (url === '/api/rules/test' && req.method === 'POST') {
                withJson(req, res, (m) => {
                    const rule = rules.filter((r) => r.id === m.id)[0];
                    if (!rule) { throw new Error('规则不存在'); }
                    const actions = Array.isArray(rule.action) ? rule.action : [rule.action];
                    const applied = device.testActions(actions, Number(m.seconds) || 3);
                    broadcast({ type: 'log', text: '测试规则 ' + rule.id + '：' + JSON.stringify(applied), ts: Date.now() });
                    jsonRes(res, 200, { ok: true, applied: applied });
                });
                return;
            }
            if (url === '/api/device/scan' && req.method === 'POST') {
                runAsync(res, async () => {
                    const devices = await device.scan();
                    jsonRes(res, 200, { ok: true, devices: devices });
                });
                return;
            }

            if (url === '/api/device' && req.method === 'GET') {
                jsonRes(res, 200, { ok: true, device: device.status(), mode: outputSettings.mode });
                return;
            }

            if (url === '/api/device/connect' && req.method === 'POST') {
                readBody(req, (err, body) => {
                    if (err) { jsonRes(res, 400, { ok: false, error: err.message }); return; }
                    let address = '';
                    try { address = String(JSON.parse(body).address || ''); } catch (e) { }
                    if (!/^[0-9a-fA-F]{12}$/.test(address.replace(/:/g, ''))) {
                        jsonRes(res, 400, { ok: false, error: '地址格式应为 12 位十六进制，' });
                        return;
                    }
                    device.connect(address.replace(/:/g, ''))
                        .then((r) => {
                            broadcast({ type: 'device', device: device.status(), ts: Date.now() });
                            jsonRes(res, 200, { ok: true, device: device.status(), result: r });
                        })
                        .catch((e) => jsonRes(res, 500, { ok: false, error: e.message, device: device.status() }));
                });
                return;
            }

            if (url === '/api/device/disconnect' && req.method === 'POST') {
                device.disconnect()
                    .then(() => {
                        broadcast({ type: 'device', device: device.status(), ts: Date.now() });
                        jsonRes(res, 200, { ok: true, device: device.status() });
                    })
                    .catch((e) => jsonRes(res, 500, { ok: false, error: e.message }));
                return;
            }

            if (url === '/api/device/test' && req.method === 'POST') {
                readBody(req, (err, body) => {
                    if (err) { jsonRes(res, 400, { ok: false, error: err.message }); return; }
                    let m = {};
                    try { m = JSON.parse(body); } catch (e) { }
                    const a = Math.max(0, Math.min(200, Number(m.a) || 0));
                    const b = Math.max(0, Math.min(200, Number(m.b) || 0));
                    const seconds = Math.max(0.2, Math.min(30, Number(m.seconds) || 3));
                    const waveA = String(m.waveA || m.pattern || 'const');
                    const waveB = String(m.waveB || m.pattern || 'const');
                    device.test(a, b, waveA, waveB, seconds)
                        .then((r) => {
                            setTimeout(() => { broadcast({ type: 'device', device: device.status(), ts: Date.now() }); }, seconds * 1000 + 200);
                            jsonRes(res, 200, { ok: true, a: a, b: b, seconds: seconds, waveA: r.waveA, waveB: r.waveB });
                        })
                        .catch((e) => jsonRes(res, 500, { ok: false, error: e.message }));
                });
                return;
            }

            if (url === '/api/device/stop' && req.method === 'POST') {
                device.stopWave();
                device.levels = { A: 0, B: 0 };
                device.setStrength(0, 0)
                    .then(() => jsonRes(res, 200, { ok: true, device: device.status() }))
                    .catch((e) => jsonRes(res, 500, { ok: false, error: e.message }));
                return;
            }

            if (url.startsWith('/assets/system/')) {
                const name = decodeURIComponent(url.slice('/assets/system/'.length));
                const file = findSystemAsset(name);
                if (!file) {
                    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
                    res.end('asset not found');
                    return;
                }
                res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'max-age=3600' });
                fs.createReadStream(file).pipe(res);
                return;
            }

            if (url === '/events') {
                res.writeHead(200, {
                    'content-type': 'text/event-stream; charset=utf-8',
                    'cache-control': 'no-store',
                    'connection': 'keep-alive'
                });
                res.write(': connected\n\n');
                sseClients.add(res);
                const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) { /* ignore */ } }, 15000);
                req.on('close', () => { clearInterval(ping); sseClients.delete(res); });
                return;
            }

            res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
            res.end('not found');
        });

        httpServer.listen(HTTP_PORT, '127.0.0.1', () => {
            const url = `http://127.0.0.1:${HTTP_PORT}`;
            console.log(`界面: ${url}`);
            if (OPEN_BROWSER) {
                try {
                    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
                } catch (e) { /* ignore */ }
            }
        });
    }

    process.on('SIGINT', async () => { console.log('\n退出'); try { await device.shutdown(); } catch (e) { } process.exit(0); });
}

module.exports = { handle, state, rules, evaluateAll, buildContext };
