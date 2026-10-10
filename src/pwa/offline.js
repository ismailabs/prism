/* global document, navigator, addEventListener */
// Independent of the app, auth SDK, storage and financial APIs.
function connection(){document.getElementById('connection').textContent=navigator.onLine?'Connection detected. Try again. / Sambungan dikesan. Cuba lagi.':'No connection detected. / Tiada sambungan dikesan.';}
addEventListener('online',connection);addEventListener('offline',connection);connection();
