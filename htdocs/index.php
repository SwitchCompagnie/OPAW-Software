<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>T-Tron - OPAW</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="icon" type="image/x-icon" href="/images/favicon.ico">
    <link rel="stylesheet" href="css/app.css" />
  </head>
  <body class="bg-gray-950 text-gray-200 flex flex-col min-h-screen font-sans">
    <header class="fixed top-0 left-0 w-full bg-gray-900 border-b border-gray-600 p-4 shadow-xl z-10">
      <div class="max-w-6xl mx-auto flex justify-between items-center">
        <div class="flex items-center space-x-4">
          <img src="images/logo.png" alt="T-Tron Icon" class="h-10 w-10 animate-spin-slow" />
          <span class="text-2xl font-semibold text-white">T-Tron</span>
        </div>
        <div class="text-2xl font-semibold text-white">OPAW</div>
        <div class="flex space-x-4">
          <a href="https://ttron.eu" class="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition duration-200 border border-gray-500">
            Accueil
          </a>
          <a href="phpinfo" class="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition duration-200 border border-gray-500">PHP Info</a>
        </div>
      </div>
    </header>

    <main class="flex-grow flex flex-col items-center justify-center pt-24 pb-8">
      <h1 class="text-4xl font-bold text-white mb-4">Le Serveur Web Fonctionne !</h1>
      <p class="text-white text-lg mb-8">Ceci est la page par défaut affichée depuis le dossier <code>htdocs</code>.</p>
      <div class="pulse bg-green-500 rounded-full h-6 w-6"></div>
    </main>

    <footer class="w-full bg-gray-900 border-t border-gray-600 shadow-lg p-4">
      <div class="max-w-6xl mx-auto text-center">
        <p class="text-gray-400">Made By SwitchCompagnie 2023-<?php echo date('Y'); ?></p>
      </div>
    </footer>
  </body>
</html>