import { oauthService } from "./src/services/oauth.js";
import { gmailService } from "./src/services/gmail.js";
import { storageService } from "./src/services/storage.js";

// Initialize services
async function initializeServices() {
  try {
    await storageService.init();
    const isAuthenticated = await oauthService.init();
    return isAuthenticated;
  } catch (error) {
    console.error("Error initializing services:", error);
    return false;
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case "AUTHENTICATE":
      handleAuthentication(sendResponse);
      return true;

    case "PROCESS_EMAILS":
      handleProcessEmails(sendResponse);
      return true;

    case "GET_RECEIPTS":
      handleGetReceipts(sendResponse);
      return true;

    case "EXPORT_CSV":
      handleExportCSV(sendResponse);
      return true;

    default:
      sendResponse({ success: false, error: "Unknown message type" });
  }
});

async function handleAuthentication(sendResponse) {
  try {
    const isAuthenticated = await oauthService.authenticate();
    sendResponse({ success: true, isAuthenticated });
  } catch (error) {
    console.error("Authentication error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleProcessEmails(sendResponse) {
  try {
    const receipts = await gmailService.scanEmails();

    for (const receipt of receipts) {
      await storageService.saveReceipt({
        date: receipt.date.toISOString(),
        amount: receipt.cost,
        tripDetails: receipt.subject,
        source: "gmail",
      });
    }

    sendResponse({ success: true, receipts });
  } catch (error) {
    console.error("Error processing emails:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetReceipts(sendResponse) {
  try {
    const receipts = await storageService.getReceipts();
    sendResponse({ success: true, receipts });
  } catch (error) {
    console.error("Error getting receipts:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleExportCSV(sendResponse) {
  try {
    const receipts = await storageService.getReceipts();
    const csv = convertToCSV(receipts);
    sendResponse({ success: true, csv });
  } catch (error) {
    console.error("Error exporting to CSV:", error);
    sendResponse({ success: false, error: error.message });
  }
}

function convertToCSV(receipts) {
  const headers = ["Date", "Amount", "Trip Details", "Source"];
  const rows = receipts.map((receipt) => [
    new Date(receipt.date).toLocaleDateString(),
    receipt.amount,
    receipt.tripDetails,
    receipt.source,
  ]);
  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

// Initialize services when the extension loads
initializeServices().then((isAuthenticated) => {
  console.log("Extension initialized. Authentication status:", isAuthenticated);
});
