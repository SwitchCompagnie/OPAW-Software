const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function configureApacheForPHP() {
    const apacheConfPath = path.join(__dirname, '..', 'apache', 'conf', 'httpd.conf');
    const phpPath = path.join(__dirname, '..', 'php');
    const phpIniPath = path.join(phpPath, 'php.ini');
    const phpIniDevelopmentPath = path.join(phpPath, 'php.ini-development'); 
    const documentRootPath = path.join(__dirname, '..', 'htdocs'); 
    const srvRootPath = path.join(__dirname, '..', 'apache'); 
    const phpMyAdminPath = path.join(__dirname, '..', 'phpmyadmin'); 
    const mariaDbDataPath = path.join(__dirname, '..', 'mariadb', 'data');

    if (!fs.existsSync(apacheConfPath)) {
        throw new Error("Le fichier de configuration d'Apache n'existe pas.");
    }

    let apacheConf = fs.readFileSync(apacheConfPath, 'utf-8');

    apacheConf = apacheConf.replace(/Define SRVROOT ".*?"/, `Define SRVROOT "${srvRootPath}"`);
    apacheConf = apacheConf.replace(/ServerRoot ".*?"/, `ServerRoot "${srvRootPath}"`);
    apacheConf = apacheConf.replace(/DocumentRoot ".*?"/, `DocumentRoot "${documentRootPath}"`);

    const newDirectory = `<Directory "${documentRootPath}">
    AllowOverride All
    Require all granted
</Directory>
`;

    if (!apacheConf.includes(`<Directory "${documentRootPath}">`)) {
        apacheConf += newDirectory;
    }

    apacheConf = apacheConf.replace(/#\s*LoadModule rewrite_module/, 'LoadModule rewrite_module');

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

    apacheConf = apacheConf.replace(/#ServerName www\.example\.com:80/, 'ServerName localhost:80');

    fs.writeFileSync(apacheConfPath, apacheConf, 'utf-8');

    if (!fs.existsSync(phpIniPath)) {
        if (!fs.existsSync(phpIniDevelopmentPath)) {
            throw new Error("Le fichier php.ini-development n'existe pas.");
        }
        fs.copyFileSync(phpIniDevelopmentPath, phpIniPath);
    }

    let phpIni = fs.readFileSync(phpIniPath, 'utf-8');

    if (/;?\s*extension=mysqli/.test(phpIni)) {
        phpIni = phpIni.replace(/;?\s*extension=mysqli/, 'extension=mysqli');
    } else {
        phpIni += `
; Extension mysqli
extension=mysqli
`;
    }

    if (/;?\s*extension=zip/.test(phpIni)) {
        phpIni = phpIni.replace(/;?\s*extension=zip/, 'extension=zip');
    } else {
        phpIni += `
; Extension zip
extension=zip
`;
    }

    fs.writeFileSync(phpIniPath, phpIni, 'utf-8');

    if (!fs.existsSync(mariaDbDataPath)) {
        fs.mkdirSync(mariaDbDataPath, { recursive: true });
        console.log(`Le dossier data a été créé à l'emplacement : ${mariaDbDataPath}`);
    }

    initializeMariaDB(); // Appeler la fonction d'initialisation
}

function initializeMariaDB() {
    const mariaDbBinPath = path.join(__dirname, '..', 'mariadb', 'bin', 'mysqld.exe');
    const dataPath = path.join(__dirname, '..', 'mariadb', 'data');

    const files = fs.readdirSync(dataPath);
    if (files.length === 0) {
        console.log("Initialisation de MariaDB...");
        execSync(`"${mariaDbBinPath}" --initialize-insecure --datadir="${dataPath}"`);
        console.log("MariaDB initialisé avec succès.");
    } else {
        console.log("Le dossier de données est déjà initialisé.");
    }
}

configureApacheForPHP();