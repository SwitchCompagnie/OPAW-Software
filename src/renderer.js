let apacheRunning = false;
let mariadbRunning = false;

const updateButtons = () => {
    const apacheButton = document.getElementById('toggle-apache');
    const mariadbButton = document.getElementById('toggle-mariadb');
    
    apacheButton.textContent = apacheRunning ? 'Arrêter Apache' : 'Démarrer Apache';
    mariadbButton.textContent = mariadbRunning ? 'Arrêter MariaDB' : 'Démarrer MariaDB';
};

document.getElementById('toggle-apache').addEventListener('click', () => {
    if (apacheRunning) {
        window.electron.send('stop-apache');
    } else {
        window.electron.send('start-apache');
    }
    apacheRunning = !apacheRunning;
    updateButtons();
});

document.getElementById('toggle-mariadb').addEventListener('click', () => {
    if (mariadbRunning) {
        window.electron.send('stop-mariadb');
    } else {
        window.electron.send('start-mariadb');
    }
    mariadbRunning = !mariadbRunning;
    updateButtons();
});

updateButtons();