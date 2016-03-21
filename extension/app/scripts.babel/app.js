import {runPwaAudits} from './pwa-check.js';

document.addEventListener('DOMContentLoaded', _ => {
  runPwaAudits(chrome).then(ret => {
    document.body.innerHTML = ret;
  });
});
