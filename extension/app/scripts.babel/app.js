import {runPwaTests} from './pwa-check.js';

document.addEventListener('DOMContentLoaded', _ => {
  document.querySelector('#pwa').addEventListener('click', checkPWA);
});

function checkPWA() {
  runPwaTests(chrome).then(ret => {
    document.body.innerHTML = ret;
  });
}

