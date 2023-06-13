const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const pm2 = require('pm2');

const path_app = path.join(os.homedir(), 'huinity');
const LOG = require(path.join(__dirname, 'save_log.js'));


if (!fs.existsSync(path_app)) {
  (async () => {
    await require(path.join(__dirname, 'dir.js'));
    LOG.save_log("directories app created: successful");
  })().catch(e => { console.log(e); LOG.save_log(e, 'error'); });
}

exec('pm2 -v', (error, stdout, stderr) => {
  if (error) {
    LOG.save_log("start install dependencies");
    exec('npm install pm2 -g', (err, stdout, stderr) => {
      if (err) { LOG.save_log(err, 'error') }
      else { LOG.save_log("install pm2 global module: successful") }
    });
  }
});





function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 200,
    frame: false,
    backgroundColor: '#1b4758',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  const initModule = new BrowserWindow({
    width: 800,
    height: 200,
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  mainWindow.loadFile('index.html');
  initModule.loadFile('init.html');
  initModule.webContents.openDevTools();
  mainWindow.webContents.openDevTools();

  const reload_station = () => { mainWindow.reload() }

  ipcMain.on('reload', () => { setTimeout(() => { reload_station }, 5000) });
  ipcMain.on('show_window_init', () => { initModule.show() });
  ipcMain.on('minimize_window_init', () => { initModule.minimize() });
  ipcMain.on('close_window_init', () => { initModule.close(); mainWindow.reload() });


}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) { createWindow() }
  });
});

app.on('window-all-closed', function () { app.quit() });
