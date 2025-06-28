const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { exec } = require('child_process');

const baseDir = path.join(__dirname, '..');
let progress = 0;
const services = [
  { name: 'apache', url: 'https://www.apachelounge.com/download/VS17/binaries/httpd-2.4.63-250207-win64-VS17.zip', zipName: 'apache.zip', nestedDirPattern: /Apache24/ },
  { name: 'php', url: 'https://windows.php.net/downloads/releases/php-8.4.8-Win32-vs17-x64.zip', zipName: 'php.zip' },
  { name: 'mariadb', url: 'https://archive.mariadb.org/mariadb-12.1.0/winx64-packages/mariadb-12.1.0-winx64.zip', zipName: 'mariadb.zip', nestedDirPattern: /mariadb-\d+\.\d+\.\d+-winx64/ },
  { name: 'phpmyadmin', url: 'https://www.phpmyadmin.net/downloads/phpMyAdmin-latest-all-languages.zip', zipName: 'phpmyadmin.zip', nestedDirPattern: /phpMyAdmin-.+/ }
];
const tasksPerService = 3;
const configSteps = 1;
const totalSteps = services.length * tasksPerService + configSteps;

const sendProgress = (win, message) => {
  progress = Math.min(progress + 100 / totalSteps, 100);
  const formattedMessage = message.normalize('NFC');
  if (win) win.webContents.send('install-progress', progress, formattedMessage);
};

const sendError = (win, error) => {
  const formattedError = error.message.normalize('NFC');
  if (win) win.webContents.send('install-error', formattedError);
  throw error;
};

const downloadFile = async (win, url, dest) => {
  sendProgress(win, `Téléchargement de ${path.basename(url)}...`);
  const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 60000 });
  if (response.status !== 200) throw new Error(`HTTP error: ${response.status}`);
  const writer = fs.createWriteStream(dest);
  response.data.pipe(writer);
  await new Promise((resolve, reject) => {
    writer.on('finish', () => {
      sendProgress(win, `Téléchargement de ${path.basename(url)} terminé`);
      resolve();
    });
    writer.on('error', reject);
  });
};

const extractZip = (win, source, target) => {
  sendProgress(win, `Extraction de ${path.basename(source)}...`);
  const zip = new AdmZip(source);
  zip.extractAllTo(target, true);
  sendProgress(win, `Extraction de ${path.basename(source)} terminée`);
};

const moveContent = async (win, sourceDir, targetDir) => {
  if (!(await fsPromises.access(sourceDir).then(() => true).catch(() => false))) {
    sendProgress(win, `Répertoire source introuvable : ${sourceDir}, saut du déplacement`);
    return;
  }
  const stat = await fsPromises.stat(sourceDir);
  if (!stat.isDirectory()) {
    sendProgress(win, `Chemin ${sourceDir} n'est pas un répertoire, saut du déplacement`);
    return;
  }
  sendProgress(win, `Organisation des fichiers dans ${path.basename(targetDir)}...`);
  for (const item of await fsPromises.readdir(sourceDir)) {
    await fsPromises.rename(path.join(sourceDir, item), path.join(targetDir, item));
  }
  await fsPromises.rm(sourceDir, { recursive: true, force: true });
  sendProgress(win, `Organisation des fichiers dans ${path.basename(targetDir)} terminée`);
};

const configureAllServices = (win) => new Promise((resolve, reject) => {
  sendProgress(win, 'Démarrage de la configuration des services...');
  exec(`node "${path.join(__dirname, 'configure-services.js')}"`, (error) => {
    if (error) {
      sendError(win, error);
      reject(error);
    } else {
      sendProgress(win, 'Configuration des services terminée');
      resolve();
    }
  });
});

const installService = async (win, { name, url, zipName, nestedDirPattern }) => {
  const zipPath = path.join(baseDir, zipName);
  const extractPath = path.join(baseDir, name);
  await downloadFile(win, url, zipPath);
  extractZip(win, zipPath, extractPath);
  await fsPromises.unlink(zipPath);
  if (nestedDirPattern) {
    const items = await fsPromises.readdir(extractPath);
    let nestedDir = null;
    for (const item of items) {
      const fullPath = path.join(extractPath, item);
      try {
        const stat = await fsPromises.stat(fullPath);
        if (stat.isDirectory() && nestedDirPattern.test(item)) {
          nestedDir = fullPath;
          break;
        }
      } catch (e) {
        sendProgress(win, `Erreur lors de la vérification de ${fullPath}: ${e.message}`);
        continue;
      }
    }
    if (nestedDir) {
      sendProgress(win, `Répertoire imbriqué trouvé : ${nestedDir}`);
      await moveContent(win, nestedDir, extractPath);
    } else {
      sendProgress(win, `Aucun répertoire correspondant à ${nestedDirPattern} trouvé dans ${extractPath}, saut du déplacement`);
      sendProgress(win, `Contenu de ${extractPath}: ${items.join(', ')}`);
    }
  }
};

const downloadServices = async (win) => {
  try {
    progress = 0;
    for (const service of services) {
      await installService(win, service);
    }
    await configureAllServices(win);
    if (progress < 100) {
      progress = 100;
      sendProgress(win, 'Installation terminée avec succès.');
    }
  } catch (error) {
    sendError(win, error);
  }
};

module.exports = { downloadServices };