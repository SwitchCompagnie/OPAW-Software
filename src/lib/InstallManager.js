const fs = require('fs').promises
const path = require('path')
const axios = require('axios')
const AdmZip = require('adm-zip')
const crypto = require('crypto')

class InstallManager {
  constructor(baseDir, configManager, logger) {
    this.baseDir = baseDir
    this.config = configManager
    this.logger = logger
    this.progressCallbacks = []
    this.errorCallbacks = []
    this.services = [
      {
        name: 'apache',
        url: 'https://www.apachelounge.com/download/VS17/binaries/httpd-2.4.65-250724-Win64-VS17.zip',
        zipName: 'apache.zip',
        nestedDirPattern: /Apache24/,
        checksum: null // Could add SHA256 checksums for verification
      },
      {
        name: 'php',
        url: 'https://downloads.php.net/~windows/releases/php-8.4.12-Win32-vs17-x64.zip',
        zipName: 'php.zip',
        checksum: null
      },
      {
        name: 'mariadb',
        url: 'https://archive.mariadb.org/mariadb-12.1.1/winx64-packages/mariadb-12.1.1-winx64.zip',
        zipName: 'mariadb.zip',
        nestedDirPattern: /mariadb-.*-winx64/,
        checksum: null
      },
      {
        name: 'phpmyadmin',
        url: 'https://www.phpmyadmin.net/downloads/phpMyAdmin-latest-all-languages.zip',
        zipName: 'phpmyadmin.zip',
        nestedDirPattern: /phpMyAdmin-.*/,
        checksum: null
      }
    ]
    this.retryAttempts = 3
    this.retryDelay = 2000
  }

  onProgress(callback) {
    this.progressCallbacks.push(callback)
  }

  onError(callback) {
    this.errorCallbacks.push(callback)
  }

  notifyProgress(percentage, message) {
    this.logger.info(`Installation progress: ${percentage}% - ${message}`)
    this.progressCallbacks.forEach(cb => cb(percentage, message))
  }

  notifyError(error) {
    this.logger.error('Installation error', { error: error.message })
    this.errorCallbacks.forEach(cb => cb(error))
  }

  async downloadWithRetry(url, dest, serviceName, attempt = 1) {
    try {
      await this.downloadFile(url, dest, serviceName)
    } catch (error) {
      if (attempt < this.retryAttempts) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1)
        this.notifyProgress(
          0,
          `Échec du téléchargement de ${serviceName}, nouvelle tentative ${attempt + 1}/${this.retryAttempts} dans ${delay / 1000}s...`
        )
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.downloadWithRetry(url, dest, serviceName, attempt + 1)
      }
      throw error
    }
  }

  async downloadFile(url, dest, serviceName) {
    this.notifyProgress(0, `Téléchargement de ${serviceName}...`)

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 120000, // 2 minutes timeout
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          this.notifyProgress(percentage, `Téléchargement de ${serviceName}: ${percentage}%`)
        }
      }
    })

    if (response.status !== 200) {
      throw new Error(`HTTP error: ${response.status}`)
    }

    const writer = require('fs').createWriteStream(dest)
    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        this.notifyProgress(100, `Téléchargement de ${serviceName} terminé`)
        resolve()
      })
      writer.on('error', reject)
    })
  }

  async verifyChecksum(filePath, expectedChecksum) {
    if (!expectedChecksum) return true

    const hash = crypto.createHash('sha256')
    const stream = require('fs').createReadStream(filePath)

    return new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data))
      stream.on('end', () => {
        const checksum = hash.digest('hex')
        resolve(checksum === expectedChecksum)
      })
      stream.on('error', reject)
    })
  }

  async extractZip(source, target, serviceName) {
    this.notifyProgress(0, `Extraction de ${serviceName}...`)

    try {
      const zip = new AdmZip(source)
      zip.extractAllTo(target, true)
      this.notifyProgress(100, `Extraction de ${serviceName} terminée`)
    } catch (error) {
      throw new Error(`Failed to extract ${serviceName}: ${error.message}`)
    }
  }

  async moveContent(sourceDir, targetDir, serviceName) {
    if (!(await fs.access(sourceDir).then(() => true).catch(() => false))) {
      this.notifyProgress(0, `Répertoire source introuvable pour ${serviceName}`)
      return
    }

    const stat = await fs.stat(sourceDir)
    if (!stat.isDirectory()) {
      this.notifyProgress(0, `Chemin invalide pour ${serviceName}`)
      return
    }

    this.notifyProgress(0, `Organisation des fichiers de ${serviceName}...`)

    const items = await fs.readdir(sourceDir)
    for (const item of items) {
      const srcPath = path.join(sourceDir, item)
      const destPath = path.join(targetDir, item)

      try {
        await fs.rename(srcPath, destPath)
      } catch (error) {
        this.logger.warn(`Failed to move ${item}`, { error: error.message })
      }
    }

    await fs.rm(sourceDir, { recursive: true, force: true })
    this.notifyProgress(100, `Organisation des fichiers de ${serviceName} terminée`)
  }

  async installService(service, totalServices, currentIndex) {
    const { name, url, zipName, nestedDirPattern, checksum } = service
    const zipPath = path.join(this.baseDir, '..', zipName)
    const extractPath = path.join(this.baseDir, name)

    const baseProgress = (currentIndex / totalServices) * 100
    const serviceProgress = 100 / totalServices

    try {
      // Check if already exists
      if (await fs.access(extractPath).then(() => true).catch(() => false)) {
        this.notifyProgress(
          baseProgress + serviceProgress,
          `${name} déjà installé, passage au suivant...`
        )
        return
      }

      // Download
      await this.downloadWithRetry(url, zipPath, name)

      // Verify checksum if provided
      if (checksum) {
        this.notifyProgress(baseProgress + serviceProgress * 0.6, `Vérification de ${name}...`)
        const valid = await this.verifyChecksum(zipPath, checksum)
        if (!valid) {
          throw new Error(`Checksum verification failed for ${name}`)
        }
      }

      // Extract
      await this.extractZip(zipPath, extractPath, name)

      // Cleanup zip
      await fs.unlink(zipPath).catch(() => {})

      // Handle nested directories
      if (nestedDirPattern) {
        const items = await fs.readdir(extractPath)
        let nestedDir = null

        for (const item of items) {
          const fullPath = path.join(extractPath, item)
          try {
            const stat = await fs.stat(fullPath)
            if (stat.isDirectory() && nestedDirPattern.test(item)) {
              nestedDir = fullPath
              break
            }
          } catch (error) {
            this.logger.warn(`Failed to check ${fullPath}`, { error: error.message })
          }
        }

        if (nestedDir) {
          await this.moveContent(nestedDir, extractPath, name)
        }
      }

      this.notifyProgress(baseProgress + serviceProgress, `Installation de ${name} terminée`)
    } catch (error) {
      this.notifyError(new Error(`Failed to install ${name}: ${error.message}`))
      throw error
    }
  }

  async configureServices() {
    this.notifyProgress(95, 'Configuration des services...')

    try {
      const { spawn } = require('child_process')
      const configScript = path.join(__dirname, '../../bin/configure-services.js')

      await new Promise((resolve, reject) => {
        const proc = spawn(process.execPath, [configScript], {
          stdio: 'pipe',
          windowsHide: true
        })

        proc.stdout.on('data', (data) => {
          this.notifyProgress(95, data.toString().trim())
        })

        proc.stderr.on('data', (data) => {
          this.logger.error('Configuration error', { error: data.toString().trim() })
        })

        proc.on('error', reject)
        proc.on('exit', (code) => {
          if (code === 0) resolve()
          else reject(new Error(`Configuration failed with code ${code}`))
        })
      })

      this.notifyProgress(100, 'Configuration terminée')
    } catch (error) {
      this.notifyError(new Error(`Configuration failed: ${error.message}`))
      throw error
    }
  }

  async install() {
    try {
      this.notifyProgress(0, 'Démarrage de l\'installation...')

      const totalServices = this.services.length

      for (let i = 0; i < totalServices; i++) {
        await this.installService(this.services[i], totalServices, i)
      }

      await this.configureServices()

      this.notifyProgress(100, 'Installation terminée avec succès!')
    } catch (error) {
      this.notifyError(error)
      throw error
    }
  }

  async areServicesInstalled() {
    const paths = this.services.map(s => path.join(this.baseDir, s.name))
    const results = await Promise.all(
      paths.map(p => fs.access(p).then(() => true).catch(() => false))
    )
    return results.every(Boolean)
  }

  async uninstall() {
    this.notifyProgress(0, 'Désinstallation des services...')

    try {
      for (const service of this.services) {
        const servicePath = path.join(this.baseDir, service.name)
        await fs.rm(servicePath, { recursive: true, force: true })
        this.notifyProgress(
          (this.services.indexOf(service) + 1) / this.services.length * 100,
          `${service.name} désinstallé`
        )
      }

      this.notifyProgress(100, 'Désinstallation terminée')
    } catch (error) {
      this.notifyError(error)
      throw error
    }
  }
}

module.exports = InstallManager
