#!/usr/bin/env node
'use strict';

/**
 * DGRMHook 安装器：把插件写进游戏并注册到 plugins.js（带备份）。
 *
 *   node install.js --game "D:\Games\YourGame"
 *   node install.js --game "..." --port 17870 --vars "1021,1026,1027" --switches "267,883"
 *   node install.js --game "..." --dry
 *   node install.js --game "..." --remove
 */

const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
function arg(name, fallback) {
    const i = argv.indexOf('--' + name);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
}
const GAME = arg('game', null);
const PORT = arg('port', '17870');
const VARS = arg('vars', '1021,1034,1026,1027,1022,1030,212,741,742');
const SWITCHES = arg('switches', '267,883,886,261,18');
const DRY = argv.includes('--dry');
const REMOVE = argv.includes('--remove');

if (!GAME) {
    console.error('用法: node install.js --game "游戏目录" [--dry] [--remove]');
    process.exit(1);
}

const root = path.resolve(GAME);
const candidates = [
    path.join(root, 'www', 'js', 'plugins'),
    path.join(root, 'js', 'plugins')
];
const pluginDir = candidates.find((p) => fs.existsSync(p));
if (!pluginDir) {
    console.error('找不到 js/plugins 目录，确认路径是游戏根目录：' + root);
    process.exit(1);
}
const jsDir = path.dirname(pluginDir);
const pluginsFile = path.join(jsDir, 'plugins.js');
if (!fs.existsSync(pluginsFile)) {
    console.error('找不到 plugins.js：' + pluginsFile);
    process.exit(1);
}

// 读取（保留 BOM 信息）
const rawBuf = fs.readFileSync(pluginsFile);
const hasBom = rawBuf.length >= 3 && rawBuf[0] === 0xef && rawBuf[1] === 0xbb && rawBuf[2] === 0xbf;
let text = rawBuf.toString('utf8');
if (hasBom) { text = text.slice(1); }

const m = text.match(/var\s+\$plugins\s*=\s*(\[[\s\S]*?\])\s*;/);
if (!m) {
    console.error('plugins.js 里没找到标准的 var $plugins = [...]; 结构，已放弃（避免破坏文件）。');
    process.exit(2);
}
let list;
try {
    list = JSON.parse(m[1]);
} catch (e) {
    console.error('plugins.js 的插件列表不是合法 JSON：' + e.message);
    process.exit(2);
}

const existing = list.find((p) => p && p.name === 'DGRMHook');
const newEntry = {
    name: 'DGRMHook',
    status: true,
    description: '',
    parameters: {
        Port: String(PORT),
        WatchVars: VARS,
        WatchSwitches: SWITCHES
    }
};

if (REMOVE) {
    if (!existing) {
        console.log('未安装 DGRMHook，无需移除。');
        process.exit(0);
    }
    list = list.filter((p) => p && p.name !== 'DGRMHook');
} else {
    if (existing) {
        Object.assign(existing, newEntry);
    } else {
        list.push(newEntry);
    }
}

const newArrayText = JSON.stringify(list, null, 2);
const newText = text.slice(0, m.index) + 'var $plugins =\n' + newArrayText + ';' + text.slice(m.index + m[0].length);

console.log(`游戏: ${root}`);
console.log(`plugins.js: ${pluginsFile}`);
console.log(`插件目录: ${pluginDir}`);
console.log(REMOVE ? '动作: 移除 DGRMHook' : `动作: 注册 DGRMHook (port=${PORT})`);
console.log(`插件条目: ${JSON.stringify(newEntry.parameters)}`);

if (DRY) {
    console.log('\n[dry-run] 未写入任何文件。');
    process.exit(0);
}

// 备份
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = pluginsFile + '.dgrmhook.bak-' + stamp;
fs.copyFileSync(pluginsFile, backup);
console.log('已备份: ' + backup);

// 写 plugins.js（保留原 BOM 状态）
const out = hasBom ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(newText, 'utf8')]) : Buffer.from(newText, 'utf8');
fs.writeFileSync(pluginsFile, out);

// 复制/删除插件文件
const src = path.join(__dirname, 'DGRMHook.js');
const dst = path.join(pluginDir, 'DGRMHook.js');
if (REMOVE) {
    if (fs.existsSync(dst)) { fs.unlinkSync(dst); console.log('已删除: ' + dst); }
} else {
    fs.copyFileSync(src, dst);
    console.log('已复制: ' + dst);
}

console.log('\n完成。启动游戏前先运行 bridge.js；如果以后要卸掉，执行 --remove。');
