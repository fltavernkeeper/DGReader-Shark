param(
    [string]$Mode = 'folder',
    [string]$Title = '选择游戏'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

if ($Mode -eq 'file') {
    $d = New-Object System.Windows.Forms.OpenFileDialog
    $d.Title = $Title
    $d.Filter = '游戏程序 (Game.exe;nw.exe)|Game.exe;nw.exe|可执行文件 (*.exe)|*.exe|所有文件 (*.*)|*.*'
    if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        Write-Output $d.FileName
    }
} else {
    $d = New-Object System.Windows.Forms.FolderBrowserDialog
    $d.Description = $Title
    $d.ShowNewFolderButton = $false
    if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        Write-Output $d.SelectedPath
    }
}
