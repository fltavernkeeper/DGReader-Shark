'use strict';

// Unity Mono 文本探针安装器
// 只支持 Mono（Managed/Assembly-CSharp.dll），不支持 IL2CPP。

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const UNITY_DIR = path.join(__dirname, 'unity');
const DOORSTOP_DIR = path.join(UNITY_DIR, 'doorstop', 'x64');
const PROBE_DLL = path.join(UNITY_DIR, 'DGReader.UnityProbe.dll');
const PROBE_DIRNAME = 'DGReader';
const PROBE_NAME = 'UnityProbe.dll';

function normalizeRoot(dir) {
    let root = path.resolve(String(dir || ''));
    if (/_Data$/i.test(path.basename(root))) { root = path.dirname(root); }
    return root;
}

function findDataDir(root) {
    if (!fs.existsSync(root)) { return null; }
    const names = fs.readdirSync(root).filter((n) => {
        try { return fs.statSync(path.join(root, n)).isDirectory() && /_Data$/i.test(n); } catch (e) { return false; }
    });
    for (const name of names) {
        const d = path.join(root, name);
        if (fs.existsSync(path.join(d, 'Managed', 'Assembly-CSharp.dll'))) { return d; }
    }
    return null;
}

function detect(dir) {
    const root = normalizeRoot(dir);
    if (!root || !fs.existsSync(root)) { return { ok: false, error: '目录不存在' }; }
    if (fs.existsSync(path.join(root, 'GameAssembly.dll'))) {
        return { ok: false, error: '这是 Unity IL2CPP 游戏，当前只支持 Mono' };
    }
    const dataDir = findDataDir(root);
    if (!dataDir) { return { ok: false, error: '找不到 Unity Mono 的 Managed/Assembly-CSharp.dll' }; }
    const managed = path.join(dataDir, 'Managed');
    const hasTmp = fs.existsSync(path.join(managed, 'Unity.TextMeshPro.dll'));
    return {
        ok: true,
        engine: 'unity-mono',
        root: root,
        dataDir: dataDir,
        managed: managed,
        hasTmp: hasTmp
    };
}

function runningExe(root) {
    let names = [];
    try {
        names = fs.readdirSync(root).filter((n) => /\.exe$/i.test(n));
    } catch (e) { return ''; }
    for (const name of names) {
        try {
            const out = execFileSync('tasklist', ['/FI', 'IMAGENAME eq ' + name, '/FO', 'CSV', '/NH'], {
                encoding: 'utf8', windowsHide: true, timeout: 3000
            });
            if (out && out.toLowerCase().indexOf(name.toLowerCase()) >= 0) { return name; }
        } catch (e) { /* tasklist unavailable */ }
    }
    return '';
}

function assertClosed(root) {
    const exe = runningExe(root);
    if (exe) {
        throw new Error('请先关闭游戏（检测到 ' + exe + ' 正在运行），否则 winhttp.dll 被占用，无法安装或移除');
    }
}

function probeDir(root) { return path.join(root, PROBE_DIRNAME); }
function probePath(root) { return path.join(probeDir(root), PROBE_NAME); }

// 安装/移除前备份已有文件，避免覆盖用户原来的 winhttp.dll 或探针配置
function backupExisting(root) {
    const items = [
        { src: path.join(root, 'winhttp.dll'), name: 'winhttp.dll' },
        { src: path.join(root, 'doorstop_config.ini'), name: 'doorstop_config.ini' },
        { src: path.join(root, '.doorstop_version'), name: '.doorstop_version' },
        { src: probePath(root), name: PROBE_NAME }
    ].filter((x) => fs.existsSync(x.src));
    if (!items.length) { return ''; }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.join(probeDir(root), 'backup-' + stamp);
    fs.mkdirSync(dir, { recursive: true });
    for (const item of items) { fs.copyFileSync(item.src, path.join(dir, item.name)); }
    return dir;
}

function installed(root) {
    return fs.existsSync(path.join(root, 'winhttp.dll')) &&
        fs.existsSync(path.join(root, 'doorstop_config.ini')) &&
        fs.existsSync(probePath(root));
}

function status(dir) {
    const d = detect(dir);
    if (!d.ok) { return { ok: false, error: d.error }; }
    const isInstalled = installed(d.root);
    return {
        ok: true,
        engine: 'unity-mono',
        gameDir: d.root,
        pluginDir: probeDir(d.root),
        installed: isInstalled,
        registered: isInstalled,
        entries: 0,
        encoding: 'utf-8',
        bom: false,
        parseError: '',
        hasTmp: d.hasTmp
    };
}

function install(dir) {
    const d = detect(dir);
    if (!d.ok) { throw new Error(d.error); }
    assertClosed(d.root);
    if (!fs.existsSync(DOORSTOP_DIR) || !fs.existsSync(PROBE_DLL)) {
        throw new Error('发布包缺少 Unity 探针文件');
    }
    let backup = '';
    try {
        backup = backupExisting(d.root);
        for (const name of ['winhttp.dll', 'doorstop_config.ini', '.doorstop_version']) {
            fs.copyFileSync(path.join(DOORSTOP_DIR, name), path.join(d.root, name));
        }
        const cfgPath = path.join(d.root, 'doorstop_config.ini');
        let cfg = fs.readFileSync(cfgPath, 'utf8');
        cfg = cfg.replace(/target_assembly\s*=.*/i, 'target_assembly=' + PROBE_DIRNAME + '\\' + PROBE_NAME);
        fs.writeFileSync(cfgPath, cfg, 'utf8');
        fs.mkdirSync(probeDir(d.root), { recursive: true });
        fs.copyFileSync(PROBE_DLL, probePath(d.root));
    } catch (e) {
        if (e && (e.code === 'EBUSY' || e.code === 'EPERM' || e.code === 'EACCES')) {
            throw new Error('文件被游戏占用，请先关闭游戏后再安装');
        }
        throw e;
    }
    return { ok: true, engine: 'unity-mono', already: false, probeDir: probeDir(d.root), backup: backup };
}

function remove(dir) {
    const d = detect(dir);
    if (!d.ok) { throw new Error(d.error); }
    assertClosed(d.root);
    const backup = backupExisting(d.root);
    const removed = [];
    const errors = [];
    // 先删配置/探针，最后删 winhttp.dll；即使 winhttp 被占用，也不会留下半安装状态
    for (const name of ['doorstop_config.ini', '.doorstop_version']) {
        const p = path.join(d.root, name);
        try { if (fs.existsSync(p)) { fs.unlinkSync(p); removed.push(name); } }
        catch (e) { errors.push(name + ': ' + e.code); }
    }
    const pd = probeDir(d.root);
    const pp = probePath(d.root);
    try { if (fs.existsSync(pp)) { fs.unlinkSync(pp); removed.push(PROBE_NAME); } }
    catch (e) { errors.push(PROBE_NAME + ': ' + e.code); }
    try { if (fs.existsSync(pd) && fs.readdirSync(pd).length === 0) { fs.rmdirSync(pd); } } catch (e) { }
    try { if (fs.existsSync(path.join(d.root, 'winhttp.dll'))) { fs.unlinkSync(path.join(d.root, 'winhttp.dll')); removed.push('winhttp.dll'); } }
    catch (e) { errors.push('winhttp.dll: ' + e.code); }
    if (errors.length) {
        throw new Error('部分文件被占用，请关闭游戏后重试：' + errors.join(', '));
    }
    return { ok: true, engine: 'unity-mono', removed: removed.length, backup: backup };
}

module.exports = { detect, status, install, remove, normalizeRoot, probePath };
