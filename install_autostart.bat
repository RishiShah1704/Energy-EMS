@echo off
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%~dp0launch.vbs"
set "SHORTCUT=%STARTUP%\Jetpace Energy EMS.lnk"

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s = $ws.CreateShortcut('%SHORTCUT%');" ^
  "$s.TargetPath = 'wscript.exe';" ^
  "$s.Arguments = '\"%TARGET%\"';" ^
  "$s.WorkingDirectory = '%~dp0';" ^
  "$s.Description = 'Jetpace Energy EMS';" ^
  "$s.Save()"

echo.
echo  Jetpace Energy EMS autostart installed successfully.
echo  The dashboard will start automatically on every Windows boot.
echo.
pause
