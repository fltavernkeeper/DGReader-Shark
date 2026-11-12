//=============================================================================
/*:
 * @plugindesc v1.0.0 RPG Maker MV/MZ 信号 hook：变量 / 开关 / 地图 / 角色状态 / Ticker / 对话框
 * @author FL
 *
 * @param Host
 * @default 127.0.0.1
 *
 * @param Port
 * @type number
 * @default 17870
 *
 * @param WatchVars
 * @desc 逗号分隔的变量 ID；留空=监听所有变化的变量。建议只填关心的 ID。
 * @default 1021,1034,1026,1027,1022,1030,212,741,742
 *
 * @param WatchSwitches
 * @desc 逗号分隔的开关 ID；留空=监听所有变化的开关。
 * @default 267,883,886,261,18
 *
 * @param SnapshotMs
 * @type number
 * @default 1000
 *
 * @param LogTicker
 * @type boolean
 * @default true
 *
 * @param LogMessages
 * @type boolean
 * @default true
 *
 * @param MaxPerSecond
 * @type number
 * @default 200
 *
 * @help
 * 只读 hook，不改游戏逻辑。通过 TCP 发送 JSONL：
 *
 *   {"t":"hello","game":"...","engine":"MV","version":"1.6.1","mapId":63}
 *   {"t":"var","id":1027,"name":"発情値","value":35,"old":10}
 *   {"t":"switch","id":267,"name":"プールで泳ぐ","value":true}
 *   {"t":"map","id":63,"name":"MAP017プール"}
 *   {"t":"snapshot","mapId":63,"vars":{"1026":0,...},"actor":{"hp":..,"states":[..]}}
 *   {"t":"ticker","text":"\\I[12]発情値 \\V[1027]"}
 *   {"t":"message","phase":"start","text":"...","speaker":"...","position":2,"choices":[..]}
 *
 * 安装：放到 www/js/plugins/，在 plugins.js 注册
 *   {"name":"DGRMHook","status":true,"description":"","parameters":{}}
 * 参数写进 parameters 即可，例如：
 *   {"WatchVars":"1021,1026,1027","WatchSwitches":"267,883","Port":"17870"}
 */

(function () {
    'use strict';

    if (typeof window === 'undefined' || window.__DGRMHookInstalled) {
        return;
    }
    window.__DGRMHookInstalled = true;

    var params = {};
    try {
        params = (window.PluginManager && PluginManager.parameters('DGRMHook')) || {};
    } catch (e) {
        params = {};
    }

    function asBool(value, fallback) {
        if (value === undefined || value === null || value === '') { return fallback; }
        var s = String(value).toLowerCase();
        return s === 'true' || s === '1' || s === 'yes';
    }
    function asInt(value, fallback) {
        var n = parseInt(value, 10);
        return isNaN(n) ? fallback : n;
    }
    function idList(value) {
        var out = [];
        String(value || '').split(',').forEach(function (part) {
            var n = parseInt(part, 10);
            if (!isNaN(n)) { out.push(n); }
        });
        return out;
    }

    var HOST = String(params.Host || '127.0.0.1');
    var PORT = asInt(params.Port, 17870);
    var WATCH_VARS = idList(params.WatchVars || '1021,1034,1026,1027,1022,1030,212,741,742');
    var WATCH_SWITCHES = idList(params.WatchSwitches || '267,883,886,261,18');
    var SNAPSHOT_MS = Math.max(200, asInt(params.SnapshotMs, 1000));
    var LOG_TICKER = asBool(params.LogTicker, true);
    var LOG_MESSAGES = asBool(params.LogMessages, true);
    var MAX_PER_SEC = Math.max(20, asInt(params.MaxPerSecond, 200));

    var net = null;
    try {
        net = require('net');
    } catch (e) {
        net = null;
    }
    if (!net) {
        return;
    }

    var sock = null;
    var connecting = false;
    var queue = [];
    var sentThisSecond = 0;
    var dropped = 0;

    function sceneName() {
        try {
            return SceneManager._scene && SceneManager._scene.constructor
                ? SceneManager._scene.constructor.name : '';
        } catch (e) {
            return '';
        }
    }

    function variableName(id) {
        try {
            return ($dataSystem && $dataSystem.variables && $dataSystem.variables[id]) || '';
        } catch (e) {
            return '';
        }
    }

    function switchName(id) {
        try {
            return ($dataSystem && $dataSystem.switches && $dataSystem.switches[id]) || '';
        } catch (e) {
            return '';
        }
    }

    function mapName(id) {
        try {
            return ($dataMapInfos && $dataMapInfos[id] && $dataMapInfos[id].name) || '';
        } catch (e) {
            return '';
        }
    }

    function push(obj) {
        if (sentThisSecond >= MAX_PER_SEC) {
            dropped += 1;
            return;
        }
        obj.ts = Date.now();
        try {
            queue.push(JSON.stringify(obj) + '\n');
        } catch (e) {
            return;
        }
        sentThisSecond += 1;
        if (queue.length > 400) {
            queue.shift();
            dropped += 1;
        }
    }

    function flush() {
        if (!sock || sock.destroyed) { return; }
        while (queue.length) {
            var line = queue.shift();
            try {
                sock.write(line);
            } catch (e) {
                queue.unshift(line);
                return;
            }
        }
    }

    function down() {
        sock = null;
        connecting = false;
        setTimeout(connect, 1000);
    }

    function connect() {
        if (sock || connecting) { return; }
        connecting = true;
        try {
            sock = net.createConnection({ host: HOST, port: PORT }, function () {
                connecting = false;
                try { sock.setNoDelay(true); } catch (e) { /* ignore */ }
                push({
                    t: 'hello',
                    game: (window.$dataSystem && $dataSystem.gameTitle) || '',
                    engine: (window.Utils && Utils.RPGMAKER_NAME) || '',
                    version: (window.Utils && Utils.RPGMAKER_VERSION) || '',
                    mapId: window.$gameMap ? $gameMap.mapId() : 0,
                    actors: (window.$dataActors || []).map(function (a) {
                        return a ? a.name : '';
                    })
                });
                flush();
            });
        } catch (e) {
            connecting = false;
            setTimeout(connect, 1000);
            return;
        }
        sock.on('error', down);
        sock.on('close', down);
    }

    setInterval(flush, 50);
    setInterval(function () { sentThisSecond = 0; }, 1000);

    // --- 变量 -------------------------------------------------------------
    if (typeof Game_Variables !== 'undefined') {
        var _setVar = Game_Variables.prototype.setValue;
        Game_Variables.prototype.setValue = function (id, value) {
            try {
                var old = this._data[id];
                if (old !== value) {
                    if (WATCH_VARS.length === 0 || WATCH_VARS.indexOf(id) >= 0) {
                        push({ t: 'var', id: id, name: variableName(id), value: value, old: old });
                    }
                }
            } catch (e) { /* ignore */ }
            return _setVar.apply(this, arguments);
        };
    }

    // --- 开关 -------------------------------------------------------------
    if (typeof Game_Switches !== 'undefined') {
        var _setSwitch = Game_Switches.prototype.setValue;
        Game_Switches.prototype.setValue = function (id, value) {
            try {
                var oldSw = this._data[id];
                if (oldSw !== value) {
                    if (WATCH_SWITCHES.length === 0 || WATCH_SWITCHES.indexOf(id) >= 0) {
                        push({ t: 'switch', id: id, name: switchName(id), value: !!value });
                    }
                }
            } catch (e) { /* ignore */ }
            return _setSwitch.apply(this, arguments);
        };
    }

    // --- 地图 -------------------------------------------------------------
    if (typeof Scene_Map !== 'undefined' && Scene_Map.prototype.onMapLoaded) {
        var _onMapLoaded = Scene_Map.prototype.onMapLoaded;
        Scene_Map.prototype.onMapLoaded = function () {
            try {
                push({
                    t: 'map',
                    id: $gameMap.mapId(),
                    name: mapName($gameMap.mapId()),
                    scene: sceneName()
                });
            } catch (e) { /* ignore */ }
            return _onMapLoaded.apply(this, arguments);
        };
    }

    // --- Ticker -----------------------------------------------------------
    var lastTickerText = '';
    var lastTickerAt = 0;
    function emitTicker(text, source) {
        if (typeof text !== 'string' || text.length === 0) { return; }
        var now = Date.now();
        if (text === lastTickerText && now - lastTickerAt < 80) { return; }
        lastTickerText = text;
        lastTickerAt = now;
        var tickerVars = [];
        var seenVars = {};
        var re = /\\[vV]\[(\d+)\]/g;
        var m;
        while ((m = re.exec(text)) !== null) {
            var vid = Number(m[1]);
            if (seenVars[vid]) { continue; }
            seenVars[vid] = true;
            tickerVars.push({ id: vid, name: variableName(vid), value: $gameVariables.value(vid) });
        }
        // 保留原文本给规则/调试，同时给 UI 一份已展开变量的文本。
        // RPG Maker 的变量可以存字符串（例如 \v[458] 可能是 NPC 名字）。
        var displayText = text;
        for (var pass = 0; pass < 20; pass++) {
            var previousText = displayText;
            displayText = displayText.replace(/\\[vV]\[(\d+)\]/g, function (_, id) {
                try { return String($gameVariables.value(Number(id))); } catch (e) { return '0'; }
            });
            if (displayText === previousText) { break; }
        }
        push({ t: 'ticker', scene: sceneName(), plus: true, source: source || '', text: text, displayText: displayText, tickerVars: tickerVars });
    }
    if (LOG_TICKER && typeof TickerManager !== 'undefined' && TickerManager.show) {
        var _tickerShow = TickerManager.show;
        TickerManager.show = function (text, needPlus) {
            try { emitTicker(text, 'manager'); } catch (e) { /* ignore */ }
            return _tickerShow.apply(this, arguments);
        };
    }
    // 部分战斗/剧情插件直接调用 TickerContainer.show，绕过 TickerManager。
    if (LOG_TICKER && typeof TickerContainer !== 'undefined' && TickerContainer.prototype && TickerContainer.prototype.show) {
        var _tickerContainerShow = TickerContainer.prototype.show;
        TickerContainer.prototype.show = function (text, needPlus) {
            try { emitTicker(text, 'container'); } catch (e) { /* ignore */ }
            return _tickerContainerShow.apply(this, arguments);
        };
    }

    // --- 标准战斗日志（左上角 Window_BattleLog）---------------------------
    // Ticker 只覆盖了 TickerBTM / TickerSys 的播报；敌人行动、伤害、状态等
    // 默认战斗信息走的是 Window_BattleLog.addText，这里补上。
    if (typeof Window_BattleLog !== 'undefined' && Window_BattleLog.prototype.addText) {
        var _addText = Window_BattleLog.prototype.addText;
        Window_BattleLog.prototype.addText = function (text) {
            try {
                if (typeof text === 'string' && text.replace(/\s/g, '').length > 0) {
                    push({ t: 'battlelog', text: text, scene: sceneName() });
                }
            } catch (e) { /* ignore */ }
            return _addText.apply(this, arguments);
        };
    }

    // Ticker.js 在 drawLineText 里把战斗日志转成左上角播报；直接补抓这一层，
    // 避免某些战斗插件绕过 addText / TickerManager 时漏掉角色行动描述。
    if (LOG_TICKER && typeof Window_BattleLog !== 'undefined' && Window_BattleLog.prototype.drawLineText) {
        var _drawLineText = Window_BattleLog.prototype.drawLineText;
        Window_BattleLog.prototype.drawLineText = function (index) {
            try {
                var line = this._lines && this._lines[index];
                if (typeof line === 'string' && line.replace(/\s/g, '').length > 0) {
                    emitTicker(line, 'battlelog');
                }
            } catch (e) { /* ignore */ }
            return _drawLineText.apply(this, arguments);
        };
    }

    // --- 战斗播报的语义层：TickerBTM / TickerBTMFL / TickerSys -------------
    // 只 hook TickerManager.show 只能拿到“渲染后的文字”；这里拿到的是
    // 消息 ID（如 AttackEstrus / CrisisL3 / TrapActive），比关键词更准。
    if (typeof Game_Interpreter !== 'undefined' && Game_Interpreter.prototype.pluginCommand) {
        var _pluginCommand = Game_Interpreter.prototype.pluginCommand;
        Game_Interpreter.prototype.pluginCommand = function (command, args) {
            try {
                args = args || [];
                // varIDforPlugin 在外层把 TickerBTM_varID 变成 TickerBTM；
                // DGRMHook 比它更晚加载，先自己解析一次，保证语义元数据完整。
                var metaCommand = String(command || '');
                var metaArgs = args.slice();
                var varIdMatch = metaCommand.match(/_varID(\[[0-9]+(?:,[0-9]+)*\])?$/);
                if (varIdMatch) {
                    metaCommand = metaCommand.slice(0, varIdMatch.index);
                    var indexes = [];
                    if (varIdMatch[1]) {
                        indexes = varIdMatch[1].slice(1, -1).split(',').map(function (x) { return Number(x) - 1; });
                    } else {
                        for (var vi = 0; vi < metaArgs.length; vi++) { indexes.push(vi); }
                    }
                    for (var vj = 0; vj < indexes.length; vj++) {
                        var ai = indexes[vj];
                        if (ai >= 0 && ai < metaArgs.length) {
                            metaArgs[ai] = String($gameVariables.value(Number(metaArgs[ai])));
                        }
                    }
                }
                if (metaCommand === 'TickerBTM') {
                    push({
                        t: 'ticker_meta', kind: 'btm',
                        id: String(metaArgs[0] || ''), pattern: String(metaArgs[1] || ''),
                        actorId: Number(metaArgs[2] || 0), scene: sceneName()
                    });
                } else if (metaCommand === 'TickerBTMFL') {
                    push({
                        t: 'ticker_meta', kind: 'btmfl',
                        id: String(metaArgs[0] || ''), pattern: String(metaArgs[1] || ''),
                        scene: sceneName()
                    });
                } else if (metaCommand === 'TickerSys') {
                    push({
                        t: 'ticker_meta', kind: 'sys',
                        id: String(metaArgs[0] || ''), scene: sceneName()
                    });
                }
            } catch (e) { /* ignore */ }
            return _pluginCommand.apply(this, arguments);
        };
    }

    // --- 标准对话框 ---------------------------------------------------------
    function msgField(gm, fn, fallback) {
        try {
            return typeof gm[fn] === 'function' ? gm[fn]() : gm[fallback];
        } catch (e) {
            return undefined;
        }
    }
    function messageMeta(gm) {
        if (!gm) { return {}; }
        var meta = {
            position: msgField(gm, 'positionType', '_positionType'),
            choices: msgField(gm, 'choices', '_choices'),
            speaker: msgField(gm, 'speakerName', '_speakerName'),
            face: msgField(gm, 'faceName', '_faceName')
        };
        try {
            meta.mapId = window.$gameMap ? $gameMap.mapId() : 0;
            var it = window.$gameMap ? $gameMap._interpreter : null;
            if (it && it._eventId) {
                meta.eventId = it._eventId;
                if (window.$dataMap && $dataMap.events && $dataMap.events[it._eventId]) {
                    meta.eventName = $dataMap.events[it._eventId].name || '';
                }
            }
        } catch (e) { /* ignore */ }
        return meta;
    }

    if (LOG_MESSAGES && typeof Game_Message !== 'undefined' && Game_Message.prototype.add) {
        var _gmAdd = Game_Message.prototype.add;
        Game_Message.prototype.add = function (text) {
            try {
                if (typeof text === 'string' && text.length > 0) {
                    var meta = messageMeta(this);
                    meta.t = 'message';
                    meta.phase = 'add';
                    meta.scene = sceneName();
                    meta.text = text;
                    push(meta);
                }
            } catch (e) { /* ignore */ }
            return _gmAdd.apply(this, arguments);
        };
    }

    if (LOG_MESSAGES && typeof Window_Message !== 'undefined' && Window_Message.prototype.startMessage) {
        var _wmStart = Window_Message.prototype.startMessage;
        Window_Message.prototype.startMessage = function () {
            try {
                var gm = window.$gameMessage;
                if (gm) {
                    var meta2 = messageMeta(gm);
                    meta2.t = 'message';
                    meta2.phase = 'start';
                    meta2.scene = sceneName();
                    meta2.text = typeof gm.allText === 'function' ? gm.allText() : '';
                    push(meta2);
                }
            } catch (e) { /* ignore */ }
            return _wmStart.apply(this, arguments);
        };
    }

    // 对话框关闭/切下一条时清空，避免旧的剧情关键词一直保持“激活”
    if (LOG_MESSAGES && typeof Game_Message !== 'undefined' && Game_Message.prototype.clear) {
        var _gmClear = Game_Message.prototype.clear;
        Game_Message.prototype.clear = function () {
            try { push({ t: 'message_end' }); } catch (e) { /* ignore */ }
            return _gmClear.apply(this, arguments);
        };
    }

    // --- 周期快照 -----------------------------------------------------------
    function snapshot() {
        try {
            var vars = {};
            var varNames = {};
            for (var i = 0; i < WATCH_VARS.length; i++) {
                var id = WATCH_VARS[i];
                vars[id] = $gameVariables.value(id);
                varNames[id] = variableName(id);
            }
            var sws = {};
            var switchNames = {};
            for (var j = 0; j < WATCH_SWITCHES.length; j++) {
                var sid = WATCH_SWITCHES[j];
                sws[sid] = $gameSwitches.value(sid);
                switchNames[sid] = switchName(sid);
            }
            var actor = null;
            try {
                var a = $gameActors.actor(1);
                if (a) {
                    actor = {
                        id: 1,
                        name: a.name(),
                        hp: a.hp, mhp: a.mhp,
                        mp: a.mp, mmp: a.mmp,
                        tp: a.tp,
                        states: a.states().map(function (s) { return s.id; })
                    };
                }
            } catch (e) { /* ignore */ }
            push({
                t: 'snapshot',
                scene: sceneName(),
                mapId: window.$gameMap ? $gameMap.mapId() : 0,
                map: mapName(window.$gameMap ? $gameMap.mapId() : 0),
                vars: vars,
                varNames: varNames,
                switches: sws,
                switchNames: switchNames,
                actor: actor,
                party: (function () {
                    try {
                        return $gameParty.members().map(function (m) {
                            return { id: m.actorId(), name: m.name() };
                        });
                    } catch (e) {
                        return [];
                    }
                })()
            });
        } catch (e) { /* ignore */ }
    }

    setInterval(snapshot, SNAPSHOT_MS);
    snapshot();
    connect();
})();
