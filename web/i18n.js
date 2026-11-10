(function () {
  'use strict';

  var JA = {
    '文字 → 规则 → 震动 · 把你的文字游戏变成震动游戏~': 'テキスト → ルール → 振動 · あなたのテキストゲームを振動ゲームに~',
    '读取': '読み取り', '规则': 'ルール', '输出': '出力', '设备': 'デバイス',
    'OCR（实验）': 'OCR（実験）', 'OCR（附赠）': 'OCR（おまけ）', 'OCR（附赠功能）': 'OCR（おまけ機能）', '游戏 / 安装': 'ゲーム / インストール',
    '游戏': 'ゲーム', '场景': 'シーン', '当前游戏：': '現在のゲーム：',
    '游戏已连接': 'ゲーム接続済み', '游戏未连接': 'ゲーム未接続',
    '设备已连接': 'デバイス接続済み', '设备未连接': 'デバイス未接続',
    '设备服务已启动': 'デバイスサービス起動中',
    '规则列表': 'ルール一覧', '编辑规则': 'ルール編集', '新增规则': 'ルール追加',
    '重新载入': '再読み込み', '触发条件': 'トリガー条件', '来源': 'ソース',
    '匹配': '一致', '值 / 阈值': '値 / しきい値', '变量': '変数', '开关': 'スイッチ',
    '通道 A': 'チャンネル A', '通道 B': 'チャンネル B', '波形': '波形',
    '强度 0-200': '強度 0-200', '秒数': '秒数', '冷却 ms': 'クールダウン ms',
    '规则名（可留空）': 'ルール名（空欄可）', '保存规则': 'ルール保存',
    '清空表单': 'フォームをクリア', '删除': '削除', '编辑': '編集', '测试': 'テスト',
    '游戏名': 'ゲーム名', '场景名': 'シーン名', '重命名': '名前を変更',
    '新建游戏': 'ゲームを追加', '新建场景': 'シーンを追加',
    '游戏插件': 'ゲームプラグイン', '游戏目录': 'ゲームフォルダ',
    '安装插件': 'プラグインをインストール', '移除插件': 'プラグインを削除',
    '检查状态': '状態を確認', '未检查': '未確認',
    '预设 / 规则导入导出': 'プリセット / ルール入出力',
    '导出当前场景': '現在のシーンを書き出す', '导入到当前场景': '現在のシーンに読み込む',
    '导出项目': 'プロジェクトを書き出す', '导入项目': 'プロジェクトを読み込む',
    '输出目标': '出力先', '规则触发后发给谁': 'ルール発火後の送信先',
    '仅界面 / 日志': '画面 / ログのみ', '直接驱动负鼠（BLE）': 'オポッサムを直接駆動（BLE）',
    '保存输出设置': '出力設定を保存', '规则输出字段': 'ルール出力項目',
    '负鼠 BLE': 'オポッサム BLE', '连接': '接続', '断开': '切断',
    '测试 3 秒': '3 秒テスト', '停止': '停止',
    '波形库（.pulse 导入/导出）': '波形ライブラリ（.pulse 入出力）',
    '导入 .pulse': '.pulse を読み込む', '导出': '書き出す', '删除自定义': 'カスタムを削除',
    '未连接': '未接続', '未启动': '未起動', '服务已启动': 'サービス起動済み',
    '监视中': '監視中', '（无可用 OCR 语言）': '（利用可能な OCR 言語なし）',
    'OCR 模式（实验）': 'OCR モード（実験）', '启动 OCR 服务': 'OCR サービスを起動',
    '停止服务': 'サービスを停止', '识别语言': '認識言語', '刷新语言': '言語を更新',
    '截屏并框选区域': '画面を撮って範囲を選択', '尚未选择区域': '範囲未選択',
    '间隔 ms': '間隔 ms', '测试识别': '認識テスト',
    '开始监视': '監視を開始', '停止监视': '監視を停止',
    '识别结果会显示在这里。': '認識結果がここに表示されます。',
    '知道了': '閉じる',
    '对话框文本': '会話テキスト', '战斗播报': '戦闘アナウンス', '战斗日志': '戦闘ログ',
    'OCR 文本': 'OCR テキスト', '播报 ID': 'アナウンス ID',
    '不要对具有联网的Unity游戏使用该工具，可能被判定为使用外挂！': 'ネット接続のあるUnityゲームではこのツールを使用しないでください。チート判定を受ける可能性があります！',
    '不在规则中勾选 OCR 文本来源就无法触发规则。': 'ルールでOCRテキストを選択していない場合、ルールは発動しません。', '变量数值': '変数値',
    '开关状态': 'スイッチ状態', '高级表达式': '高度な式',
    '包含': '含む', '正则（| = 或）': '正規表現（| = または）',
    '图标': 'アイコン', '颜色': '色', '等于': '等しい', '前缀': '前方一致',
    '≥': '≥', '≤': '≤', '=': '=', '≠': '≠', '开启': 'オン', '关闭': 'オフ',
    '持续': '連続', '呼吸': '呼吸', '潮汐': '潮汐', '心跳': '鼓動', '脉冲': 'パルス',
    '渐强': '漸強', '渐弱': '漸弱', '锯齿': 'ノコギリ', '随机': 'ランダム',
    '按摩': 'マッサージ', '连击': '連打', '波浪': '波', '敲击': '打撃', '蠕动': 'うねり'
  };

  var EN = {
    '文字 → 规则 → 震动 · 把你的文字游戏变成震动游戏~': 'Text → Rules → Vibration · Turn your text game into a vibration game~',
    '读取': 'Read', '规则': 'Rules', '输出': 'Output', '设备': 'Device',
    'OCR（实验）': 'OCR (experimental)', 'OCR（附赠）': 'OCR (bonus)', 'OCR（附赠功能）': 'OCR (bonus feature)', '游戏 / 安装': 'Game / Install',
    '游戏': 'Game', '场景': 'Scene', '当前游戏：': 'Current game: ',
    '游戏已连接': 'Game connected', '游戏未连接': 'Game not connected',
    '设备已连接': 'Device connected', '设备未连接': 'Device not connected',
    '设备服务已启动': 'Device service running',
    '规则列表': 'Rules', '编辑规则': 'Edit rule', '新增规则': 'New rule',
    '重新载入': 'Reload', '触发条件': 'Trigger', '来源': 'Source',
    '匹配': 'Match', '值 / 阈值': 'Value / threshold', '变量': 'Variable', '开关': 'Switch',
    '通道 A': 'Channel A', '通道 B': 'Channel B', '波形': 'Waveform',
    '强度 0-200': 'Strength 0-200', '秒数': 'Seconds', '冷却 ms': 'Cooldown ms',
    '规则名（可留空）': 'Rule name (optional)', '保存规则': 'Save rule',
    '清空表单': 'Clear form', '删除': 'Delete', '编辑': 'Edit', '测试': 'Test',
    '游戏名': 'Game name', '场景名': 'Scene name', '重命名': 'Rename',
    '新建游戏': 'New game', '新建场景': 'New scene',
    '游戏插件': 'Game plugin', '游戏目录': 'Game folder',
    '安装插件': 'Install plugin', '移除插件': 'Remove plugin',
    '检查状态': 'Check status', '未检查': 'Not checked',
    '预设 / 规则导入导出': 'Preset / rule import-export',
    '导出当前场景': 'Export current scene', '导入到当前场景': 'Import into current scene',
    '导出项目': 'Export project', '导入项目': 'Import project',
    '输出目标': 'Output target', '规则触发后发给谁': 'Where triggered rules go',
    '仅界面 / 日志': 'UI / log only', '直接驱动负鼠（BLE）': 'Drive Opossum directly (BLE)',
    '保存输出设置': 'Save output settings', '规则输出字段': 'Rule output fields',
    '负鼠 BLE': 'Opossum BLE', '连接': 'Connect', '断开': 'Disconnect',
    '测试 3 秒': 'Test 3 s', '停止': 'Stop',
    '波形库（.pulse 导入/导出）': 'Waveform library (.pulse import/export)',
    '导入 .pulse': 'Import .pulse', '导出': 'Export', '删除自定义': 'Delete custom',
    '未连接': 'Not connected', '未启动': 'Not started', '服务已启动': 'Service running',
    '监视中': 'Monitoring', '（无可用 OCR 语言）': '(no OCR language available)',
    'OCR 模式（实验）': 'OCR mode (experimental)', '启动 OCR 服务': 'Start OCR service',
    '停止服务': 'Stop service', '识别语言': 'OCR language', '刷新语言': 'Refresh languages',
    '截屏并框选区域': 'Screenshot & select area', '尚未选择区域': 'No area selected',
    '间隔 ms': 'Interval ms', '测试识别': 'Test OCR',
    '开始监视': 'Start monitoring', '停止监视': 'Stop monitoring',
    '识别结果会显示在这里。': 'Recognized text will appear here.',
    '知道了': 'OK',
    '对话框文本': 'Dialogue text', '战斗播报': 'Battle announcement', '战斗日志': 'Battle log',
    'OCR 文本': 'OCR text', '播报 ID': 'Announcement ID',
    '不要对具有联网的Unity游戏使用该工具，可能被判定为使用外挂！': 'Do not use this tool with online Unity games; it may be flagged as cheating!',
    '不在规则中勾选 OCR 文本来源就无法触发规则。': 'Rules will not trigger unless you select the OCR text source in the rule.', '变量数值': 'Variable value',
    '开关状态': 'Switch state', '高级表达式': 'Advanced expression',
    '包含': 'Contains', '正则（| = 或）': 'Regex (| = OR)',
    '图标': 'Icon', '颜色': 'Color', '等于': 'Equals', '前缀': 'Prefix',
    '≥': '≥', '≤': '≤', '=': '=', '≠': '≠', '开启': 'On', '关闭': 'Off',
    '持续': 'Constant', '呼吸': 'Breathing', '潮汐': 'Tide', '心跳': 'Heartbeat',
    '脉冲': 'Pulse', '渐强': 'Ramp up', '渐弱': 'Ramp down', '锯齿': 'Saw',
    '随机': 'Random', '按摩': 'Massage', '连击': 'Burst', '波浪': 'Wave',
    '敲击': 'Knock', '蠕动': 'Crawl'
  };

  var DICTS = { ja: JA, en: EN };
  var current = 'zh';
  var origText = new WeakMap();
  var origPlaceholder = new WeakMap();
  var origTitle = new WeakMap();
  var SKIP = 'script,style,textarea,[translate="no"],.notranslate';

  function tr(s) {
    if (current === 'zh') { return s; }
    var d = DICTS[current];
    if (d && Object.prototype.hasOwnProperty.call(d, s)) { return d[s]; }
    return s;
  }

  function walk(root) {
    if (!root) { return; }
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    while (walker.nextNode()) { nodes.push(walker.currentNode); }
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var p = n.parentElement;
      if (!p || p.closest(SKIP)) { continue; }
      if (!origText.has(n)) { origText.set(n, n.nodeValue); }
      var base = origText.get(n);
      var key = base.trim();
      if (!key) { continue; }
      var lead = (base.match(/^\s*/) || [''])[0];
      var tail = (base.match(/\s*$/) || [''])[0];
      n.nodeValue = lead + tr(key) + tail;
    }
    root.querySelectorAll('[placeholder]').forEach(function (el) {
      if (!origPlaceholder.has(el)) { origPlaceholder.set(el, el.placeholder); }
      var v = origPlaceholder.get(el);
      el.placeholder = tr(v);
    });
    root.querySelectorAll('[title]').forEach(function (el) {
      if (!origTitle.has(el)) { origTitle.set(el, el.title); }
      el.title = tr(origTitle.get(el));
    });
  }

  function apply(lang) {
    current = (lang === 'ja' || lang === 'en') ? lang : 'zh';
    document.documentElement.lang = current === 'zh' ? 'zh-CN' : current;
    try { localStorage.setItem('dgreader.lang', current); } catch (e) { }
    walk(document.body);
    var sel = document.getElementById('uiLang');
    if (sel && sel.value !== current) { sel.value = current; }
  }

  function providerName() {
    var ua = navigator.userAgent || '';
    if (/Edg\//.test(ua)) { return 'Microsoft 翻译（Edge）'; }
    if (/Chrome\//.test(ua)) { return 'Google 翻译（Chrome）'; }
    if (/Firefox\//.test(ua)) { return '浏览器配置的翻译服务（可能是 Yandex / Bing / Google）'; }
    return '浏览器自带的翻译服务';
  }

  window.DGRMI18n = { apply: apply, t: tr, providerName: providerName, current: function () { return current; } };
  window.t = tr;

  document.addEventListener('DOMContentLoaded', function () {
    var saved = 'zh';
    try { saved = localStorage.getItem('dgreader.lang') || 'zh'; } catch (e) { }
    current = (saved === 'ja' || saved === 'en') ? saved : 'zh';
    var sel = document.getElementById('uiLang');
    if (sel) { sel.value = current; }
    document.documentElement.lang = current === 'zh' ? 'zh-CN' : current;
    apply(current);
  });

  new MutationObserver(function (muts) {
    if (current === 'zh') { return; }
    for (var i = 0; i < muts.length; i++) {
      var added = muts[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        if (added[j].nodeType === 1) { walk(added[j]); }
        else if (added[j].nodeType === 3 && added[j].parentElement) { walk(added[j].parentElement); }
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
