const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const downloadServices = require('../bin/download-services').downloadServices;

let mainWindow;
let installWindow;

function createWindow(file, onCloseCallback) {
    let win = new BrowserWindow({
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

    win.loadFile(file);

    win.on('closed', function () {
        if (onCloseCallback) onCloseCallback();
        win = null;
    });

    return win;
}

function areServicesDownloaded() {
    const baseDir = path.join(__dirname, '..');
    return fs.existsSync(path.join(baseDir, 'apache')) &&
           fs.existsSync(path.join(baseDir, 'php')) &&
           fs.existsSync(path.join(baseDir, 'mariadb')) &&
           fs.existsSync(path.join(baseDir, 'phpmyadmin'));
}

async function checkAndDownloadServices() {
    if (!areServicesDownloaded()) {
        await downloadServices();
    }
}

app.on('ready', async () => {
    installWindow = createWindow('src/install.html');

    await checkAndDownloadServices();

    if (installWindow) {
        installWindow.close();
    }

    mainWindow = createWindow('src/index.html');
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        mainWindow = createWindow('src/index.html');
    }
});

app.on('before-quit', (event) => {
    console.log('Fermeture de l\'application. Arrêt des services...');
    stopApache();
    stopMariaDB();
});

function stopApache() {
    const apachePath = path.join(__dirname, '..', 'apache', 'bin', 'httpd.exe');
    exec(`taskkill /F /IM httpd.exe`, { encoding: 'utf8' }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur lors de l'arrêt d'Apache: ${error.message}`);
            return;
        }
        console.log(`Apache arrêté: ${stdout}`);
    });
}

function stopMariaDB() {
    const mariadbPath = path.join(__dirname, '..', 'mariadb', 'bin', 'mysqladmin.exe');
    exec(`"${mariadbPath}" -u root -p shutdown`, { encoding: 'utf8' }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur lors de l'arrêt de MariaDB: ${error.message}`);
            return;
        }
        console.log(`MariaDB arrêté: ${stdout}`);
    });
}

ipcMain.on('start-apache', (event) => {
    console.log('Démarrage d\'Apache...');
    const apachePath = path.join(__dirname, '..', 'apache', 'bin', 'httpd.exe');

    exec(`"${apachePath}"`, { encoding: 'utf8' }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur lors du démarrage d'Apache: ${error.message}`);
            event.reply('service-status', 'apache', 'error', `Erreur lors du démarrage d'Apache: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Erreur d'Apache: ${stderr}`);
            event.reply('service-status', 'apache', 'error', `Erreur d'Apache: ${stderr}`);
            return;
        }
        console.log(`Apache démarré: ${stdout}`);
        event.reply('service-status', 'apache', 'running');
    });
});

ipcMain.on('stop-apache', (event) => {
    console.log('Arrêt d\'Apache...');
    stopApache();
    event.reply('service-status', 'apache', 'stopped');
});

ipcMain.on('start-mariadb', (event) => {
    console.log('Démarrage de MariaDB...');
    const mariadbPath = path.join(__dirname, '..', 'mariadb', 'bin', 'mysqld.exe');

    exec(`"${mariadbPath}"`, { encoding: 'utf8' }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur lors du démarrage de MariaDB: ${error.message}`);
            event.reply('service-status', 'mariadb', 'error', `Erreur lors du démarrage de MariaDB: ${error.message}`);
            return;
        }
        console.log(`MariaDB démarré: ${stdout}`);
        event.reply('service-status', 'mariadb', 'running');
    });
});

ipcMain.on('stop-mariadb', (event) => {
    console.log('Arrêt de MariaDB...');
    stopMariaDB();
    event.reply('service-status', 'mariadb', 'stopped');
});