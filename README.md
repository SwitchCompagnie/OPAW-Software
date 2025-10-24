# T-Tron OPAW Server v2.0.0

<div align="center">

![OPAW Logo](src/images/logo.png)

**Serveur de développement local professionnel avec Apache, PHP, MariaDB et phpMyAdmin**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/SwitchCompagnie/OPAW-Software)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-38.0.0-47848f.svg)](https://www.electronjs.org/)

</div>

## 🚀 Vue d'ensemble

T-Tron OPAW est une application Electron moderne et optimisée qui simplifie la gestion d'un environnement de développement web local complet. Cette version 2.0 apporte une refonte complète avec une architecture modulaire, des fonctionnalités avancées et une expérience utilisateur améliorée.

## ✨ Nouvelles fonctionnalités v2.0

### 🏗️ Architecture refactorisée
- **Architecture modulaire** avec séparation des responsabilités
- **ConfigManager** - Gestion centralisée de la configuration
- **ServiceManager** - Gestion avancée des services avec auto-restart
- **InstallManager** - Installation robuste avec retry logic
- **BackupManager** - Sauvegarde et restauration complètes
- **Logger** - Système de logging professionnel avec rotation

### 🔐 Sécurité améliorée
- **Génération automatique de mots de passe sécurisés** (plus de mots de passe hardcodés!)
- **Stockage sécurisé** des configurations
- **Mots de passe aléatoires** à chaque installation
- **Copie facile** du mot de passe depuis l'interface

### 🎨 Interface utilisateur modernisée
- **Design repensé** avec Tailwind CSS et FontAwesome
- **Indicateurs de statut en temps réel** avec animations
- **Bannières d'information** contextuelles
- **Interface responsive** et intuitive
- **Affichage du mot de passe MariaDB** dans l'interface

### ⚙️ Gestion avancée des services
- **Auto-démarrage configurable** des services
- **Redémarrage automatique** en cas de crash
- **Monitoring en temps réel** des processus
- **Gestion des erreurs améliorée** avec retry logic
- **Logs détaillés** pour chaque service

### 🗂️ Système de sauvegarde
- **Sauvegardes automatiques** programmables
- **Backup manuel** en un clic
- **Restauration complète** des données
- **Export/Import** de bases de données
- **Gestion automatique** des anciennes sauvegardes
- **Sauvegarde** de htdocs, MariaDB data, et configurations

### 📊 Logs et monitoring
- **Logs applicatifs** avec rotation automatique
- **Logs des services** (Apache, MariaDB)
- **Viewer de logs** avec auto-scroll
- **Filtrage et recherche** dans les logs
- **Historique complet** des opérations

### 🔧 Panneau de paramètres
- **Configuration graphique** de tous les paramètres
- **Gestion des ports** Apache et MariaDB
- **Options de démarrage** et redémarrage automatique
- **Configuration des sauvegardes** automatiques
- **Options d'interface** (system tray, etc.)
- **Réinitialisation** facile de la configuration

### 🖥️ System Tray
- **Icône dans la barre système** Windows
- **Menu contextuel** avec contrôle des services
- **Minimisation dans le tray** configurable
- **Démarrage minimisé** optionnel
- **Accès rapide** aux fonctionnalités principales

### 📦 Installation optimisée
- **Téléchargement avec retry** automatique
- **Progression détaillée** par service
- **Reprise** après interruption
- **Vérification d'intégrité** (checksums)
- **Messages d'erreur** explicites

## 📋 Prérequis

- **Windows 10/11** (64-bit)
- **Node.js** v16 ou supérieur
- **npm** v7 ou supérieur
- **Droits administrateur** (pour l'installation des services)

## 🛠️ Installation

### Installation depuis les sources

1. **Clonez le dépôt**
```bash
git clone https://github.com/SwitchCompagnie/OPAW-Software.git
cd OPAW-Software
```

2. **Installez les dépendances**
```bash
npm install
```

3. **Démarrez l'application**
```bash
npm start
```

### Build de l'exécutable

```bash
npm run build
```

L'exécutable portable sera généré dans le dossier `dist/`.

## 🎯 Utilisation

### Premier démarrage

1. **Lancez l'application** - L'installation automatique des services démarre
2. **Attendez la fin** de l'installation (Apache, PHP, MariaDB, phpMyAdmin)
3. **Notez votre mot de passe** MariaDB affiché dans l'interface
4. **Configurez** vos préférences dans les paramètres

### Gestion des services

#### Apache
- **Port par défaut**: 80
- **Document root**: `htdocs/`
- **Logs**: `logs/apache/error.log`
- **Configuration**: `apache/conf/httpd.conf`

#### MariaDB
- **Port par défaut**: 3306
- **Utilisateur**: `root`
- **Mot de passe**: Généré automatiquement (affiché dans l'interface)
- **Data directory**: `mariadb/data/`

#### phpMyAdmin
- **URL**: [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
- **Utilisateur**: `root`
- **Mot de passe**: Le même que MariaDB

### Commandes disponibles

```bash
# Démarrer en mode développement
npm start

# Démarrer en mode dev avec debug
npm run dev

# Télécharger manuellement les services
npm run download

# Build Windows portable
npm run build

# Build toutes les plateformes
npm run build:all
```

## 📂 Structure du projet

```
OPAW-Software/
├── src/
│   ├── main.js              # Point d'entrée principal
│   ├── preload.js           # Bridge IPC sécurisé
│   ├── renderer.js          # Logique UI
│   ├── index.html           # Interface principale
│   ├── install.html         # Interface d'installation
│   ├── settings.html        # Panneau de paramètres
│   ├── settings.js          # Logique des paramètres
│   ├── lib/
│   │   ├── Logger.js        # Système de logging
│   │   ├── ConfigManager.js # Gestion configuration
│   │   ├── ServiceManager.js # Gestion services
│   │   ├── InstallManager.js # Gestion installation
│   │   └── BackupManager.js # Gestion sauvegardes
│   ├── css/
│   │   └── app.css          # Styles personnalisés
│   └── images/
│       ├── logo.png         # Logo de l'application
│       └── favicon.ico      # Icône
├── bin/
│   ├── download-services.js  # Script de téléchargement
│   └── configure-services.js # Script de configuration
├── htdocs/                   # Racine web Apache
├── package.json
└── README.md
```

## ⚙️ Configuration

La configuration est stockée dans `%APPDATA%/opaw-server/config.json`

### Exemple de configuration

```json
{
  "version": "2.0.0",
  "mariadb": {
    "port": 3306,
    "password": "votre_mot_de_passe_généré",
    "autoStart": true,
    "autoRestart": true
  },
  "apache": {
    "port": 80,
    "autoStart": true,
    "autoRestart": true
  },
  "php": {
    "version": "8.4.12",
    "maxUploadSize": "128M",
    "maxPostSize": "128M",
    "memoryLimit": "256M"
  },
  "backup": {
    "autoBackup": false,
    "backupInterval": 86400000,
    "maxBackups": 10
  },
  "ui": {
    "minimizeToTray": true,
    "startMinimized": false
  }
}
```

## 🗺️ Roadmap

- [ ] Support de Node.js intégré
- [ ] Support de Redis
- [ ] Gestionnaire de projets multiples
- [ ] Support SSL/HTTPS
- [ ] Ports personnalisables via UI
- [ ] Support de bases multiples
- [ ] Import/Export de projets
- [ ] Thèmes personnalisables
- [ ] Support multilingue (EN/FR)
- [ ] Auto-update intégré

## 🐛 Dépannage

### L'installation échoue

- Vérifiez votre connexion Internet
- Exécutez l'application en tant qu'administrateur
- Vérifiez que les ports 80 et 3306 sont libres
- Consultez les logs dans `%APPDATA%/opaw-server/logs/`

### Les services ne démarrent pas

- Vérifiez les logs des services
- Assurez-vous qu'aucun autre serveur web/BDD n'est actif
- Redémarrez l'application en tant qu'administrateur
- Vérifiez la configuration dans les paramètres

### Impossible de se connecter à phpMyAdmin

- Vérifiez que MariaDB est démarré
- Utilisez le mot de passe affiché dans l'interface principale
- Copiez-le avec le bouton prévu à cet effet
- Vérifiez les logs de MariaDB

## 🔒 Sécurité

- ⚠️ **Cette application est destinée au développement local uniquement**
- Ne l'exposez jamais sur Internet
- Les mots de passe sont générés aléatoirement à l'installation
- Changez le mot de passe MariaDB si nécessaire
- Les configurations sont stockées localement

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 Changelog

### Version 2.0.0 (2025-10-24)

#### 🎉 Nouveautés majeures
- Architecture complètement refactorisée avec modules spécialisés
- Système de configuration centralisé avec UI
- Génération automatique de mots de passe sécurisés
- System tray integration pour Windows
- Système de sauvegarde/restauration complet
- Auto-restart des services en cas de crash
- Logging professionnel avec rotation
- Interface utilisateur modernisée

#### 🔧 Améliorations
- Installation plus robuste avec retry logic
- Meilleure gestion des erreurs
- Performance optimisée au démarrage
- Indicateurs de statut en temps réel
- Logs détaillés et facilement accessibles

#### 🐛 Corrections
- Correction des problèmes de permissions
- Amélioration de la stabilité des services
- Correction des fuites mémoire
- Meilleure gestion de la fermeture

### Version 1.0.2
- Corrections de bugs mineurs
- Amélioration de l'UI

### Version 1.0.0
- Version initiale

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👥 Auteurs

- **SwitchCompagnie** - [GitHub](https://github.com/SwitchCompagnie)

## 🙏 Remerciements

- [Electron](https://www.electronjs.org/)
- [Apache Lounge](https://www.apachelounge.com/)
- [PHP for Windows](https://windows.php.net/)
- [MariaDB](https://mariadb.org/)
- [phpMyAdmin](https://www.phpmyadmin.net/)
- [Tailwind CSS](https://tailwindcss.com/)
- [FontAwesome](https://fontawesome.com/)

---

<div align="center">

**Made with ❤️ by SwitchCompagnie**

[Signaler un bug](https://github.com/SwitchCompagnie/OPAW-Software/issues) • [Demander une fonctionnalité](https://github.com/SwitchCompagnie/OPAW-Software/issues) • [Documentation](https://github.com/SwitchCompagnie/OPAW-Software/wiki)

</div>
