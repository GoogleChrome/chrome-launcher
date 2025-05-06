"use strict";

chrome.runtime.onInstalled.addListener(() => {
  injectContentScriptIfNeeded();
});

async function injectContentScriptIfNeeded() {
  // If the web page loaded before the extension did, then we have to schedule
  // execution from here.
  const tabs = await chrome.tabs.query({ url: "*://*/start_extension_test" });
  console.log(`BG: Found ${tabs.length} tabs with start_extension_test`);
  for (const tab of tabs) {
      chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["contentscript.js"],
      });
  }
}
