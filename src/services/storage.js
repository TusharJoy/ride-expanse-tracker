// Storage service for handling receipt data
class StorageService {
  constructor() {
    this.storageKey = "ride_receipts";
  }

  async init() {
    try {
      console.log("Initializing storage service...");
      // Test storage access
      await this.getReceipts();
      console.log("Storage service initialized successfully");
      return true;
    } catch (error) {
      console.error("Error initializing storage service:", error);
      return false;
    }
  }

  async saveReceipt(receipt) {
    try {
      console.log("Saving receipt:", receipt);
      const receipts = await this.getReceipts();

      // Check if receipt already exists (avoid duplicates)
      const existingIndex = receipts.findIndex(
        (r) => r.date === receipt.date && r.amount === receipt.amount
      );

      if (existingIndex >= 0) {
        console.log("Receipt already exists, updating...");
        receipts[existingIndex] = receipt;
      } else {
        receipts.push(receipt);
      }

      await this.saveReceipts(receipts);
      console.log("Receipt saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving receipt:", error);
      throw error;
    }
  }

  async getReceipts() {
    try {
      const result = await chrome.storage.local.get([this.storageKey]);
      const receipts = result[this.storageKey] || [];
      console.log(`Retrieved ${receipts.length} receipts from storage`);
      return receipts;
    } catch (error) {
      console.error("Error getting receipts:", error);
      throw error;
    }
  }

  async saveReceipts(receipts) {
    try {
      await chrome.storage.local.set({ [this.storageKey]: receipts });
      console.log(`Saved ${receipts.length} receipts to storage`);
      return true;
    } catch (error) {
      console.error("Error saving receipts:", error);
      throw error;
    }
  }

  async clearReceipts() {
    try {
      console.log("Clearing all receipts...");
      await chrome.storage.local.remove([this.storageKey]);
      console.log("All receipts cleared");
      return true;
    } catch (error) {
      console.error("Error clearing receipts:", error);
      throw error;
    }
  }

  async getReceiptsByDateRange(startDate, endDate) {
    try {
      const receipts = await this.getReceipts();
      const filtered = receipts.filter((receipt) => {
        const receiptDate = new Date(receipt.date);
        return receiptDate >= startDate && receiptDate <= endDate;
      });
      console.log(`Found ${filtered.length} receipts in date range`);
      return filtered;
    } catch (error) {
      console.error("Error filtering receipts by date:", error);
      throw error;
    }
  }

  async getTotalAmount() {
    try {
      const receipts = await this.getReceipts();
      const total = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
      console.log(`Total amount: $${total.toFixed(2)}`);
      return total;
    } catch (error) {
      console.error("Error calculating total amount:", error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
