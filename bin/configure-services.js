const fs = require('fs').promises;
const path = require('path');
const { spawn, execSync } = require('child_process');

const baseDir = path.join(__dirname, '..');

const grantPermissions = (targetPath) => {
  const user = process.env.USERNAME;
  if (!user) throw new Error('Impossible de détecter le nom d’utilisateur Windows.');
  execSync(`icacls "${targetPath}" /grant "${user}":(OI)(CI)F /T`, { stdio: 'inherit' });
  execSync(`icacls "${targetPath}" /grant SYSTEM:(OI)(CI)F /T`, { stdio: 'inherit' });
};

const setupMariaDB = async () => {
  const bin = path.join(baseDir, 'mariadb', 'bin');
  const mysqld = path.join(bin, 'mysqld.exe');
  const mysql = path.join(bin, 'mysql.exe');
  const install = path.join(bin, 'mysql_install_db.exe');
  const data = path.join(baseDir, 'mariadb', 'data');

  if (await fs.access(data).then(() => true).catch(() => false)) {
    await fs.rm(data, { recursive: true, force: true });
  }
  await fs.mkdir(data, { recursive: true });
  grantPermissions(data);

  execSync(`"${install}" --datadir="${data}"`, { stdio: 'inherit' });

  const server = spawn(mysqld, ['--console', `--datadir=${data}`, '--skip-grant-tables'], { stdio: 'pipe', detached: true });
  server.unref();
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    execSync(`"${mysql}" -u root -e "FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY '225874120022587412';"`, { stdio: 'inherit' });
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
};

const configureApacheAndPHP = async () => {
  const apacheConf = path.join(baseDir, 'apache', 'conf', 'httpd.conf');
  const phpPath = path.join(baseDir, 'php');
  const htdocs = path.join(baseDir, 'htdocs');
  const srvRoot = path.join(baseDir, 'apache');
  const phpMyAdmin = path.join(baseDir, 'phpmyadmin');
  const sessionPath = path.join(baseDir, 'tmp');
  const phpIni = path.join(phpPath, 'php.ini');
  const phpIniDev = path.join(phpPath, 'php.ini-development');

  let conf = (await fs.readFile(apacheConf, 'utf-8'))
    .replace(/Define SRVROOT ".*?"/, `Define SRVROOT "${srvRoot.replace(/\\/g, '/')}"`)
    .replace(/ServerRoot ".*?"/, `ServerRoot "${srvRoot.replace(/\\/g, '/')}"`)
    .replace(/DocumentRoot ".*?"/, `DocumentRoot "${htdocs.replace(/\\/g, '/')}"`)
    .replace(/#?\s*LoadModule rewrite_module/, 'LoadModule rewrite_module')
    .replace(/#ServerName www\.example\.com:80/, 'ServerName localhost:80')
    .replace(/<Directory\s+".*?htdocs.*?">[\s\S]*?<\/Directory>/gi, '');

  conf += `
<Directory "${htdocs.replace(/\\/g, '/')}">
    Options Indexes FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>
Alias /phpmyadmin "${phpMyAdmin.replace(/\\/g, '/')}"

<Directory "${phpMyAdmin.replace(/\\/g, '/')}">
    Options Indexes FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>

LoadModule php_module "${phpPath.replace(/\\/g, '/')}/php8apache2_4.dll"
AddHandler application/x-httpd-php .php
PHPIniDir "${phpPath.replace(/\\/g, '/')}"
DirectoryIndex index.php index.html
`;

  await fs.writeFile(apacheConf, conf, 'utf-8');

  if (!(await fs.access(phpIni).then(() => true).catch(() => false)) && await fs.access(phpIniDev).then(() => true).catch(() => false)) {
    await fs.copyFile(phpIniDev, phpIni);
  }
  if (await fs.access(phpIni).then(() => true).catch(() => false)) {
    let ini = await fs.readFile(phpIni, 'utf-8');
    ['zip', 'mbstring', 'curl', 'gd', 'openssl', 'mysqli'].forEach(ext =>
      ini = ini.replace(new RegExp(`;?\\s*extension=${ext}`, 'gi'), `extension=${ext}`)
    );
    ini = ini
      .replace(/;?extension_dir\s*=\s*"ext"/gi, `extension_dir = "ext"`)
      .replace(/upload_max_filesize\s*=.*$/gm, 'upload_max_filesize = 128M')
      .replace(/post_max_size\s*=.*$/gm, 'post_max_size = 128M')
      .replace(/memory_limit\s*=.*$/gm, 'memory_limit = 256M')
      .replace(/error_reporting\s*=.*$/gm, 'error_reporting = E_ALL & ~E_DEPRECATED')
      .replace(/output_buffering\s*=.*$/gm, 'output_buffering = On')
      .replace(/session\.save_path\s*=.*$/gm, `session.save_path = "${sessionPath.replace(/\\/g, '/')}"`);
    await fs.writeFile(phpIni, ini, 'utf-8');
  }

  if (!(await fs.access(sessionPath).then(() => true).catch(() => false))) {
    await fs.mkdir(sessionPath, { recursive: true });
    grantPermissions(sessionPath);
  }
};

const configurePhpMyAdmin = async () => {
  const pmaPath = path.join(baseDir, 'phpmyadmin');
  const sample = path.join(pmaPath, 'config.sample.inc.php');
  const config = path.join(pmaPath, 'config.inc.php');

  if (await fs.access(sample).then(() => true).catch(() => false) && !(await fs.access(config).then(() => true).catch(() => false))) {
    const content = (await fs.readFile(sample, 'utf-8'))
      .replace(/\$cfg\['blowfish_secret'\] = '';/, `$cfg['blowfish_secret'] = '${require('crypto').randomBytes(32).toString('hex')}';`)
      .replace(/\$cfg\['Servers'\]\[\$i\]\['host'\] = 'localhost';/, `$cfg['Servers'][$i]['host'] = 'localhost';\n$cfg['Servers'][$i]['user'] = 'root';`);
    await fs.writeFile(config, content, 'utf-8');
  }
};

const main = async () => {
  await configureApacheAndPHP();
  await setupMariaDB();
  await configurePhpMyAdmin();
};

main().catch(err => console.error(`Critical error: ${err.message}`));