// Import services
import { oauthService } from "./src/services/oauth.js";
import { storageService } from "./src/services/storage.js";
import { gmailService } from "./src/services/gmail.js";

// UI Elements
const authStatus = document.getElementById("authStatus");
const statusDot = authStatus.querySelector(".status-dot");
const statusText = authStatus.querySelector(".status-text");
const connectBtn = document.getElementById("connectBtn");
const scanBtn = document.getElementById("scanBtn");
const exportBtn = document.getElementById("exportBtn");
const filterBtn = document.getElementById("filterBtn");
const clearDataBtn = document.getElementById("clearDataBtn");

const lifetimeTotal = document.getElementById("lifetimeTotal");
const monthlyTotal = document.getElementById("monthlyTotal");
const yearlyTotal = document.getElementById("yearlyTotal");

const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const transactionsList = document.getElementById("transactionsList");

// Initialize popup
async function initializePopup() {
  try {
    console.log("Initializing popup...");

    // Initialize storage first
    await storageService.init();

    // Set default date range (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    startDate.value = firstDay.toISOString().split("T")[0];
    endDate.value = lastDay.toISOString().split("T")[0];

    // Check authentication status
    const isAuthenticated = await oauthService.init();
    updateAuthStatus(isAuthenticated);

    // Load and display data
    await loadTransactionData();

    console.log("Popup initialized successfully");
  } catch (error) {
    console.error("Error initializing popup:", error);
    showError("Failed to initialize popup");
  }
}

// Update authentication status
function updateAuthStatus(isAuthenticated) {
  if (isAuthenticated) {
    statusDot.classList.add("connected");
    statusText.textContent = "Connected";
    connectBtn.textContent = "Disconnect";
    scanBtn.disabled = false;
    exportBtn.disabled = false;
    filterBtn.disabled = false;
    clearDataBtn.disabled = false;
  } else {
    statusDot.classList.remove("connected");
    statusText.textContent = "Not Connected";
    connectBtn.textContent = "Connect Gmail";
    scanBtn.disabled = true;
    exportBtn.disabled = true;
    filterBtn.disabled = true;
    clearDataBtn.disabled = true;
  }
}

// Load transaction data
async function loadTransactionData() {
  try {
    const receipts = await storageService.getReceipts();

    // Calculate totals
    const now = new Date();
    const thisMonth = receipts.filter((r) => {
      const receiptDate = new Date(r.date);
      return (
        receiptDate.getMonth() === now.getMonth() &&
        receiptDate.getFullYear() === now.getFullYear()
      );
    });

    const thisYear = receipts.filter((r) => {
      const receiptDate = new Date(r.date);
      return receiptDate.getFullYear() === now.getFullYear();
    });

    const lifetimeAmount = receipts.reduce((sum, r) => sum + r.amount, 0);
    const monthlyAmount = thisMonth.reduce((sum, r) => sum + r.amount, 0);
    const yearlyAmount = thisYear.reduce((sum, r) => sum + r.amount, 0);

    // Update UI
    lifetimeTotal.textContent = `BDT ${lifetimeAmount.toFixed(2)}`;
    monthlyTotal.textContent = `BDT ${monthlyAmount.toFixed(2)}`;
    yearlyTotal.textContent = `BDT ${yearlyAmount.toFixed(2)}`;

    // Display recent transactions
    displayTransactions(receipts.slice(-10).reverse());
  } catch (error) {
    console.error("Error loading transaction data:", error);
  }
}

// Display transactions
function displayTransactions(transactions) {
  transactionsList.innerHTML = "";

  if (transactions.length === 0) {
    transactionsList.innerHTML =
      '<p style="text-align: center; color: #666; padding: 20px;">No transactions found</p>';
    return;
  }

  transactions.forEach((transaction) => {
    const item = document.createElement("div");
    item.className = "transaction-item";
    item.innerHTML = `
            <div>
                <div class="transaction-date">${new Date(
                  transaction.date
                ).toLocaleDateString()}</div>
                <div>${transaction.tripDetails || "Ride Trip"}</div>
            </div>
            <div class="transaction-amount">BDT ${transaction.amount.toFixed(
              2
            )}</div>
        `;
    transactionsList.appendChild(item);
  });
}

// Handle connect/disconnect
async function handleConnect() {
  try {
    if (oauthService.isAuthenticated) {
      // Disconnect
      await oauthService.revokeToken();
      updateAuthStatus(false);
    } else {
      // Connect
      connectBtn.textContent = "Connecting...";
      connectBtn.disabled = true;

      const response = await chrome.runtime.sendMessage({
        type: "AUTHENTICATE",
      });
      if (response.success) {
        updateAuthStatus(response.isAuthenticated);
        if (response.isAuthenticated) {
          await loadTransactionData();
        }
      } else {
        throw new Error(response.error);
      }
    }
  } catch (error) {
    console.error("Connect error:", error);
    showError("Authentication failed");
  } finally {
    connectBtn.disabled = false;
    if (!oauthService.isAuthenticated) {
      connectBtn.textContent = "Connect Gmail";
    }
  }
}

// Handle scan emails
async function handleScan() {
  try {
    scanBtn.textContent = "Scanning...";
    scanBtn.disabled = true;

    const response = await chrome.runtime.sendMessage({
      type: "PROCESS_EMAILS",
    });
    if (response.success) {
      await loadTransactionData();
      showSuccess(`Processed ${response.receipts.length} receipts`);
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error("Scan error:", error);
    showError("Failed to scan emails");
  } finally {
    scanBtn.textContent = "Scan Emails";
    scanBtn.disabled = false;
  }
}

// Handle export
async function handleExport() {
  try {
    exportBtn.textContent = "Exporting...";
    exportBtn.disabled = true;

    const response = await chrome.runtime.sendMessage({ type: "EXPORT_CSV" });
    if (response.success) {
      const blob = new Blob([response.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ride-receipts.csv";
      a.click();
      URL.revokeObjectURL(url);
      showSuccess("Export completed");
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error("Export error:", error);
    showError("Failed to export receipts");
  } finally {
    exportBtn.textContent = "Export CSV";
    exportBtn.disabled = false;
  }
}

// Handle filter
async function handleFilter() {
  try {
    const start = new Date(startDate.value);
    const end = new Date(endDate.value);

    const filteredReceipts = await storageService.getReceiptsByDateRange(
      start,
      end
    );
    displayTransactions(filteredReceipts.reverse());
  } catch (error) {
    console.error("Filter error:", error);
    showError("Failed to filter transactions");
  }
}

// Handle clear data
async function handleClearData() {
  if (
    confirm("Are you sure you want to clear all data? This cannot be undone.")
  ) {
    try {
      await storageService.clearReceipts();
      await loadTransactionData();
      showSuccess("All data cleared");
    } catch (error) {
      console.error("Clear data error:", error);
      showError("Failed to clear data");
    }
  }
}

// Show success message
function showSuccess(message) {
  console.log("Success:", message);
  // You could add a toast notification here
}

// Show error message
function showError(message) {
  console.error("Error:", message);
  // You could add a toast notification here
}

// Event listeners
connectBtn.addEventListener("click", handleConnect);
scanBtn.addEventListener("click", handleScan);
exportBtn.addEventListener("click", handleExport);
filterBtn.addEventListener("click", handleFilter);
clearDataBtn.addEventListener("click", handleClearData);

// Initialize popup when loaded
document.addEventListener("DOMContentLoaded", initializePopup);
