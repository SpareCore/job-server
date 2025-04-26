@echo off
echo Installing GoPine Job Server as a Windows service...
npm install -g node-windows
npm link node-windows
node install-service.js
echo Done.