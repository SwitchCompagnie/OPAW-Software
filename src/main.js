const { app, BrowserWindow, ipcMain } = require('electron');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const downloadServices = require('../bin/download-services').downloadServices;

let mainWindow;
let apacheProcess = null;
let mariadbProcess = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
        },
        autoHideMenuBar: true,
        icon: 'src/images/favicon.ico'
    });

    mainWindow.loadFile('src/index.html');

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// Vérifie si tous les services sont déjà téléchargés
function areServicesDownloaded() {
    const baseDir = path.join(__dirname, '..');
    return fs.existsSync(path.join(baseDir, 'apache')) &&
           fs.existsSync(path.join(baseDir, 'php')) &&
           fs.existsSync(path.join(baseDir, 'mariadb')) &&
           fs.existsSync(path.join(baseDir, 'phpmyadmin'));
}

// Démarre les téléchargements si nécessaire
async function checkAndDownloadServices() {
    if (!areServicesDownloaded()) {
        await downloadServices();
    }
}

// Démarre Apache
function startApache() {
    const apachePath = path.join(__dirname, '..', 'apache', 'bin', 'httpd.exe');
    apacheProcess = spawn(apachePath);
    apacheProcess.stdout.on('data', (data) => {
        console.log(`Apache: ${data}`);
    });
    apacheProcess.stderr.on('data', (data) => {
        console.error(`Erreur Apache: ${data}`);
    });
}

// Arrête Apache
function stopApache() {
    if (apacheProcess) {
        apacheProcess.kill();
        apacheProcess = null;
    }
}

// Démarre MariaDB
function startMariaDB() {
    const mariadbPath = path.join(__dirname, '..', 'mariadb', 'bin', 'mysqld.exe');
    mariadbProcess = spawn(mariadbPath, ['--console']);
    mariadbProcess.stdout.on('data', (data) => {
        console.log(`MariaDB: ${data}`);
    });
    mariadbProcess.stderr.on('data', (data) => {
        console.error(`Erreur MariaDB: ${data}`);
    });
}

// Arrête MariaDB
function stopMariaDB() {
    if (mariadbProcess) {
        mariadbProcess.kill();
        mariadbProcess = null;
    }
}

// Écoute les événements IPC
ipcMain.on('start-apache', startApache);
ipcMain.on('stop-apache', stopApache);
ipcMain.on('start-mariadb', startMariaDB);
ipcMain.on('stop-mariadb', stopMariaDB);

// Application prête
app.on('ready', async () => {
    await checkAndDownloadServices();
    createWindow();
});

// Quitter quand toutes les fenêtres sont fermées
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});