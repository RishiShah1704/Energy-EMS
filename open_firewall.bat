@echo off
echo Opening port 1881 for Jetpace Energy EMS...
netsh advfirewall firewall delete rule name="Jetpace Energy EMS" >nul 2>&1
netsh advfirewall firewall add rule name="Jetpace Energy EMS" dir=in action=allow protocol=TCP localport=1881
echo.
echo  Done. Port 1881 is now open on this PC.
echo  Dashboard is accessible at http://YOUR-PC-IP:1881/dashboard
echo.
pause
