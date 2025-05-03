chrome.runtime.onInstalled.addListener(() => {
  console.log("Banking Widget installed.");
});

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.url.includes("/checkout") || details.url.includes("/cart")) {
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ["content/content.js"]
    });
  }
}, { url: [{ urlMatches: '.*' }] });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "fraud-detection") {
    console.log("Fraud detection triggered.");
    // Placeholder for fraud detection logic
    sendResponse({ fraud: false });
  }

  if (message.type === "compulsive-check") {
    console.log("Compulsive purchase check triggered.");
    // Placeholder for compulsive purchase logic
    sendResponse({ compulsive: true });
  }

  if (message.type === "display-html-body") {
    console.log("HTML Body Content:", message.content);
    alert("HTML content has been logged to the console.");
    const popupWindow = window.open("", "HTML Content", "width=600,height=400");
    popupWindow.document.write(`<pre>${message.content}</pre>`);
    popupWindow.document.close();
  }
});