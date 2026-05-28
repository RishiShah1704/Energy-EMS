$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Node-RED as background process
$nodeProcess = Start-Process -FilePath "node" -ArgumentList "start.js" -WorkingDirectory $scriptDir -WindowStyle Hidden -PassThru

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$iconPath = Join-Path $scriptDir "icon\jetpace.ico"
$icon = [System.Drawing.Icon]::new($iconPath)

$tray = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon = $icon
$tray.Text = "Jetpace Energy EMS"
$tray.Visible = $true

$openItem = New-Object System.Windows.Forms.ToolStripMenuItem
$openItem.Text = "Open Dashboard"
$openItem.Add_Click({ Start-Process "http://localhost:1881/dashboard" })

$quitItem = New-Object System.Windows.Forms.ToolStripMenuItem
$quitItem.Text = "Quit"
$quitItem.Add_Click({
    $tray.Visible = $false
    $tray.Dispose()
    if ($nodeProcess -and !$nodeProcess.HasExited) {
        Stop-Process -Id $nodeProcess.Id -Force -ErrorAction SilentlyContinue
    }
    [System.Windows.Forms.Application]::Exit()
})

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$menu.Items.Add($openItem) | Out-Null
$menu.Items.Add($quitItem) | Out-Null
$tray.ContextMenuStrip = $menu

$tray.Add_MouseDoubleClick({ Start-Process "http://localhost:1881/dashboard" })

[System.Windows.Forms.Application]::Run()
