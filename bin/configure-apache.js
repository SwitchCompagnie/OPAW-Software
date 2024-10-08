const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function configureApacheForPHP() {
    const basePath = path.join(__dirname, '..');
    const apacheConfPath = path.join(basePath, 'apache', 'conf', 'httpd.conf');
    const phpPath = path.join(basePath, 'php');
    const phpIniPath = path.join(phpPath, 'php.ini');
    const phpIniDevelopmentPath = path.join(phpPath, 'php.ini-development');
    const documentRootPath = path.join(basePath, 'htdocs');
    const srvRootPath = path.join(basePath, 'apache');
    const phpMyAdminPath = path.join(basePath, 'phpmyadmin');
    const mariaDbDataPath = path.join(basePath, 'mariadb', 'data');
    const configSamplePath = path.join(phpMyAdminPath, 'config.sample.inc.php');
    const configPath = path.join(phpMyAdminPath, 'config.inc.php');

    if (!fs.existsSync(apacheConfPath)) {
        throw new Error("Le fichier de configuration d'Apache n'existe pas.");
    }

    let apacheConf = fs.readFileSync(apacheConfPath, 'utf-8');

    apacheConf = apacheConf
        .replace(/Define SRVROOT ".*?"/, `Define SRVROOT "${srvRootPath}"`)
        .replace(/ServerRoot ".*?"/, `ServerRoot "${srvRootPath}"`)
        .replace(/DocumentRoot ".*?"/, `DocumentRoot "${documentRootPath}"`)
        .replace(/#\s*LoadModule rewrite_module/, 'LoadModule rewrite_module')
        .replace(/#ServerName www\.example\.com:80/, 'ServerName localhost:80');

    const newDirectoryConfig = `
<Directory "${documentRootPath}">
    AllowOverride All
    Require all granted
</Directory>
`;

    if (!apacheConf.includes(`<Directory "${documentRootPath}">`)) {
        apacheConf += newDirectoryConfig;
    }

    if (!apacheConf.includes('LoadModule php_module')) {
        const phpConfig = `
LoadModule php_module "${phpPath}/php8apache2_4.dll"
AddHandler application/x-httpd-php .php
PHPIniDir "${phpPath}"
DirectoryIndex index.php index.html
`;
        apacheConf += phpConfig;
    }

    const phpMyAdminConfig = `
Alias /phpmyadmin "${phpMyAdminPath}"
<Directory "${phpMyAdminPath}">
    Options Indexes FollowSymLinks MultiViews
    AllowOverride All
    Require all granted
</Directory>
`;

    if (!apacheConf.includes('Alias /phpmyadmin')) {
        apacheConf += phpMyAdminConfig;
    }

    fs.writeFileSync(apacheConfPath, apacheConf, 'utf-8');

    if (!fs.existsSync(phpIniPath) && fs.existsSync(phpIniDevelopmentPath)) {
        fs.copyFileSync(phpIniDevelopmentPath, phpIniPath);
    }

    let phpIni = fs.readFileSync(phpIniPath, 'utf-8');

    const phpExtensions = ['mysqli', 'zip'];
    let occurrenceCounter = 0;

    phpExtensions.forEach(ext => {
        const extPattern = new RegExp(`;?\\s*extension=${ext}`, 'gi');
        phpIni = phpIni.replace(extPattern, (match) => {
            occurrenceCounter++;
        return occurrenceCounter === 2 ? `extension=${ext}` : match;
        });
    });

    occurrenceCounter = 0; 
    const extensionDirPattern = /\s*extension_dir\s*=\s*"(.*?)"/g;

    phpIni = phpIni.replace(extensionDirPattern, (match) => {
        occurrenceCounter++;
        return occurrenceCounter === 2 ? `extension_dir = "ext"` : match;
    });

    if (!/extension_dir\s*=\s*"ext"/.test(phpIni)) {
        phpIni += `\n; On windows:\nextension_dir = "ext"`;
    }

    fs.writeFileSync(phpIniPath, phpIni, 'utf-8');

    if (!fs.existsSync(mariaDbDataPath)) {
        fs.mkdirSync(mariaDbDataPath, { recursive: true });
        console.log(`Le dossier data a été créé à l'emplacement : ${mariaDbDataPath}`);
    }

    initializeMariaDB();

    copyPhpMyAdminConfig(configSamplePath, configPath);
}

function initializeMariaDB() {
    const mariaDbBinPath = path.join(__dirname, '..', 'mariadb', 'bin', 'mysqld.exe');
    const dataPath = path.join(__dirname, '..', 'mariadb', 'data');

    const files = fs.readdirSync(dataPath);
    if (files.length === 0) {
        console.log("Initialisation de MariaDB...");
        console.log("MariaDB initialisé avec succès.");
    } else {
        console.log("Le dossier de données est déjà initialisé.");
    }
}

function copyPhpMyAdminConfig(configSamplePath, configPath) {
    if (fs.existsSync(configSamplePath) && !fs.existsSync(configPath)) {
        fs.copyFileSync(configSamplePath, configPath);
        console.log(`Fichier ${configSamplePath} copié vers ${configPath}`);
    } else if (fs.existsSync(configPath)) {
        console.log(`Le fichier ${configPath} existe déjà.`);
    } else {
        console.log(`Le fichier ${configSamplePath} est introuvable.`);
    }
}

configureApacheForPHP();