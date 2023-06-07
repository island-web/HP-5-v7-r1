const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const pm2 = require('pm2');


const path_app = path.join(os.homedir(), 'huinity');
const LOG = require(path.join(__dirname, 'save_log.js'));

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 300,
    frame: false,
    backgroundColor: '#000',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();

  const reload_station = () => { app.relaunch(); app.quit() }

  if (!fs.existsSync(path_app)) {

    const createDirCommand = `node ${path.join(__dirname, 'dir.js')}`;
    
    exec(createDirCommand, (error, stdout, stderr) => {
      if (error) { throw error }
      else {
        LOG.save_log("Directories created successful")
        fs.writeFileSync(path.join(__dirname, 'init.json'), JSON.stringify({initialization:"true", first:"true"}, 'utf-8'));
        LOG.save_log("Key initialization === true");
        LOG.save_log("RELOAD STATION").then(() => { reload_station })
      }
    })
  }

  const runInstallationPM2 = () => {
    const installPM2Command = `node ${path.join(__dirname, 'install_pm2.js')}`;
    exec(installPM2Command, (error, stdout, stderr) => {
      if (error) { 
        try {
          LOG.save_log("Error connected to demon pm2INSTALL", 'error');
        } catch (error) { throw error }
      }
    })
  }

  const checkPM2Installation = () => {
    exec('pm2 -v', (error, stdout, stderr) => {
      if (error) { runInstallationPM2() }
      //const createConnectPM2Command = `node ${path.join(__dirname, 'pm2.js')}`;
      //exec(createConnectPM2Command, (error, stdout, stderr) => { if (error) { throw error } });
    })
  }

  checkPM2Installation();

  ipcMain.on('reload', () => { reload_station });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

});

app.on('window-all-closed', function () {
  app.quit();
});
