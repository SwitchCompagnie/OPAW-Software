const isInstallPage = window.location.pathname.includes('install.html');
const state = { apacheRunning: false, mariadbRunning: false };

const setButtonLoading = (button, loading) => {
    if (!button) return;
    if (loading) {
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
        button.disabled = true;
    } else {
        button.innerHTML = button.dataset.originalText;
        button.disabled = false;
    }
};

const updateButtons = () => {
    if (isInstallPage) return;
    const apacheButton = document.getElementById('toggle-apache');
    const mariadbButton = document.getElementById('toggle-mariadb');
    const apacheStatus = document.getElementById('apache-status');
    const mariadbStatus = document.getElementById('mariadb-status');
    apacheButton.textContent = state.apacheRunning ? 'Arrêter Apache' : 'Démarrer Apache';
    mariadbButton.textContent = state.mariadbRunning ? 'Arrêter MariaDB' : 'Démarrer MariaDB';
    apacheStatus.textContent = state.apacheRunning ? 'Running' : 'Stopped';
    apacheStatus.className = `text-sm px-3 py-1 rounded-full ${state.apacheRunning ? 'bg-green-600' : 'bg-red-600'} text-white`;
    mariadbStatus.textContent = state.mariadbRunning ? 'Running' : 'Stopped';
    mariadbStatus.className = `text-sm px-3 py-1 rounded-full ${state.mariadbRunning ? 'bg-green-600' : 'bg-red-600'} text-white`;
};

if (!isInstallPage) {
    window.electron.send('check-status');
    const apacheButton = document.getElementById('toggle-apache');
    const mariadbButton = document.getElementById('toggle-mariadb');

    apacheButton.addEventListener('click', () => {
        setButtonLoading(apacheButton, true);
        window.electron.send(state.apacheRunning ? 'stop-apache' : 'start-apache');
    });
    document.getElementById('restart-apache').addEventListener('click', () => {
        setButtonLoading(document.getElementById('restart-apache'), true);
        window.electron.send('restart-apache');
    });
    document.getElementById('logs-apache').addEventListener('click', () => {
        window.electron.send('get-apache-logs');
    });
    mariadbButton.addEventListener('click', () => {
        setButtonLoading(mariadbButton, true);
        window.electron.send(state.mariadbRunning ? 'stop-mariadb' : 'start-mariadb');
    });
    document.getElementById('restart-mariadb').addEventListener('click', () => {
        setButtonLoading(document.getElementById('restart-mariadb'), true);
        window.electron.send('restart-mariadb');
    });
    document.getElementById('logs-mariadb').addEventListener('click', () => {
        window.electron.send('get-mariadb-logs');
    });

    updateButtons();
}

window.electron.receive('service-status', (service, status, error) => {
    if (isInstallPage) return;
    const logsContainer = document.getElementById('logs-container');
    if (service === 'apache') {
        state.apacheRunning = status === 'running';
        setButtonLoading(document.getElementById('toggle-apache'), false);
        setButtonLoading(document.getElementById('restart-apache'), false);
        logsContainer.innerHTML += `<p class="${status === 'error' ? 'text-red-400' : ''}">[${new Date().toLocaleTimeString()}] Apache: ${status === 'error' ? `Error: ${error}` : status.charAt(0).toUpperCase() + status.slice(1)}</p>`;
        if (status === 'error') alert(`Erreur Apache: ${error}`);
    } else if (service === 'mariadb') {
        state.mariadbRunning = status === 'running';
        setButtonLoading(document.getElementById('toggle-mariadb'), false);
        setButtonLoading(document.getElementById('restart-mariadb'), false);
        logsContainer.innerHTML += `<p class="${status === 'error' ? 'text-red-400' : ''}">[${new Date().toLocaleTimeString()}] MariaDB: ${status === 'error' ? `Error: ${error}` : status.charAt(0).toUpperCase() + status.slice(1)}</p>`;
        if (status === 'error') alert(`Erreur MariaDB: ${error}`);
    }
    logsContainer.scrollTop = logsContainer.scrollHeight;
    updateButtons();
});

window.electron.receive('service-logs', (service, logs) => {
    if (isInstallPage) return;
    const logsContainer = document.getElementById('logs-container');
    logsContainer.innerHTML += `<p>[${new Date().toLocaleTimeString()}] ${service}: ${logs}</p>`;
    logsContainer.scrollTop = logsContainer.scrollHeight;
});