#Requires -Version 5.1
param(
    [int]$Port = 17890
)
<#
  负鼠 BLE 常驻服务（stdin/stdout JSON 行协议）
  由 Node 启动，命令示例：
    {"id":1,"cmd":"connect","address":"<12位地址>"}
    {"id":2,"cmd":"b3","a":50,"b":50}
    {"id":3,"cmd":"b0","a":50,"b":50}
    {"id":4,"cmd":"b2","a":50,"b":50}
    {"id":5,"cmd":"quit"}
#>
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await($op, [Type]$type) {
    $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
    if (-not $task.Wait(20000)) { throw 'BLE timeout' }
    return $task.Result
}

[Windows.Devices.Bluetooth.BluetoothLEDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null
[Windows.Devices.Bluetooth.BluetoothCacheMode, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null
[Windows.Devices.Bluetooth.GenericAttributeProfile.GattDeviceServicesResult, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null
[Windows.Devices.Bluetooth.GenericAttributeProfile.GattCharacteristicsResult, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null
[Windows.Devices.Bluetooth.GenericAttributeProfile.GattCommunicationStatus, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null
[Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementWatcher, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementReceivedEventArgs, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Devices.Bluetooth.Advertisement.BluetoothLEScanningMode, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Devices.Enumeration.DeviceInformation, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Devices.Enumeration.DeviceInformationCollection, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null

$SERVICE = [guid]'0000180c-0000-1000-8000-00805f9b34fb'
$WRITE_CHAR = [guid]'0000150a-0000-1000-8000-00805f9b34fb'

$script:device = $null
$script:writeChar = $null

function Respond($obj) {
    $json = $obj | ConvertTo-Json -Compress -Depth 4
    if ($script:writer) { $script:writer.WriteLine($json) }
}

function MakeB3([int]$a, [int]$b) {
    return [byte[]]@(0xB3, [byte]$a, [byte]$b)
}

function MakeB0($aa, $bb) {
    $a = @($aa | ForEach-Object { [int]$_ })
    $b = @($bb | ForEach-Object { [int]$_ })
    while ($a.Count -lt 4) { $a += 0 }
    while ($b.Count -lt 4) { $b += 0 }
    $pkt = New-Object byte[] 20
    $pkt[0] = 0xB0
    for ($i = 0; $i -lt 4; $i++) { $pkt[8 + $i] = [byte]$a[$i] }
    for ($i = 0; $i -lt 4; $i++) { $pkt[16 + $i] = [byte]$b[$i] }
    return $pkt
}

function MakeB2([int]$a, [int]$b) {
    $fixed = New-Object byte[] 21
    $fixed[0] = 0xFF
    $fixed[1] = 0xFF
    $fixed[2] = 0x00
    for ($i = 3; $i -le 18; $i++) { $fixed[$i] = 0xFF }
    $fixed[19] = 0x08
    $fixed[20] = 0x09
    $pkt = New-Object byte[] 24
    $pkt[0] = 0xB2
    [Array]::Copy($fixed, 0, $pkt, 1, 21)
    $pkt[22] = [byte]$a
    $pkt[23] = [byte]$b
    return $pkt
}

function Write-Packet([byte[]]$bytes) {
    if (-not $script:writeChar) { throw 'not connected' }
    $buffer = [System.Runtime.InteropServices.WindowsRuntime.WindowsRuntimeBufferExtensions]::AsBuffer($bytes)
    $status = Await ($script:writeChar.WriteValueAsync($buffer)) ([Windows.Devices.Bluetooth.GenericAttributeProfile.GattCommunicationStatus])
    return $status.ToString()
}

function Connect-Device([string]$address) {
    if ($script:writeChar) { return @{ ok = $true; name = $script:device.Name; status = 'already' } }
    $addrValue = [uint64]::Parse(($address -replace '^0x', ''), [System.Globalization.NumberStyles]::HexNumber)
    $device = Await ([Windows.Devices.Bluetooth.BluetoothLEDevice]::FromBluetoothAddressAsync($addrValue)) ([Windows.Devices.Bluetooth.BluetoothLEDevice])
    if (-not $device) { throw 'device not found' }

    $sres = $null
    for ($try = 1; $try -le 3; $try++) {
        $sres = Await ($device.GetGattServicesForUuidAsync($SERVICE, [Windows.Devices.Bluetooth.BluetoothCacheMode]::Uncached)) ([Windows.Devices.Bluetooth.GenericAttributeProfile.GattDeviceServicesResult])
        if ($sres.Status.ToString() -eq 'Success' -and $sres.Services.Count -gt 0) { break }
        Start-Sleep -Milliseconds 800
    }
    if (-not $sres -or $sres.Status.ToString() -ne 'Success' -or $sres.Services.Count -eq 0) {
        throw "service 180C: $($sres.Status)"
    }
    $service = $sres.Services[0]
    $wres = Await ($service.GetCharacteristicsForUuidAsync($WRITE_CHAR)) ([Windows.Devices.Bluetooth.GenericAttributeProfile.GattCharacteristicsResult])
    if ($wres.Status.ToString() -ne 'Success' -or $wres.Characteristics.Count -eq 0) {
        throw "write char 150A: $($wres.Status)"
    }
    $script:device = $device
    $script:writeChar = $wres.Characteristics[0]
    return @{ ok = $true; name = $device.Name; status = 'connected'; address = $address }
}

function Scan-Devices() {
    $script:scanFound = New-Object 'System.Collections.Concurrent.ConcurrentDictionary[string,object]'
    $watcher = New-Object Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementWatcher
    $watcher.ScanningMode = [Windows.Devices.Bluetooth.Advertisement.BluetoothLEScanningMode]::Active
    $handler = [Windows.Foundation.TypedEventHandler[Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementWatcher, Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementReceivedEventArgs]] {
        param($sender, $args)
        try {
            $addr = $args.BluetoothAddress.ToString('X12')
            $name = [string]$args.Advertisement.LocalName
            $uuids = @($args.Advertisement.ServiceUuids | ForEach-Object { $_.ToString().ToLowerInvariant() })
            if ($uuids -contains '0000180c-0000-1000-8000-00805f9b34fb' -or $name) {
                $script:scanFound[$addr] = @{
                    address = $addr
                    name = $name
                    rssi = [int]$args.RawSignalStrengthInDBm
                    source = 'advertisement'
                }
            }
        } catch { }
    }
    $token = $watcher.add_Received($handler)
    try {
        $watcher.Start()
        Start-Sleep -Milliseconds 6000
    } finally {
        try { $watcher.Stop() } catch { }
        try { $watcher.remove_Received($token) } catch { }
    }

    if ($script:scanFound.Count -gt 0) {
        $early = @()
        foreach ($v in $script:scanFound.Values) { $early += $v }
        return $early
    }

    # 已配对设备的兜底（有些设备不广播 180C，只在配对后暴露服务）
    try {
        $selector = [Windows.Devices.Bluetooth.BluetoothLEDevice]::GetDeviceSelectorFromPairingState($true)
        $infos = Await ([Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($selector)) ([Windows.Devices.Enumeration.DeviceInformationCollection])
        foreach ($info in $infos) {
            $isOpossumName = ($info.Name -match 'opossum|负鼠' -or $info.Name -match '^[0-9A-Za-z]{8,12}')
            if (-not $isOpossumName) { continue }
            try {
                $dev = Await ([Windows.Devices.Bluetooth.BluetoothLEDevice]::FromIdAsync($info.Id)) ([Windows.Devices.Bluetooth.BluetoothLEDevice])
                if (-not $dev) { continue }
                $addr = $dev.BluetoothAddress.ToString('X12')
                $sres = Await ($dev.GetGattServicesForUuidAsync($SERVICE, [Windows.Devices.Bluetooth.BluetoothCacheMode]::Cached)) ([Windows.Devices.Bluetooth.GenericAttributeProfile.GattDeviceServicesResult])
                $has = ($sres.Status.ToString() -eq 'Success' -and $sres.Services.Count -gt 0)
                if ($has -or $isOpossumName) {
                    if (-not $script:scanFound.ContainsKey($addr)) {
                        $script:scanFound[$addr] = @{
                            address = $addr
                            name = [string]$info.Name
                            rssi = 0
                            source = 'paired'
                        }
                    }
                }
                $dev.Dispose()
            } catch { }
        }
    } catch { }

    $list = @()
    foreach ($v in $script:scanFound.Values) { $list += $v }
    return $list
}

function Disconnect-Device() {
    if ($script:device) {
        try { $script:device.Dispose() } catch { }
    }
    $script:device = $null
    $script:writeChar = $null
    return @{ ok = $true; status = 'disconnected' }
}

$script:writer = $null
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()

while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $reader = New-Object System.IO.StreamReader($stream, $utf8)
    $script:writer = New-Object System.IO.StreamWriter($stream, $utf8)
    $script:writer.AutoFlush = $true

    while ($true) {
        $line = $reader.ReadLine()
        if ($null -eq $line) { break }
        $line = $line.Trim()
        if (-not $line) { continue }

        $msg = $null
        try { $msg = $line | ConvertFrom-Json } catch {
            Respond @{ ok = $false; id = 0; error = 'bad json' }
            continue
        }

        $id = $msg.id
        try {
            switch ($msg.cmd) {
                'scan' {
        $r = @{ ok = $true; devices = @(Scan-Devices) }
        $r.id = $id
        Respond $r
    }
    'connect' {
                    $r = Connect-Device ([string]$msg.address)
                    $r.id = $id
                    Respond $r
                }
                'b3' {
                    $status = Write-Packet (MakeB3 ([int]$msg.a) ([int]$msg.b))
                    Respond @{ ok = $true; id = $id; status = $status }
                }
                'b0' {
                    if ($msg.aa) { $aa = @($msg.aa) } else { $aa = @([int]$msg.a, [int]$msg.a, [int]$msg.a, [int]$msg.a) }
                    if ($msg.bb) { $bb = @($msg.bb) } else { $bb = @([int]$msg.b, [int]$msg.b, [int]$msg.b, [int]$msg.b) }
                    $status = Write-Packet (MakeB0 $aa $bb)
                    Respond @{ ok = $true; id = $id; status = $status }
                }
                'b2' {
                    $status = Write-Packet (MakeB2 ([int]$msg.a) ([int]$msg.b))
                    Respond @{ ok = $true; id = $id; status = $status }
                }
                'disconnect' {
                    $r = Disconnect-Device
                    $r.id = $id
                    Respond $r
                }
                'quit' {
                    Disconnect-Device | Out-Null
                    Respond @{ ok = $true; id = $id }
                    $client.Close()
                    $listener.Stop()
                    exit 0
                }
                default {
                    Respond @{ ok = $false; id = $id; error = 'unknown cmd' }
                }
            }
        }
        catch {
            Respond @{ ok = $false; id = $id; error = $_.Exception.Message }
        }
    }

    $client.Close()
    $script:writer = $null
    $listener.Stop()
    exit 0
}
