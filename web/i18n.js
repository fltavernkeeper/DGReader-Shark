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
    '关于': 'このツールについて',
    'DGReader 鲨鱼版': 'DGReader サメ版',
    '当前版本：': '現在のバージョン：',
    '最新 Release：': '最新リリース：',
    'Discussions：': 'Discussions：',
    '更新不定期。': '更新は不定期です。',
    '使用问题、兼容性讨论、经验交流、功能建议、波形与预设，都可以在 Discussions 页面讨论。': '使用上の問題、互換性の議論、経験の共有、機能提案、波形・プリセットは、Discussions ページで議論できます。',
    '获取更新': 'アップデートの入手',
    '1. 打开最新 Release 页面。': '1. 最新のリリースページを開きます。',
    '2. 下载最新的 DGReader Shark vX.XX.zip。': '2. 最新の DGReader Shark vX.XX.zip をダウンロードします。',
    '3. 解压到新目录，不要直接覆盖旧目录。': '3. 新しいフォルダに解凍してください。古いフォルダを直接上書きしないでください。',
    '4. 确认新版可用后，再删除旧版。': '4. 新しいバージョンが使えることを確認してから、古いバージョンを削除してください。',
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
    '按摩': 'マッサージ', '连击': '連打', '波浪': '波', '敲击': '打撃', '蠕动': 'うねり',
    '随机波形': 'ランダム波形',
    '获取波形': '波形を入手',
    '第三方波形库：': 'サードパーティ波形ライブラリ：',
    '作者：zakotoys': '作者：zakotoys',
    '许可证：MIT': 'ライセンス：MIT',
    '说明：不同设备/版本的波形导入后可能和原工具效果有差异。': '説明：デバイスやバージョンが異なると、インポート後の効果が元のツールと異なる場合があります。',
    '负鼠是DG-LAB地牢实验室生产的独立 BLE 设备。': 'オポッサムはDG-LAB（Dungeon-Lab）製の独立したBLEデバイスです。',
  };

  var EN = {
    '文字 → 规则 → 震动 · 把你的文字游戏变成震动游戏~': 'Text → Rules → Vibration · Turn your text game into a vibration game~',
    '读取': 'Read', '规则': 'Rules', '输出': 'Output', '设备': 'Device',
    'OCR（实验）': 'OCR (experimental)', 'OCR（附赠）': 'OCR (bonus)', 'OCR（附赠功能）': 'OCR (bonus feature)', '游戏 / 安装': 'Game / Install',
    '游戏': 'Game', '场景': 'Scene', '当前游戏：': 'Current game: ',
    '游戏已连接': 'Game connected', '游戏未连接': 'Game not connected',
    '设备已连接': 'Device connected', '设备未连接': 'Device not connected',
    '设备服务已启动': 'Device service running',
    '关于': 'About',
    'DGReader 鲨鱼版': 'DGReader Shark Edition',
    '当前版本：': 'Current version: ',
    '最新 Release：': 'Latest release: ',
    'Discussions：': 'Discussions: ',
    '更新不定期。': 'Updates are irregular.',
    '使用问题、兼容性讨论、经验交流、功能建议、波形与预设，都可以在 Discussions 页面讨论。': 'For usage questions, compatibility discussion, experience sharing, feature suggestions, waveforms and presets, please use the Discussions page.',
    '获取更新': 'Get updates',
    '1. 打开最新 Release 页面。': '1. Open the latest Release page.',
    '2. 下载最新的 DGReader Shark vX.XX.zip。': '2. Download the latest DGReader Shark vX.XX.zip.',
    '3. 解压到新目录，不要直接覆盖旧目录。': '3. Extract it to a new folder; do not overwrite the old folder.',
    '4. 确认新版可用后，再删除旧版。': '4. After confirming the new version works, delete the old version.',
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
    '敲击': 'Knock', '蠕动': 'Crawl', '随机波形': 'Random waveform',
    '获取波形': 'Get waveforms',
    '第三方波形库：': 'Third-party waveform library: ',
    '作者：zakotoys': 'Author: zakotoys',
    '许可证：MIT': 'License: MIT',
    '说明：不同设备/版本的波形导入后可能和原工具效果有差异。': 'Note: imported waveforms may behave differently depending on device or version.',
    '负鼠是DG-LAB地牢实验室生产的独立 BLE 设备。': 'Opossum is an independent BLE device made by DG-LAB (Dungeon-Lab).'
  };

  Object.assign(JA, {
    '语言': '言語',
    '对话框事件文本': '会話イベントテキスト',
    '等待对话……': '会話を待機中……',
    '战斗左上角播报': '戦闘左上のアナウンス',
    '等待战斗播报……': '戦闘アナウンスを待機中……',
    '战斗日志（左上角）': '戦闘ログ（左上）',
    '等待战斗日志……': '戦闘ログを待機中……',
    '通道状态': 'チャンネル状態',
    '规则打算输出什么': 'ルールの出力内容',
    '显示原始转义文本': '生のエスケープテキストを表示',
    '规则可输出到界面，也可直接驱动负鼠 BLE（设备标签）。': 'ルールは画面への出力のほか、オポッサムBLE（デバイスタグ）を直接駆動できます。',
    '规则触发': 'ルール発火',
    '提示': 'ヒント',
    '图标与颜色来自游戏': 'アイコンと色はゲーム由来',
    '规则可匹配': 'ルールで照合可能',
    '点上方「规则」标签可增删改，保存后立即生效。': '上の「ルール」タブで追加・削除・編集できます。保存後すぐ反映されます。',
    '新建': '新規',
    'Unity 文本': 'Unity テキスト',
    '正则': '正規表現',
    '表达式': '式',
    '输出（A/B 可同时启用）': '出力（A/B 同時有効可）',
    '设备未连接时，规则只记录日志，不会报错。': 'デバイス未接続時、ルールはログのみ記録し、エラーにはなりません。',
    '每条规则可独立设置 A / B：': '各ルールは A / B を個別に設定できます：',
    '· 是否启用': '・有効/無効',
    '· 波形': '・波形',
    '· 强度 0–200': '・強度 0–200',
    '· 秒数（0 表示持续到条件不成立）': '・秒数（0 は条件が成立しなくなるまで継続）',
    'A/B 的波形互不影响，设备层会按 25ms 粒度分别生成 B0 数据。': 'A/B の波形は互いに影響せず、デバイス層が 25ms 単位で別々に B0 データを生成します。',
    '强度最终仍受设备自身限制。': '強度は最終的にデバイス自体の制限を受けます。',
    '每个游戏一个项目': 'ゲームごとに1プロジェクト',
    '新建游戏会弹窗选择游戏目录；不同游戏之间的规则/变量互相独立。 游戏名建议直接填写游戏本名，方便识别。': '新しいゲームではフォルダ選択ダイアログが開きます。ゲーム間のルール/変数は独立しています。ゲーム名は識別しやすいよう本来のタイトルを入力してください。',
    '同一游戏的不同预设': '同じゲームの別プリセット',
    '场景用于同一游戏的不同玩法/章节；切换场景会切换整套规则。': 'シーンは同じゲームの別の遊び方/章ごとに使います。シーンを切り替えるとルール一式も切り替わります。',
    '安装 / 移除': 'インストール / 削除',
    '浏览…': '参照…',
    '插件作用：从游戏运行时读取已经解码好的文字。': 'プラグインの役割：ゲーム実行時にデコード済みのテキストを読み取ります。',
    'RPG Maker MV制作的游戏大部分可以读取，Unity制作的游戏并没有完全适配，实在不行请用OCR功能。': 'RPG Maker MV 製のゲームは大半が読み取れます。Unity 製ゲームは完全対応ではないため、うまくいかない場合は OCR を使用してください。',
    '安装/移除只改插件文件，不会改写游戏原始数据，并会自动备份。': 'インストール/削除はプラグインファイルのみ変更し、ゲームの元データは書き換えません。既存ファイルは自動バックアップされます。',
    '场景规则或整个项目': 'シーンのルールまたはプロジェクト全体',
    '导出的场景文件就是“预设”，可以导入到其它游戏/场景； 导入项目会创建一个新项目（不会覆盖当前项目）。': '書き出したシーンファイルは「プリセット」で、他のゲーム/シーンに読み込めます。プロジェクトの読み込みは新規プロジェクトを作成し、現在のプロジェクトは上書きしません。',
    '给 RPG Maker MV/MZ 之外的文字类游戏': 'RPG Maker MV/MZ 以外のテキストゲーム向け',
    '这是附赠功能，用于 RPG Maker MV/MZ 之外、无法安装插件的文字类游戏 （Unity、独立 AVG 等）。原理是调用 Windows 自带 OCR 识别屏幕上的文字， 不是 hook，所以有延迟，也会受字体、背景、文字速度影响。': 'RPG Maker MV/MZ 以外の、プラグインを入れられないテキストゲーム（Unity、インディーAVGなど）向けの付属機能です。Windows標準OCRで画面の文字を認識するため、フックではなく、遅延やフォント・背景・文字速度の影響を受けます。',
    '使用前请先安装系统 OCR 语言包：': '使用前にシステムの OCR 言語パックをインストールしてください：',
    'Windows 设置 → 时间和语言 → 语言 → 添加中文/日文/英文 → 安装“光学字符识别”。': 'Windows の設定 → 時刻と言語 → 言語 → 中国語/日本語/英語を追加 → 「光学式文字認識」をインストール。',
    '识别语言列表只显示系统已安装的 OCR 语言。': '認識言語一覧には、システムにインストール済みの OCR 言語だけが表示されます。',
    '截屏后拖动左键框选': 'スクリーンショット後に左ドラッグで範囲選択',
    '截屏': 'スクリーンショット',
    '5s后截屏': '5秒後にスクリーンショット',
    '点击按钮后，在截图上按住左键拖动，框住要识别的文字区域': 'ボタンを押した後、スクリーンショット上で左ボタンを押したままドラッグし、認識するテキスト領域を囲んでください',
    '{n} 秒后截屏，请切换到游戏': '{n} 秒後にスクリーンショットします。ゲーム画面に切り替えてください。',
    '已截屏，请切回 DGReader 框选区域': 'スクリーンショットを撮りました。DGReader に戻って範囲を選択してください。',
    '截图 {w}×{h}，请在图上拖动框选要识别的区域。': 'スクリーンショット {w}×{h}。画像上でドラッグして認識する範囲を選択してください。',
    '截图失败': 'スクリーンショット失敗',
    '请先截屏并框选区域': '先にスクリーンショットを撮り、範囲を選択してください',
    '点击按钮后，在截图上按住左键拖动，框住对话框文字区域': 'ボタンを押した後、スクリーンショット上で左ボタンを押したままドラッグし、会話テキスト領域を囲んでください',
    '识别出的文字会作为【规则】里“OCR 文本”来源的输入；文字稳定约 2 帧后才会触发规则。': '認識した文字は【ルール】の「OCR テキスト」ソースへの入力になります。文字が約2フレーム安定してからルールが発火します。',
    'OCR 有 1–3 秒延迟，快速滚动/逐字显示会漏读；请把游戏文字显示速度调快、自动翻页速度调慢。': 'OCR には1～3秒の遅延があり、高速スクロール/1文字ずつの表示では読み漏らすことがあります。ゲームの文字表示速度を速くし、自動送りの速度を遅くしてください。',
    '只支持关键词/正则规则，不支持变量、图标、颜色；需要游戏保持前台可见。': 'キーワード/正規表現ルールのみ対応。変数・アイコン・色は非対応。ゲームを前面に表示しておく必要があります。',
    '官方协议 180C / 150A · B3 强度 + B0 波形': '公式プロトコル 180C / 150A · B3 強度 + B0 波形',
    '蓝牙地址': 'Bluetooth アドレス',
    '扫描附近负鼠': '近くのオポッサムをスキャン',
    '点击“扫描附近负鼠”查找设备': '「近くのオポッサムをスキャン」を押してデバイスを検索',
    '使用选中': '選択を使用',
    '首次使用：Windows 设置 → 蓝牙和其他设备 → 添加设备 → 蓝牙 → 显示所有设备 → 选择负鼠设备名（数字+英文）。': '初回：Windows の設定 → Bluetooth とその他のデバイス → デバイスの追加 → Bluetooth → その他のデバイスを表示 → オポッサムのデバイス名（数字+英字）を選択。',
    '配对完成后回到这里，点“扫描附近负鼠” → 使用选中 → 连接。地址会自动记住，以后可直接连接。': 'ペアリング後、ここに戻って「近くのオポッサムをスキャン」→「選択を使用」→「接続」。アドレスは自動保存され、次回から直接接続できます。',
    '扫描约 6–30 秒，请让负鼠开机并靠近电脑。': 'スキャンには約6～30秒かかります。オポッサムの電源を入れ、PCの近くに置いてください。',
    '通道 A 强度': 'チャンネル A 強度',
    'A 波形': 'A 波形',
    '通道 B 强度': 'チャンネル B 強度',
    'B 波形': 'B 波形',
    '导出波形': '波形を書き出す',
    '支持 Dungeonlab+pulse 文本格式，以及 JSON。': 'Dungeonlab+pulse テキスト形式と JSON に対応。',
    '导入限制：单个波形最多 30 段、4800 个点（约 120 秒）；多段按顺序合并。外部官方格式每点按 0.1 秒展开，特殊头部/参数可能无法完全还原。': 'インポート制限：1波形あたり最大30セクション、4800ポイント（約120秒）。複数セクションは順番に結合。外部公式形式は1ポイント0.1秒として展開し、特殊なヘッダー/パラメータは完全に再現できない場合があります。',
    '说明': '説明',
    '在【输出】选择“直接驱动负鼠”后，规则就会直接控制设备。': '【出力】で「オポッサムを直接駆動」を選ぶと、ルールがデバイスを直接制御します。',
    '其他语言 / Other languages': 'その他の言語 / Other languages',
    '其他语言…': 'その他の言語…',
    'Window_BattleLog / 敌人行动 / 伤害 / 状态': 'Window_BattleLog / 敵の行動 / ダメージ / 状態',
    '/ 文本 / 语义 ID。': '/ テキスト / セマンティックID。',
    '例如 泳池-游泳': '例：プール-水泳',
    '关键词、正则、图标编号或数值': 'キーワード、正規表現、アイコン番号または数値',
    '建议填写游戏名': 'ゲーム名を入力してください',
    '选择游戏本体目录（RPG Maker 或 Unity 游戏根目录）': 'ゲーム本体のフォルダを選択（RPG Maker または Unity のルート）',
    '点击后在截图上按住左键拖动框选': 'クリック後、スクリーンショット上で左ドラッグして範囲選択',
    '扫描后自动填入，或手动输入 12 位地址': 'スキャン後に自動入力、または12桁のアドレスを手動入力',
    '已连接：': '接続済み：',
    'BLE 服务已启动，等待连接': 'BLEサービス起動済み、接続待ち',
    '未连接': '未接続',
    '正在扫描附近的负鼠…（约 6–30 秒）': '近くのオポッサムをスキャン中…（約6～30秒）',
    '未命名设备': '名称未設定のデバイス',
    '没有找到负鼠': 'オポッサムが見つかりません',
    '找到 {n} 个设备，已填入第一个；可按“连接”': '{n} 台のデバイスが見つかりました。最初のデバイスを入力しました。「接続」を押してください。',
    '没有找到负鼠：请确认设备已开机、靠近电脑，并在 Windows 蓝牙设置里配对过': 'オポッサムが見つかりません：電源が入っていること、PCの近くにあること、WindowsのBluetooth設定でペアリング済みであることを確認してください。',
    '扫描失败：': 'スキャン失敗：',
    '请先扫描并选择一个设备': '先にスキャンしてデバイスを選択してください',
    '已选择 {name}，点击“连接”': '{name} を選択しました。「接続」を押してください。',
    '请先填蓝牙地址': '先にBluetoothアドレスを入力してください',
    '连接中…（请确认负鼠已开机、未被其它程序占用）': '接続中…（オポッサムの電源が入っていること、他のプログラムが使用していないことを確認してください）',
    '连接失败：': '接続失敗：',
    '测试中：A={a}（{waveA}）  B={b}（{waveB}）': 'テスト中：A={a}（{waveA}）  B={b}（{waveB}）',
    '测试失败：': 'テスト失敗：',
    '已停止': '停止しました',
    '规则触发记录': 'ルール発火記録',
    '支持 Dungeonlab+pulse 文本格式，以及 JSON；可一次选择多个文件。': 'Dungeonlab+pulse テキスト形式と JSON に対応。複数ファイルを一度に選択できます。',
    '先选择 .pulse 文件': '先に .pulse ファイルを選択してください',
    '有 {n} 个重名波形：{names}\n继续导入将自动改名，不会覆盖旧波形。是否继续？': '同名の波形が {n} 個あります：{names}\n続行すると自動で改名され、古い波形は上書きされません。続行しますか？',
    '重名波形': '同名の波形',
    '自动改名': '自動で改名',
    '覆盖': '上書き',
    '跳过': 'スキップ',
    '新建项目会弹窗选择游戏目录；不同游戏之间的规则/变量互相独立。 项目名建议直接填写游戏本名，方便识别。': '新規プロジェクトではゲームフォルダ選択ダイアログが開きます。ゲーム間のルール/変数は独立しています。プロジェクト名はゲーム本来のタイトルを入力すると識別しやすいです。',
    '项目': 'プロジェクト',
    '项目名': 'プロジェクト名',
    '新建项目': '新規プロジェクト',
    '建议填写项目名': 'プロジェクト名を入力してください',
    '每个游戏一个项目': '1ゲームにつき1プロジェクト',
    '请输入项目名（建议与游戏本名一致）': 'プロジェクト名を入力してください（ゲーム本来のタイトル推奨）',
    '新项目': '新規プロジェクト',
    '新的项目名': '新しいプロジェクト名',
    '取消': 'キャンセル',
    '发现 {n} 个重名波形：{names}\n请选择处理方式。': '同名の波形が {n} 個あります：{names}\n処理方法を選択してください。',
    '，覆盖 {n} 个': '、上書き {n} 件',
    '，跳过 {n} 个': '、スキップ {n} 件',
    '导入完成：成功 {n} 个': 'インポート完了：成功 {n} 件',
    '，改名 {n} 个': '、改名 {n} 件',
    '，失败 {n} 个': '、失敗 {n} 件',
    '已取消导入': 'インポートをキャンセルしました',
  });
  Object.assign(EN, {
    '语言': 'Language',
    '对话框事件文本': 'Dialogue event text',
    '等待对话……': 'Waiting for dialogue…',
    '战斗左上角播报': 'Battle announcement (top left)',
    '等待战斗播报……': 'Waiting for battle announcement…',
    '战斗日志（左上角）': 'Battle log (top left)',
    '等待战斗日志……': 'Waiting for battle log…',
    '通道状态': 'Channel status',
    '规则打算输出什么': 'What rules will output',
    '显示原始转义文本': 'Show raw escaped text',
    '规则可输出到界面，也可直接驱动负鼠 BLE（设备标签）。': 'Rules can output to the UI or drive the Opossum BLE device (Device tab).',
    '规则触发': 'Rule triggered',
    '提示': 'Tip',
    '图标与颜色来自游戏': 'Icons and colors come from the game',
    '规则可匹配': 'Rules can match',
    '点上方「规则」标签可增删改，保存后立即生效。': 'Use the Rules tab above to add, edit, or delete; changes apply immediately after saving.',
    '新建': 'New',
    'Unity 文本': 'Unity text',
    '正则': 'Regex',
    '表达式': 'Expression',
    '输出（A/B 可同时启用）': 'Output (A/B can be enabled together)',
    '设备未连接时，规则只记录日志，不会报错。': 'When no device is connected, rules only log and do not error.',
    '每条规则可独立设置 A / B：': 'Each rule can configure A / B independently:',
    '· 是否启用': '· Enabled',
    '· 波形': '· Waveform',
    '· 强度 0–200': '· Strength 0–200',
    '· 秒数（0 表示持续到条件不成立）': '· Seconds (0 = continue until condition is false)',
    'A/B 的波形互不影响，设备层会按 25ms 粒度分别生成 B0 数据。': 'A/B waveforms are independent; the device layer generates separate B0 data at 25 ms granularity.',
    '强度最终仍受设备自身限制。': 'Strength is ultimately limited by the device itself.',
    '每个游戏一个项目': 'One project per game',
    '新建游戏会弹窗选择游戏目录；不同游戏之间的规则/变量互相独立。 游戏名建议直接填写游戏本名，方便识别。': 'Creating a game opens a folder picker; rules/variables are independent per game. Use the actual game title for easy identification.',
    '同一游戏的不同预设': 'Different presets for the same game',
    '场景用于同一游戏的不同玩法/章节；切换场景会切换整套规则。': 'Scenes are for different playstyles/chapters of the same game; switching scenes switches the whole rule set.',
    '安装 / 移除': 'Install / Remove',
    '浏览…': 'Browse…',
    '插件作用：从游戏运行时读取已经解码好的文字。': 'Plugin purpose: read already-decoded text while the game is running.',
    'RPG Maker MV制作的游戏大部分可以读取，Unity制作的游戏并没有完全适配，实在不行请用OCR功能。': 'Most RPG Maker MV games can be read. Unity games are not fully supported; use OCR if it does not work.',
    '安装/移除只改插件文件，不会改写游戏原始数据，并会自动备份。': 'Install/remove only changes plugin files, does not modify original game data, and automatically backs up existing files.',
    '场景规则或整个项目': 'Scene rules or entire project',
    '导出的场景文件就是“预设”，可以导入到其它游戏/场景； 导入项目会创建一个新项目（不会覆盖当前项目）。': 'An exported scene file is a preset and can be imported into other games/scenes; importing a project creates a new project and does not overwrite the current one.',
    '给 RPG Maker MV/MZ 之外的文字类游戏': 'For text games other than RPG Maker MV/MZ',
    '这是附赠功能，用于 RPG Maker MV/MZ 之外、无法安装插件的文字类游戏 （Unity、独立 AVG 等）。原理是调用 Windows 自带 OCR 识别屏幕上的文字， 不是 hook，所以有延迟，也会受字体、背景、文字速度影响。': 'Bonus feature for text games outside RPG Maker MV/MZ where plugins cannot be installed (Unity, indie AVG, etc.). It uses Windows OCR, not hooks, so it has latency and is affected by fonts, background, and text speed.',
    '使用前请先安装系统 OCR 语言包：': 'Install the system OCR language pack before use:',
    'Windows 设置 → 时间和语言 → 语言 → 添加中文/日文/英文 → 安装“光学字符识别”。': 'Windows Settings → Time & language → Language → Add Chinese/Japanese/English → install "Optical character recognition".',
    '识别语言列表只显示系统已安装的 OCR 语言。': 'The language list only shows OCR languages installed on the system.',
    '截屏后拖动左键框选': 'Screenshot, then drag with left button to select',
    '截屏': 'Screenshot',
    '5s后截屏': 'Screenshot in 5s',
    '点击按钮后，在截图上按住左键拖动，框住要识别的文字区域': 'After clicking, drag with the left button on the screenshot to select the text area to recognize.',
    '{n} 秒后截屏，请切换到游戏': 'Taking a screenshot in {n} s. Switch to the game.',
    '已截屏，请切回 DGReader 框选区域': 'Screenshot captured. Switch back to DGReader to select the area.',
    '截图 {w}×{h}，请在图上拖动框选要识别的区域。': 'Screenshot {w}×{h}. Drag on the image to select the area to recognize.',
    '截图失败': 'Screenshot failed',
    '请先截屏并框选区域': 'Take a screenshot and select an area first',
    '点击按钮后，在截图上按住左键拖动，框住对话框文字区域': 'After clicking, drag with the left button on the screenshot to select the dialogue text area',
    '识别出的文字会作为【规则】里“OCR 文本”来源的输入；文字稳定约 2 帧后才会触发规则。': 'Recognized text is fed into the "OCR text" source in Rules; rules trigger after the text is stable for about 2 frames.',
    'OCR 有 1–3 秒延迟，快速滚动/逐字显示会漏读；请把游戏文字显示速度调快、自动翻页速度调慢。': 'OCR has 1–3 s latency and may miss fast scrolling or character-by-character text; increase text speed and slow auto-advance.',
    '只支持关键词/正则规则，不支持变量、图标、颜色；需要游戏保持前台可见。': 'Only keyword/regex rules are supported; variables, icons, and colors are not. Keep the game visible in the foreground.',
    '官方协议 180C / 150A · B3 强度 + B0 波形': 'Official protocol 180C / 150A · B3 strength + B0 waveform',
    '蓝牙地址': 'Bluetooth address',
    '扫描附近负鼠': 'Scan for nearby Opossum',
    '点击“扫描附近负鼠”查找设备': 'Click "Scan for nearby Opossum" to find devices',
    '使用选中': 'Use selected',
    '首次使用：Windows 设置 → 蓝牙和其他设备 → 添加设备 → 蓝牙 → 显示所有设备 → 选择负鼠设备名（数字+英文）。': 'First use: Windows Settings → Bluetooth & devices → Add device → Bluetooth → Show all devices → select the Opossum device name (numbers + letters).',
    '配对完成后回到这里，点“扫描附近负鼠” → 使用选中 → 连接。地址会自动记住，以后可直接连接。': 'After pairing, return here and click Scan → Use selected → Connect. The address is remembered for next time.',
    '扫描约 6–30 秒，请让负鼠开机并靠近电脑。': 'Scanning takes about 6–30 s; power on the Opossum and keep it near the PC.',
    '通道 A 强度': 'Channel A strength',
    'A 波形': 'A waveform',
    '通道 B 强度': 'Channel B strength',
    'B 波形': 'B waveform',
    '导出波形': 'Export waveform',
    '支持 Dungeonlab+pulse 文本格式，以及 JSON。': 'Supports Dungeonlab+pulse text format and JSON.',
    '导入限制：单个波形最多 30 段、4800 个点（约 120 秒）；多段按顺序合并。外部官方格式每点按 0.1 秒展开，特殊头部/参数可能无法完全还原。': 'Import limits: up to 30 sections and 4800 points (~120 s) per waveform; sections are concatenated in order. External official format is expanded at 0.1 s per point; special headers/parameters may not be fully reproduced.',
    '说明': 'Notes',
    '在【输出】选择“直接驱动负鼠”后，规则就会直接控制设备。': 'After selecting "Drive Opossum directly" in Output, rules control the device directly.',
    '其他语言 / Other languages': 'Other languages',
    '其他语言…': 'Other languages…',
    'Window_BattleLog / 敌人行动 / 伤害 / 状态': 'Window_BattleLog / enemy actions / damage / states',
    '/ 文本 / 语义 ID。': '/ text / semantic ID.',
    '例如 泳池-游泳': 'e.g. pool-swimming',
    '关键词、正则、图标编号或数值': 'Keyword, regex, icon number, or value',
    '建议填写游戏名': 'Enter a game name',
    '选择游戏本体目录（RPG Maker 或 Unity 游戏根目录）': 'Select game root folder (RPG Maker or Unity root)',
    '点击后在截图上按住左键拖动框选': 'After clicking, drag on the screenshot to select',
    '扫描后自动填入，或手动输入 12 位地址': 'Auto-filled after scanning, or enter the 12-digit address manually',
    '已连接：': 'Connected: ',
    'BLE 服务已启动，等待连接': 'BLE service running, waiting for connection',
    '未连接': 'Not connected',
    '正在扫描附近的负鼠…（约 6–30 秒）': 'Scanning for nearby Opossum… (about 6–30 s)',
    '未命名设备': 'Unnamed device',
    '没有找到负鼠': 'No Opossum found',
    '找到 {n} 个设备，已填入第一个；可按“连接”': 'Found {n} device(s); the first one is filled in. Click Connect.',
    '没有找到负鼠：请确认设备已开机、靠近电脑，并在 Windows 蓝牙设置里配对过': 'No Opossum found: make sure it is powered on, near the PC, and paired in Windows Bluetooth settings.',
    '扫描失败：': 'Scan failed: ',
    '请先扫描并选择一个设备': 'Scan and select a device first',
    '已选择 {name}，点击“连接”': 'Selected {name}. Click Connect.',
    '请先填蓝牙地址': 'Enter the Bluetooth address first',
    '连接中…（请确认负鼠已开机、未被其它程序占用）': 'Connecting… (make sure the Opossum is on and not used by another program)',
    '连接失败：': 'Connection failed: ',
    '测试中：A={a}（{waveA}）  B={b}（{waveB}）': 'Testing: A={a} ({waveA})  B={b} ({waveB})',
    '测试失败：': 'Test failed: ',
    '已停止': 'Stopped',
    '规则触发记录': 'Rule trigger history',
    '支持 Dungeonlab+pulse 文本格式，以及 JSON；可一次选择多个文件。': 'Supports Dungeonlab+pulse text format and JSON; multiple files can be selected at once.',
    '先选择 .pulse 文件': 'Select a .pulse file first',
    '有 {n} 个重名波形：{names}\n继续导入将自动改名，不会覆盖旧波形。是否继续？': 'There are {n} duplicate waveform names: {names}\nContinuing will rename them automatically and will not overwrite existing waveforms. Continue?',
    '重名波形': 'Duplicate waveforms',
    '自动改名': 'Rename automatically',
    '覆盖': 'Overwrite',
    '跳过': 'Skip',
    '新建项目会弹窗选择游戏目录；不同游戏之间的规则/变量互相独立。 项目名建议直接填写游戏本名，方便识别。': 'Creating a project opens a game folder picker; rules/variables are independent per game. Use the actual game title as the project name for easy identification.',
    '项目': 'Project',
    '项目名': 'Project name',
    '新建项目': 'New project',
    '建议填写项目名': 'Enter a project name',
    '每个游戏一个项目': 'One project per game',
    '请输入项目名（建议与游戏本名一致）': 'Enter a project name (preferably the game title)',
    '新项目': 'New project',
    '新的项目名': 'New project name',
    '取消': 'Cancel',
    '发现 {n} 个重名波形：{names}\n请选择处理方式。': 'Found {n} duplicate waveform name(s): {names}\nChoose how to handle them.',
    '，覆盖 {n} 个': ', {n} overwritten',
    '，跳过 {n} 个': ', {n} skipped',
    '导入完成：成功 {n} 个': 'Import complete: {n} succeeded',
    '，改名 {n} 个': ', {n} renamed',
    '，失败 {n} 个': ', {n} failed',
    '已取消导入': 'Import cancelled',
  });

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
    var normalized = String(s || '').replace(/\s+/g, ' ').trim();
    if (d && normalized && Object.prototype.hasOwnProperty.call(d, normalized)) { return d[normalized]; }
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
