const fs = require('fs').promises
const path = require('path')
const { exec, spawn } = require('child_process')
const AdmZip = require('adm-zip')

class BackupManager {
  constructor(baseDir, configManager, logger) {
    this.baseDir = baseDir
    this.config = configManager
    this.logger = logger
    this.backupDir = path.join(baseDir, '..', 'backups')
    this.progressCallbacks = []
  }

  onProgress(callback) {
    this.progressCallbacks.push(callback)
  }

  notifyProgress(message, data = null) {
    this.logger.info(message, data)
    this.progressCallbacks.forEach(cb => cb(message, data))
  }

  async init() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true })
    } catch (error) {
      this.logger.error('Failed to create backup directory', { error: error.message })
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir)
      const backups = []

      for (const file of files) {
        if (file.endsWith('.zip')) {
          const filePath = path.join(this.backupDir, file)
          const stats = await fs.stat(filePath)
          backups.push({
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.mtime,
            type: file.includes('auto') ? 'auto' : 'manual'
          })
        }
      }

      return backups.sort((a, b) => b.created - a.created)
    } catch (error) {
      this.logger.error('Failed to list backups', { error: error.message })
      return []
    }
  }

  async createBackup(name = null, includeAll = false) {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
      const backupName = name || `backup-${timestamp}.zip`
      const backupPath = path.join(this.backupDir, backupName)

      this.notifyProgress('Création de la sauvegarde...', { name: backupName })

      // Create a zip archive
      const zip = new AdmZip()

      // Backup MariaDB data
      const mariadbDataPath = path.join(this.baseDir, 'mariadb', 'data')
      if (await fs.access(mariadbDataPath).then(() => true).catch(() => false)) {
        this.notifyProgress('Sauvegarde des données MariaDB...')
        await this.addDirectoryToZip(zip, mariadbDataPath, 'mariadb/data')
      }

      // Backup htdocs (user projects)
      const htdocsPath = path.join(this.baseDir, '..', 'htdocs')
      if (await fs.access(htdocsPath).then(() => true).catch(() => false)) {
        this.notifyProgress('Sauvegarde des projets web...')
        await this.addDirectoryToZip(zip, htdocsPath, 'htdocs')
      }

      // Backup configuration
      const configPath = this.config.configPath
      if (await fs.access(configPath).then(() => true).catch(() => false)) {
        this.notifyProgress('Sauvegarde de la configuration...')
        zip.addLocalFile(configPath, '', 'config.json')
      }

      // Optionally backup Apache/PHP configs
      if (includeAll) {
        this.notifyProgress('Sauvegarde des configurations Apache/PHP...')

        const apacheConf = path.join(this.baseDir, 'apache', 'conf', 'httpd.conf')
        if (await fs.access(apacheConf).then(() => true).catch(() => false)) {
          zip.addLocalFile(apacheConf, 'apache/conf/', 'httpd.conf')
        }

        const phpIni = path.join(this.baseDir, 'php', 'php.ini')
        if (await fs.access(phpIni).then(() => true).catch(() => false)) {
          zip.addLocalFile(phpIni, 'php/', 'php.ini')
        }

        const mariadbConf = path.join(this.baseDir, 'mariadb', 'my.ini')
        if (await fs.access(mariadbConf).then(() => true).catch(() => false)) {
          zip.addLocalFile(mariadbConf, 'mariadb/', 'my.ini')
        }
      }

      // Write the backup
      this.notifyProgress('Finalisation de la sauvegarde...')
      zip.writeZip(backupPath)

      const stats = await fs.stat(backupPath)

      this.notifyProgress('Sauvegarde créée avec succès', {
        name: backupName,
        size: stats.size,
        path: backupPath
      })

      // Cleanup old backups
      await this.cleanupOldBackups()

      return {
        name: backupName,
        path: backupPath,
        size: stats.size,
        created: new Date()
      }
    } catch (error) {
      this.logger.error('Failed to create backup', { error: error.message })
      throw error
    }
  }

  async addDirectoryToZip(zip, dirPath, zipPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        const zipEntryPath = path.join(zipPath, entry.name)

        if (entry.isDirectory()) {
          await this.addDirectoryToZip(zip, fullPath, zipEntryPath)
        } else {
          zip.addLocalFile(fullPath, path.dirname(zipEntryPath))
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to add directory ${dirPath} to backup`, {
        error: error.message
      })
    }
  }

  async restoreBackup(backupPath) {
    try {
      this.notifyProgress('Restauration de la sauvegarde...', { path: backupPath })

      if (!(await fs.access(backupPath).then(() => true).catch(() => false))) {
        throw new Error('Backup file not found')
      }

      const zip = new AdmZip(backupPath)

      // Extract MariaDB data
      const mariadbDataPath = path.join(this.baseDir, 'mariadb', 'data')
      if (await fs.access(mariadbDataPath).then(() => true).catch(() => false)) {
        this.notifyProgress('Nettoyage des anciennes données MariaDB...')
        await fs.rm(mariadbDataPath, { recursive: true, force: true })
      }

      // Extract htdocs
      const htdocsPath = path.join(this.baseDir, '..', 'htdocs')

      this.notifyProgress('Extraction de la sauvegarde...')
      zip.extractAllTo(this.baseDir, true)

      this.notifyProgress('Sauvegarde restaurée avec succès')

      return true
    } catch (error) {
      this.logger.error('Failed to restore backup', { error: error.message })
      throw error
    }
  }

  async deleteBackup(backupPath) {
    try {
      await fs.unlink(backupPath)
      this.logger.info('Backup deleted', { path: backupPath })
      return true
    } catch (error) {
      this.logger.error('Failed to delete backup', { error: error.message })
      throw error
    }
  }

  async cleanupOldBackups() {
    try {
      const maxBackups = this.config.get('backup.maxBackups')
      const backups = await this.listBackups()

      if (backups.length > maxBackups) {
        const toDelete = backups.slice(maxBackups)

        for (const backup of toDelete) {
          await this.deleteBackup(backup.path)
          this.logger.info('Old backup deleted', { name: backup.name })
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old backups', { error: error.message })
    }
  }

  async exportDatabase(databaseName, outputPath = null) {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
      const fileName = outputPath || path.join(
        this.backupDir,
        `db-${databaseName}-${timestamp}.sql`
      )

      this.notifyProgress('Export de la base de données...', { database: databaseName })

      const mysqldumpPath = path.join(this.baseDir, 'mariadb', 'bin', 'mysqldump.exe')
      const password = this.config.get('mariadb.password')

      await new Promise((resolve, reject) => {
        const proc = spawn(
          mysqldumpPath,
          [
            '-u', 'root',
            `-p${password}`,
            '--result-file=' + fileName,
            databaseName
          ],
          { windowsHide: true }
        )

        proc.on('error', reject)
        proc.on('exit', (code) => {
          if (code === 0) resolve()
          else reject(new Error(`mysqldump exited with code ${code}`))
        })
      })

      this.notifyProgress('Export terminé', { file: fileName })

      return fileName
    } catch (error) {
      this.logger.error('Failed to export database', { error: error.message })
      throw error
    }
  }

  async importDatabase(databaseName, sqlFilePath) {
    try {
      this.notifyProgress('Import de la base de données...', {
        database: databaseName,
        file: sqlFilePath
      })

      const mysqlPath = path.join(this.baseDir, 'mariadb', 'bin', 'mysql.exe')
      const password = this.config.get('mariadb.password')

      await new Promise((resolve, reject) => {
        const sqlContent = require('fs').readFileSync(sqlFilePath, 'utf8')
        const proc = spawn(
          mysqlPath,
          [
            '-u', 'root',
            `-p${password}`,
            databaseName
          ],
          { windowsHide: true }
        )

        proc.stdin.write(sqlContent)
        proc.stdin.end()

        proc.on('error', reject)
        proc.on('exit', (code) => {
          if (code === 0) resolve()
          else reject(new Error(`mysql exited with code ${code}`))
        })
      })

      this.notifyProgress('Import terminé')

      return true
    } catch (error) {
      this.logger.error('Failed to import database', { error: error.message })
      throw error
    }
  }
}

module.exports = BackupManager
