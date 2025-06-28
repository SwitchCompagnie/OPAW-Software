const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { exec, spawn } = require('child_process');
const { downloadServices } = require('../bin/download-services');

let mainWindow;
let installWindow;
let apacheProcess;
let mariadbProcess;

const createWindow = (file, options = {}) => {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'src', 'images', 'favicon.ico'),
    ...options,
  });
  win.loadFile(file);
  return win;
};

const areServicesDownloaded = async () => {
  const baseDir = path.join(__dirname, '..');
  const paths = ['apache', 'php', 'mariadb', 'phpmyadmin'].map(p => path.join(baseDir, p));
  return (await Promise.all(paths.map(p => fs.access(p).then(() => true).catch(() => false)))).every(Boolean);
};

const checkAndDownloadServices = async () => {
  installWindow = createWindow('src/install.html');
  if (!(await areServicesDownloaded())) {
    try {
      await downloadServices(installWindow);
    } catch (error) {
      installWindow.webContents.send('install-error', error.message);
      return;
    }
  }
  installWindow.close();
  installWindow = null;
  mainWindow = createWindow('src/index.html');
};

app.on('ready', checkAndDownloadServices);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) mainWindow = createWindow('src/index.html');
});

app.on('before-quit', async () => {
  await Promise.all([stopApache(), stopMariaDB()]);
});

const execPromise = (command) => new Promise((resolve, reject) => {
  exec(command, (error, stdout) => error ? reject(error) : resolve(stdout));
});

const isProcessRunning = (processName) => execPromise(`tasklist /FI "IMAGENAME eq ${processName}"`)
  .then(stdout => stdout.toLowerCase().includes(processName.toLowerCase()));

const stopApache = async () => {
  if (apacheProcess) {
    apacheProcess.kill('SIGTERM');
    apacheProcess = null;
  }
  await execPromise('taskkill /F /IM httpd.exe').catch(error => console.error('Error stopping Apache:', error));
};

const stopMariaDB = async () => {
  if (mariadbProcess) {
    mariadbProcess.kill('SIGTERM');
    mariadbProcess = null;
  }
  const mariadbPath = path.join(__dirname, '..', 'mariadb', 'bin', 'mysqladmin.exe');
  await execPromise(`"${mariadbPath}" -u root -p225874120022587412 shutdown`)
    .catch(error => console.error('Error stopping MariaDB:', error));
};

const getLogs = async (service) => {
  const logPaths = {
    apache: path.join(__dirname, '..', 'apache', 'logs', 'error.log'),
    mariadb: path.join(__dirname, '..', 'mariadb', 'data', 'mariadb.err'),
  };
  try {
    const logPath = logPaths[service];
    return await fs.access(logPath).then(() => fs.readFile(logPath, 'utf8').then(data => data.split('\n').slice(-10).join('\n')))
      .catch(() => 'No logs found');
  } catch (error) {
    return `Error reading ${service} logs: ${error.message}`;
  }
};

const startService = async (service, executable, event) => {
  if (await isProcessRunning(executable)) {
    event.reply('service-status', service, 'running');
    return;
  }
  try {
    const servicePath = path.join(__dirname, '..', service, 'bin', executable);
    const proc = spawn(`"${servicePath}"`, { shell: true, detached: true, stdio: 'ignore' });
    proc.unref();
    if (service === 'apache') apacheProcess = proc;
    else mariadbProcess = proc;

    proc.on('error', (error) => {
      event.reply('service-status', service, 'error', `Error starting ${service}: ${error.message}`);
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    if (await isProcessRunning(executable)) {
      event.reply('service-status', service, 'running');
    } else {
      event.reply('service-status', service, 'error', `${service} failed to start`);
    }
  } catch (error) {
    event.reply('service-status', service, 'error', `Error starting ${service}: ${error.message}`);
  }
};

const stopService = async (service, executable, stopFn, event) => {
  try {
    await stopFn();
    await new Promise(resolve => setTimeout(resolve, 3000));
    if (!(await isProcessRunning(executable))) {
      event.reply('service-status', service, 'stopped');
    } else {
      event.reply('service-status', service, 'error', `Failed to stop ${service}`);
    }
  } catch (error) {
    event.reply('service-status', service, 'error', `Error stopping ${service}: ${error.message}`);
  }
};

ipcMain.on('check-status', async (event) => {
  const [apacheRunning, mariadbRunning] = await Promise.all([
    isProcessRunning('httpd.exe'),
    isProcessRunning('mysqld.exe'),
  ]);
  event.reply('service-status', 'apache', apacheRunning ? 'running' : 'stopped');
  event.reply('service-status', 'mariadb', mariadbRunning ? 'running' : 'stopped');
});

ipcMain.on('start-apache', (event) => startService('apache', 'httpd.exe', event));
ipcMain.on('stop-apache', (event) => stopService('apache', 'httpd.exe', stopApache, event));
ipcMain.on('restart-apache', async (event) => {
  await stopService('apache', 'httpd.exe', stopApache, event);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await startService('apache', 'httpd.exe', event);
});
ipcMain.on('get-apache-logs', async (event) => event.reply('service-logs', 'Apache', await getLogs('apache')));

ipcMain.on('start-mariadb', (event) => startService('mariadb', 'mysqld.exe', event));
ipcMain.on('stop-mariadb', (event) => stopService('mariadb', 'mysqld.exe', stopMariaDB, event));
ipcMain.on('restart-mariadb', async (event) => {
  await stopService('mariadb', 'mysqld.exe', stopMariaDB, event);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await startService('mariadb', 'mysqld.exe', event);
});
ipcMain.on('get-mariadb-logs', async (event) => event.reply('service-logs', 'MariaDB', await getLogs('mariadb')));