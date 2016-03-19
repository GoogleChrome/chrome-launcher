import {runPwaTests} from './pwa-check.js';

document.addEventListener('DOMContentLoaded', _ => {
  document.querySelector('#pwa').addEventListener('click', checkPWA);
});

function checkPWA() {
  document.body.innerHTML += 'wow';
  runPwaTests();
}

