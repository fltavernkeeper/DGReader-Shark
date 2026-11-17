param(
    [string]$Mode = 'folder',
    [string]$Title = '选择游戏'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

# 路径以 Base64(UTF-8) 输出，避免 PowerShell 控制台代码页把中文/日文等路径写成乱码。
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Write-PathBase64([string]$path) {
    if ([string]::IsNullOrEmpty($path)) { return }
    $bytes = $utf8.GetBytes($path)
    Write-Output ([Convert]::ToBase64String($bytes))
}

if ($Mode -eq 'file') {
    $d = New-Object System.Windows.Forms.OpenFileDialog
    $d.Title = $Title
    $d.Filter = '游戏程序 (Game.exe;nw.exe)|Game.exe;nw.exe|可执行文件 (*.exe)|*.exe|所有文件 (*.*)|*.*'
    if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        Write-PathBase64 $d.FileName
    }
} else {
    $d = New-Object System.Windows.Forms.FolderBrowserDialog
    $d.Description = $Title
    $d.ShowNewFolderButton = $false
    if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        Write-PathBase64 $d.SelectedPath
    }
}
