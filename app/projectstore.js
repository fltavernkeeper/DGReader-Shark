'use strict';

const fs = require('fs');
const path = require('path');

function readJson(file, fallback) {
    try {
        let t = fs.readFileSync(file, 'utf8');
        if (t.charCodeAt(0) === 0xfeff) { t = t.slice(1); }
        return JSON.parse(t);
    } catch (e) {
        return fallback;
    }
}

function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const DEFAULT_VARS = {
    lust: 1021, lustMax: 1034, extasy: 1026, estrus: 1027,
    erosion: 1022, miasma: 1030, miasmaMax: 1037, domination: 212,
    clothDur: 741, clothDurMax: 742
};
const DEFAULT_SWITCHES = {
    swimming: 267, poolOpen: 261, poolHasHazuki: 268,
    swimsuit: 883, competitionSwimsuit: 886, inBattle: 18
};

class ProjectStore {
    constructor(dataDir, legacyProfilePath) {
        this.dataDir = dataDir;
        this.file = path.join(dataDir, 'projects.json');
        this.legacyProfilePath = legacyProfilePath;
        this.data = { activeProject: '', projects: [] };
        this.load();
    }

    load() {
        fs.mkdirSync(this.dataDir, { recursive: true });
        const existing = readJson(this.file, null);
        if (existing && Array.isArray(existing.projects)) {
            this.data = existing;
            return;
        }
        const legacy = readJson(this.legacyProfilePath, null);
        const project = {
            id: 'celesphonia',
            name: (legacy && legacy.game) || '默认游戏',
            gameDir: (legacy && legacy.gameDir) || '',
            vars: (legacy && legacy.vars) || DEFAULT_VARS,
            switches: (legacy && legacy.switches) || DEFAULT_SWITCHES,
            activeScene: 'default',
            scenes: [{
                id: 'default',
                name: '默认场景',
                rules: (legacy && legacy.rules) || [],
                output: (legacy && legacy.output) || { mode: 'device' }
            }]
        };
        this.data = { activeProject: project.id, projects: [project] };
        this.save();
    }

    save() {
        fs.mkdirSync(this.dataDir, { recursive: true });
        fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
    }

    list() { return this.data.projects; }

    getProject(id) {
        return this.data.projects.filter((p) => p.id === id)[0] || null;
    }

    activeProject() {
        return this.getProject(this.data.activeProject) || this.data.projects[0] || null;
    }

    activeScene(project) {
        const p = project || this.activeProject();
        if (!p) { return null; }
        return p.scenes.filter((s) => s.id === p.activeScene)[0] || p.scenes[0] || null;
    }

    activateProject(id) {
        if (!this.getProject(id)) { throw new Error('项目不存在'); }
        this.data.activeProject = id;
        this.save();
        return this.activeProject();
    }

    createProject(name, gameDir, options) {
        const base = options || {};
        const project = {
            id: uid('p'),
            name: String(name || '新项目').trim() || '新项目',
            gameDir: String(gameDir || ''),
            vars: base.vars || DEFAULT_VARS,
            switches: base.switches || DEFAULT_SWITCHES,
            activeScene: 'default',
            scenes: [{
                id: 'default',
                name: '默认场景',
                rules: base.rules || [],
                output: base.output || { mode: 'device' }
            }]
        };
        this.data.projects.push(project);
        this.data.activeProject = project.id;
        this.save();
        return project;
    }

    renameProject(id, name) {
        const p = this.getProject(id);
        if (!p) { throw new Error('项目不存在'); }
        p.name = String(name || '').trim() || p.name;
        this.save();
        return p;
    }

    deleteProject(id) {
        if (this.data.projects.length <= 1) { throw new Error('至少保留一个项目'); }
        this.data.projects = this.data.projects.filter((p) => p.id !== id);
        if (this.data.activeProject === id) { this.data.activeProject = this.data.projects[0].id; }
        this.save();
        return this.activeProject();
    }

    createScene(projectId, name) {
        const p = this.getProject(projectId);
        if (!p) { throw new Error('项目不存在'); }
        const scene = {
            id: uid('s'),
            name: String(name || '新场景').trim() || '新场景',
            rules: [],
            output: { mode: 'device' }
        };
        p.scenes.push(scene);
        p.activeScene = scene.id;
        this.save();
        return scene;
    }

    renameScene(projectId, sceneId, name) {
        const p = this.getProject(projectId);
        if (!p) { throw new Error('项目不存在'); }
        const s = p.scenes.filter((x) => x.id === sceneId)[0];
        if (!s) { throw new Error('场景不存在'); }
        s.name = String(name || '').trim() || s.name;
        this.save();
        return s;
    }

    deleteScene(projectId, sceneId) {
        const p = this.getProject(projectId);
        if (!p) { throw new Error('项目不存在'); }
        if (p.scenes.length <= 1) { throw new Error('至少保留一个场景'); }
        p.scenes = p.scenes.filter((s) => s.id !== sceneId);
        if (p.activeScene === sceneId) { p.activeScene = p.scenes[0].id; }
        this.save();
        return this.activeScene(p);
    }

    activateScene(projectId, sceneId) {
        const p = this.getProject(projectId);
        if (!p) { throw new Error('项目不存在'); }
        if (!p.scenes.some((s) => s.id === sceneId)) { throw new Error('场景不存在'); }
        p.activeScene = sceneId;
        this.save();
        return this.activeScene(p);
    }

    setRules(projectId, sceneId, rules) {
        const p = this.getProject(projectId);
        if (!p) { throw new Error('项目不存在'); }
        const s = p.scenes.filter((x) => x.id === sceneId)[0];
        if (!s) { throw new Error('场景不存在'); }
        s.rules = rules;
        this.save();
        return s;
    }

    setOutput(projectId, sceneId, output) {
        const p = this.getProject(projectId);
        const s = p && p.scenes.filter((x) => x.id === sceneId)[0];
        if (!s) { throw new Error('场景不存在'); }
        s.output = output;
        this.save();
        return s;
    }

    exportProject(id) {
        const p = this.getProject(id);
        if (!p) { throw new Error('项目不存在'); }
        return { format: 'dgreader.project/1', project: p };
    }

    exportScene(projectId, sceneId) {
        const p = this.getProject(projectId);
        const s = p && p.scenes.filter((x) => x.id === sceneId)[0];
        if (!s) { throw new Error('场景不存在'); }
        return { format: 'dgreader.scene/1', name: s.name, rules: s.rules };
    }

    importScene(projectId, sceneId, obj, replace) {
        const p = this.getProject(projectId);
        const s = p && p.scenes.filter((x) => x.id === sceneId)[0];
        if (!s) { throw new Error('场景不存在'); }
        const rules = Array.isArray(obj.rules) ? obj.rules : (Array.isArray(obj) ? obj : null);
        if (!rules) { throw new Error('文件里没有 rules 数组'); }
        s.rules = replace ? rules : s.rules.concat(rules);
        this.save();
        return s;
    }
}

module.exports = ProjectStore;
module.exports.DEFAULT_VARS = DEFAULT_VARS;
module.exports.DEFAULT_SWITCHES = DEFAULT_SWITCHES;
