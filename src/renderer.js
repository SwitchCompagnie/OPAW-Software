document.getElementById('start-apache').addEventListener('click', () => {
    window.electron.send('start-apache');
});

document.getElementById('stop-apache').addEventListener('click', () => {
    window.electron.send('stop-apache');
});

document.getElementById('start-mariadb').addEventListener('click', () => {
    window.electron.send('start-mariadb');
});

document.getElementById('stop-mariadb').addEventListener('click', () => {
    window.electron.send('stop-mariadb');
});