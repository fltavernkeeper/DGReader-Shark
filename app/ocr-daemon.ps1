param(
    [int]$Port = 17892
)
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class OcrDpi {
    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();
}
"@
[OcrDpi]::SetProcessDPIAware() | Out-Null

[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Globalization.Language, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.DataWriter, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await($op, [Type]$type, [int]$timeoutMs = 30000) {
    $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
    if (-not $task.Wait($timeoutMs)) { throw 'WinRT timeout' }
    return $task.Result
}

function Capture-Bitmap([int]$x, [int]$y, [int]$w, [int]$h) {
    if ($w -le 0 -or $h -le 0) { throw '无效的截图区域' }
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
        $g.CopyFromScreen($x, $y, 0, 0, (New-Object System.Drawing.Size($w, $h)))
    } finally {
        $g.Dispose()
    }
    return $bmp
}

function To-SoftwareBitmap($bmp) {
    $ms = New-Object System.IO.MemoryStream
    try {
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $bytes = $ms.ToArray()
    } finally {
        $ms.Dispose()
    }
    $ras = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
    $dw = New-Object Windows.Storage.Streams.DataWriter($ras)
    $dw.WriteBytes($bytes)
    Await $dw.StoreAsync() ([uint32]) | Out-Null
    $dw.DetachStream() | Out-Null
    $ras.Seek(0)
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($ras)) ([Windows.Graphics.Imaging.BitmapDecoder])
    return Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
}

$script:engines = @{}

function Get-Engine([string]$lang) {
    $key = if ($lang) { $lang } else { 'zh-Hans' }
    if ($script:engines.ContainsKey($key)) { return $script:engines[$key] }
    $language = [Windows.Globalization.Language]::new($key)
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
    if ($null -eq $engine) { throw "系统没有安装 OCR 语言包：$key" }
    $script:engines[$key] = $engine
    return $engine
}

function Get-Languages() {
    $list = @()
    foreach ($l in [Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages) {
        $list += $l.LanguageTag
    }
    return $list
}

function Invoke-Screenshot([string]$path, [int]$x, [int]$y, [int]$w, [int]$h) {
    if ($w -le 0 -or $h -le 0) {
        $vs = [System.Windows.Forms.SystemInformation]::VirtualScreen
        $x = $vs.X; $y = $vs.Y; $w = $vs.Width; $h = $vs.Height
    }
    $bmp = Capture-Bitmap $x $y $w $h
    try {
        $dir = [System.IO.Path]::GetDirectoryName($path)
        if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
        $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $bmp.Dispose()
    }
    return @{ ok = $true; path = $path; x = $x; y = $y; width = $w; height = $h }
}

function Invoke-Ocr([int]$x, [int]$y, [int]$w, [int]$h, [string]$lang) {
    $bmp = Capture-Bitmap $x $y $w $h
    try {
        $sb = To-SoftwareBitmap $bmp
        $engine = Get-Engine $lang
        $result = Await ($engine.RecognizeAsync($sb)) ([Windows.Media.Ocr.OcrResult])
        $lines = @()
        foreach ($line in $result.Lines) { $lines += $line.Text }
        return @{ ok = $true; text = $result.Text; lines = $lines }
    } finally {
        $bmp.Dispose()
    }
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
$running = $true

while ($running) {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
    $writer = New-Object System.IO.StreamWriter($stream, [System.Text.Encoding]::UTF8)
    $writer.AutoFlush = $true
    try {
        while ($true) {
            $line = $reader.ReadLine()
            if ($null -eq $line) { break }
            if (-not $line.Trim()) { continue }
            try {
                $req = $line | ConvertFrom-Json
                switch ($req.cmd) {
                    'ping' { $resp = @{ ok = $true; ts = [DateTimeOffset]::Now.ToUnixTimeMilliseconds() } }
                    'langs' { $resp = @{ ok = $true; languages = @(Get-Languages) } }
                    'shot' {
                        $resp = Invoke-Screenshot $req.path ([int]$req.x) ([int]$req.y) ([int]$req.w) ([int]$req.h)
                    }
                    'ocr' {
                        $resp = Invoke-Ocr ([int]$req.x) ([int]$req.y) ([int]$req.w) ([int]$req.h) ([string]$req.lang)
                    }
                    'quit' {
                        $resp = @{ ok = $true }
                        $writer.WriteLine(($resp | ConvertTo-Json -Compress -Depth 6))
                        $running = $false
                        break
                    }
                    default { $resp = @{ ok = $false; error = '未知命令: ' + $req.cmd } }
                }
                $writer.WriteLine(($resp | ConvertTo-Json -Compress -Depth 6))
            } catch {
                $writer.WriteLine((@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress))
            }
            if (-not $running) { break }
        }
    } finally {
        $writer.Dispose()
        $reader.Dispose()
        $stream.Dispose()
        $client.Close()
    }
}

$listener.Stop()
