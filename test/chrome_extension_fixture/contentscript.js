"use strict";

if (!window.firstRunOfExtension) {
  window.firstRunOfExtension = true;
  notifyTestServer();
}

async function notifyTestServer() {
  try {
    let res = await fetch(new URL('/hello_from_extension', location.origin));
    console.log(`Notified server, status: ${res.status}`);
  } catch (e) {
    console.error(`Unexpected error: ${e}`);
  }
}
