const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');

const baseDir = path.join(__dirname, '..');

// Fonction pour télécharger un fichier
async function downloadFile(url, dest) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
    });

    if (response.status !== 200) {
        throw new Error(`Erreur de téléchargement, code de statut: ${response.status}`);
    }

    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// Fonction pour extraire un fichier ZIP
function extractZip(source, target) {
    const zip = new AdmZip(source);
    zip.extractAllTo(target, true);
}

// Fonction pour déplacer le contenu d'un répertoire
function moveContent(sourceDir, targetDir) {
    if (fs.existsSync(sourceDir)) {
        const items = fs.readdirSync(sourceDir);

        items.forEach(item => {
            const srcPath = path.join(sourceDir, item);
            const destPath = path.join(targetDir, item);
            fs.renameSync(srcPath, destPath);
        });

        fs.rmSync(sourceDir, { recursive: true, force: true });
    } else {
        console.error(`Le répertoire ${sourceDir} n'existe pas.`);
    }
}

// Fonction pour configurer Apache avec PHP
function configureApache() {
    const configureApacheScript = path.join(__dirname, 'configure-apache.js');
    exec(`node ${configureApacheScript}`, (error, stdout) => {
        if (error) {
            console.error(`Erreur lors de la configuration d'Apache: ${error}`);
        }
    });
}

// Télécharger Apache, PHP, MariaDB et phpMyAdmin
async function downloadServices() {
    const apacheUrl = 'https://www.apachelounge.com/download/VS17/binaries/httpd-2.4.62-240904-win64-VS17.zip';
    const phpUrl = 'https://windows.php.net/downloads/releases/php-8.2.24-Win32-vs16-x64.zip';
    const mariadbUrl = 'https://archive.mariadb.org/mariadb-11.5.2/winx64-packages/mariadb-11.5.2-winx64.zip';
    const phpmyadminUrl = 'https://www.phpmyadmin.net/downloads/phpMyAdmin-latest-all-languages.zip';

    try {
        await downloadFile(apacheUrl, path.join(baseDir, 'apache.zip'));
        await extractZip(path.join(baseDir, 'apache.zip'), path.join(baseDir, 'apache'));
        fs.unlinkSync(path.join(baseDir, 'apache.zip'));

        const apacheDir = path.join(baseDir, 'apache', 'Apache24');
        moveContent(apacheDir, path.join(baseDir, 'apache'));

        await downloadFile(phpUrl, path.join(baseDir, 'php.zip'));
        await extractZip(path.join(baseDir, 'php.zip'), path.join(baseDir, 'php'));
        fs.unlinkSync(path.join(baseDir, 'php.zip'));

        await downloadFile(mariadbUrl, path.join(baseDir, 'mariadb.zip'));
        await extractZip(path.join(baseDir, 'mariadb.zip'), path.join(baseDir, 'mariadb'));
        fs.unlinkSync(path.join(baseDir, 'mariadb.zip'));

        const mariadbSourceDir = fs.readdirSync(path.join(baseDir, 'mariadb'))
            .map(dir => path.join(baseDir, 'mariadb', dir))
            .find(dir => fs.statSync(dir).isDirectory() && /mariadb-\d+\.\d+\.\d+-winx64/.test(path.basename(dir)));
        moveContent(mariadbSourceDir, path.join(baseDir, 'mariadb'));

        await downloadFile(phpmyadminUrl, path.join(baseDir, 'phpmyadmin.zip'));
        await extractZip(path.join(baseDir, 'phpmyadmin.zip'), path.join(baseDir, 'phpmyadmin'));
        fs.unlinkSync(path.join(baseDir, 'phpmyadmin.zip'));

        const phpmyadminDir = path.join(baseDir, 'phpmyadmin');
        const phpmyadminSourceDir = fs.readdirSync(phpmyadminDir)
            .map(dir => path.join(phpmyadminDir, dir))
            .find(dir => fs.statSync(dir).isDirectory() && /phpMyAdmin-.+/.test(path.basename(dir)));
        moveContent(phpmyadminSourceDir, phpmyadminDir);

        configureApache();

        console.log('Tous les services ont ete telecharges et configures.');
    } catch (error) {
        console.error('Erreur lors du téléchargement des services:', error);
    }
}

module.exports = { downloadServices };