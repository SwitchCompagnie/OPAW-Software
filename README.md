# T-Tron - OPAW

T-Tron - OPAW est un projet Electron conçu pour les développeurs afin de faciliter la configuration d'un serveur web local avec Apache, PHP 8.4.8, MariaDB et phpMyAdmin.

## Prérequis

Avant de commencer, assurez-vous d'avoir installé les éléments suivants sur votre machine :

- Node.js et npm
- Electron

## Installation

1. Clonez le dépôt du projet sur votre machine locale.
2. Naviguez dans le répertoire du projet.
3. Exécutez la commande suivante pour installer les dépendances :

```bash
npm install
```

## Configuration

### Serveur Web

- **Lien du serveur web** : [http://localhost](http://localhost)
- **Emplacement des fichiers** : Les fichiers du serveur web doivent être placés dans le répertoire `htdocs`.

### Base de données

- **Mot de passe** : `225874120022587412`
- **Utilisateur phpMyAdmin** : `root`

### Accès à phpMyAdmin

Vous pouvez accéder à phpMyAdmin via le lien suivant une fois le serveur démarré :

[http://localhost/phpmyadmin](http://localhost/phpmyadmin)

## Commandes

Voici les commandes disponibles pour ce projet :

- **Démarrer le projet** :

```bash
npm start
```

- **Construire le projet (.exe)** :

```bash
npm run build
```

## Contribution

Les contributions sont les bienvenues ! Pour contribuer à ce projet, veuillez suivre les étapes suivantes :

1. Fork le projet.
2. Ouvrez une Pull Request.

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.