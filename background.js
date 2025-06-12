// Background script for handling OAuth and message passing
import { oauthService } from "./src/services/oauth.js";
import { gmailService } from "./src/services/gmail.js";
import { storageService } from "./src/services/storage.js";

// Initialize services
async function initializeServices() {
  try {
    console.log("Initializing services...");
    await storageService.init();
    const isAuthenticated = await oauthService.init();
    console.log(
      "Services initialized. Authentication status:",
      isAuthenticated
    );
    return isAuthenticated;
  } catch (error) {
    console.error("Error initializing services:", error);
    return false;
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);

  switch (request.type) {
    case "AUTHENTICATE":
      handleAuthentication(sendResponse);
      return true; // Keep the message channel open for async response

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
      console.warn("Unknown message type:", request.type);
      sendResponse({ success: false, error: "Unknown message type" });
  }
});

async function handleAuthentication(sendResponse) {
  try {
    console.log("Handling authentication request...");
    const isAuthenticated = await oauthService.authenticate();
    console.log("Authentication status:", isAuthenticated);
    sendResponse({ success: true, isAuthenticated });
  } catch (error) {
    console.error("Authentication error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleProcessEmails(sendResponse) {
  try {
    console.log("Processing emails...");
    const receipts = await gmailService.processRideEmails();
    console.log(`Processed ${receipts.length} receipts`);
    sendResponse({ success: true, receipts });
  } catch (error) {
    console.error("Error processing emails:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetReceipts(sendResponse) {
  try {
    console.log("Getting receipts...");
    const receipts = await storageService.getReceipts();
    console.log(`Retrieved ${receipts.length} receipts`);
    sendResponse({ success: true, receipts });
  } catch (error) {
    console.error("Error getting receipts:", error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleExportCSV(sendResponse) {
  try {
    console.log("Exporting to CSV...");
    const receipts = await storageService.getReceipts();
    const csv = convertToCSV(receipts);
    console.log("CSV export completed");
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
