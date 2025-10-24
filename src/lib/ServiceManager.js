const { spawn, exec } = require('child_process')
const path = require('path')

class ServiceManager {
  constructor(baseDir, config, logger) {
    this.baseDir = baseDir
    this.config = config
    this.logger = logger
    this.processes = {
      apache: null,
      mariadb: null
    }
    this.restartAttempts = {
      apache: 0,
      mariadb: 0
    }
    this.maxRestartAttempts = 3
    this.statusCallbacks = []
    this.crashCallbacks = []
  }

  onStatusChange(callback) {
    this.statusCallbacks.push(callback)
  }

  onCrash(callback) {
    this.crashCallbacks.push(callback)
  }

  notifyStatus(service, status, message = '') {
    this.logger.info(`Service ${service} status: ${status}`, { message })
    this.statusCallbacks.forEach(cb => cb(service, status, message))
  }

  notifyCrash(service) {
    this.logger.warn(`Service ${service} crashed`)
    this.crashCallbacks.forEach(cb => cb(service))
  }

  execPromise(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) return reject(error)
        resolve(stdout)
      })
    })
  }

  async isProcessRunning(processName) {
    try {
      const stdout = await this.execPromise(`tasklist /FI "IMAGENAME eq ${processName}"`)
      return stdout.toLowerCase().includes(processName.toLowerCase())
    } catch (error) {
      return false
    }
  }

  async startApache() {
    const serviceName = 'apache'
    const executable = 'httpd.exe'

    try {
      if (await this.isProcessRunning(executable)) {
        this.notifyStatus(serviceName, 'running', 'Already running')
        return
      }

      const servicePath = path.join(this.baseDir, serviceName, 'bin', executable)
      const proc = spawn(servicePath, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      })

      proc.unref()
      this.processes.apache = proc
      this.restartAttempts.apache = 0

      // Setup crash detection
      proc.on('error', (error) => {
        this.logger.error(`Apache process error: ${error.message}`)
        this.notifyStatus(serviceName, 'error', error.message)
      })

      proc.on('exit', (code, signal) => {
        this.logger.warn(`Apache exited with code ${code}, signal ${signal}`)
        this.processes.apache = null

        if (this.config.get('apache.autoRestart') && this.restartAttempts.apache < this.maxRestartAttempts) {
          this.notifyCrash(serviceName)
          this.restartAttempts.apache++
          setTimeout(() => this.startApache(), 5000)
        } else {
          this.notifyStatus(serviceName, 'stopped', 'Service exited')
        }
      })

      // Wait and verify
      await new Promise(resolve => setTimeout(resolve, 3000))

      if (await this.isProcessRunning(executable)) {
        this.notifyStatus(serviceName, 'running', 'Started successfully')
      } else {
        this.notifyStatus(serviceName, 'error', 'Failed to start')
      }
    } catch (error) {
      this.logger.error(`Failed to start Apache: ${error.message}`)
      this.notifyStatus(serviceName, 'error', error.message)
    }
  }

  async stopApache() {
    const serviceName = 'apache'
    const executable = 'httpd.exe'

    try {
      if (this.processes.apache) {
        this.processes.apache.kill('SIGTERM')
        this.processes.apache = null
      }

      await this.execPromise('taskkill /F /IM httpd.exe')
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (!(await this.isProcessRunning(executable))) {
        this.notifyStatus(serviceName, 'stopped', 'Stopped successfully')
      } else {
        this.notifyStatus(serviceName, 'error', 'Failed to stop')
      }
    } catch (error) {
      // Process might already be stopped
      if (!(await this.isProcessRunning(executable))) {
        this.notifyStatus(serviceName, 'stopped', 'Already stopped')
      } else {
        this.logger.error(`Failed to stop Apache: ${error.message}`)
        this.notifyStatus(serviceName, 'error', error.message)
      }
    }
  }

  async restartApache() {
    await this.stopApache()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await this.startApache()
  }

  async startMariaDB() {
    const serviceName = 'mariadb'
    const executable = 'mysqld.exe'

    try {
      if (await this.isProcessRunning(executable)) {
        this.notifyStatus(serviceName, 'running', 'Already running')
        return
      }

      const servicePath = path.join(this.baseDir, serviceName, 'bin', executable)
      const proc = spawn(servicePath, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      })

      proc.unref()
      this.processes.mariadb = proc
      this.restartAttempts.mariadb = 0

      proc.on('error', (error) => {
        this.logger.error(`MariaDB process error: ${error.message}`)
        this.notifyStatus(serviceName, 'error', error.message)
      })

      proc.on('exit', (code, signal) => {
        this.logger.warn(`MariaDB exited with code ${code}, signal ${signal}`)
        this.processes.mariadb = null

        if (this.config.get('mariadb.autoRestart') && this.restartAttempts.mariadb < this.maxRestartAttempts) {
          this.notifyCrash(serviceName)
          this.restartAttempts.mariadb++
          setTimeout(() => this.startMariaDB(), 5000)
        } else {
          this.notifyStatus(serviceName, 'stopped', 'Service exited')
        }
      })

      await new Promise(resolve => setTimeout(resolve, 3000))

      if (await this.isProcessRunning(executable)) {
        this.notifyStatus(serviceName, 'running', 'Started successfully')
      } else {
        this.notifyStatus(serviceName, 'error', 'Failed to start')
      }
    } catch (error) {
      this.logger.error(`Failed to start MariaDB: ${error.message}`)
      this.notifyStatus(serviceName, 'error', error.message)
    }
  }

  async stopMariaDB() {
    const serviceName = 'mariadb'
    const executable = 'mysqld.exe'

    try {
      if (this.processes.mariadb) {
        this.processes.mariadb.kill('SIGTERM')
        this.processes.mariadb = null
      }

      const mariadbPath = path.join(this.baseDir, 'mariadb', 'bin', 'mysqladmin.exe')
      const password = this.config.get('mariadb.password')

      await this.execPromise(`"${mariadbPath}" -u root -p${password} shutdown`)
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (!(await this.isProcessRunning(executable))) {
        this.notifyStatus(serviceName, 'stopped', 'Stopped successfully')
      } else {
        this.notifyStatus(serviceName, 'error', 'Failed to stop')
      }
    } catch (error) {
      if (!(await this.isProcessRunning(executable))) {
        this.notifyStatus(serviceName, 'stopped', 'Already stopped')
      } else {
        this.logger.error(`Failed to stop MariaDB: ${error.message}`)
        this.notifyStatus(serviceName, 'error', error.message)
      }
    }
  }

  async restartMariaDB() {
    await this.stopMariaDB()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await this.startMariaDB()
  }

  async checkStatus() {
    const [apacheRunning, mariadbRunning] = await Promise.all([
      this.isProcessRunning('httpd.exe'),
      this.isProcessRunning('mysqld.exe')
    ])

    return {
      apache: apacheRunning ? 'running' : 'stopped',
      mariadb: mariadbRunning ? 'running' : 'stopped'
    }
  }

  async stopAll() {
    await Promise.all([this.stopApache(), this.stopMariaDB()])
  }

  async startAll() {
    if (this.config.get('apache.autoStart')) {
      await this.startApache()
    }
    if (this.config.get('mariadb.autoStart')) {
      await this.startMariaDB()
    }
  }
}

module.exports = ServiceManager
