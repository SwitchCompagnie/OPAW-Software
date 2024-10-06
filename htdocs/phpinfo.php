<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>T-Tron - OPAW - PHP Info</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="icon" type="image/x-icon" href="/images/favicon.ico">
    <link rel="stylesheet" href="css/app.css" />
  </head>
  <body class="bg-gray-900 text-white flex flex-col min-h-screen">
    <header class="fixed top-0 left-0 w-full bg-gray-800 bg-opacity-75 p-4 shadow-lg z-10">
      <div class="max-w-5xl mx-auto flex justify-between items-center">
        <div class="flex items-center space-x-4">
          <img src="images/logo.png" alt="T-Tron Icon" class="h-8 w-8 spin-slow" />
          <span class="text-xl font-bold">T-Tron</span>
        </div>
        <div class="text-xl font-bold">OPAW</div>
        <div class="flex space-x-4">
          <a href="/" class="bg-white hover:bg-gray-300 text-black font-bold py-2 px-4 rounded">
            Accueil
          </a>
          <a href="phpinfo" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">PHP Info</a>
        </div>
      </div>
    </header>

    <main class="flex-grow flex flex-col items-center justify-center pt-20">
      <h1 class="text-5xl font-bold text-center mb-4">Informations PHP</h1>

      <div class="bg-gray-800 p-4 rounded shadow-lg">
        <?php ob_start(); phpinfo(); $phpinfo = ob_get_clean(); echo $phpinfo; ?>
      </div>
    </main>

    <footer class="w-full bg-gray-800 bg-opacity-75 shadow-lg p-4">
      <div class="max-w-5xl mx-auto text-center">
        <p class="text-white">&copy; SwitchCompagnie 2023-<?php echo date('Y'); ?></p>
      </div>
    </footer>
  </body>
</html>