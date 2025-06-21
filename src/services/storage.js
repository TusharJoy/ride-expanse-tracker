// Storage service for handling receipt data
class StorageService {
  constructor() {
    this.storageKey = "ride_receipts";
  }

  async init() {
    try {
      await this.getReceipts();
      return true;
    } catch (error) {
      console.error("Error initializing storage service:", error);
      return false;
    }
  }

  async saveReceipt(receipt) {
    try {
      const receipts = await this.getReceipts();

      const existingIndex = receipts.findIndex(
        (r) => r.date === receipt.date && r.amount === receipt.amount
      );

      if (existingIndex >= 0) {
        receipts[existingIndex] = receipt;
      } else {
        receipts.push(receipt);
      }

      await this.saveReceipts(receipts);
      return true;
    } catch (error) {
      console.error("Error saving receipt:", error);
      throw error;
    }
  }

  async getReceipts() {
    try {
      const result = await chrome.storage.local.get([this.storageKey]);
      return result[this.storageKey] || [];
    } catch (error) {
      console.error("Error getting receipts:", error);
      throw error;
    }
  }

  async saveReceipts(receipts) {
    try {
      await chrome.storage.local.set({ [this.storageKey]: receipts });
      return true;
    } catch (error) {
      console.error("Error saving receipts:", error);
      throw error;
    }
  }

  async clearReceipts() {
    try {
      await chrome.storage.local.remove([this.storageKey]);
      return true;
    } catch (error) {
      console.error("Error clearing receipts:", error);
      throw error;
    }
  }

  async getReceiptsByDateRange(startDate, endDate) {
    try {
      const receipts = await this.getReceipts();
      return receipts.filter((receipt) => {
        const receiptDate = new Date(receipt.date);
        return receiptDate >= startDate && receiptDate <= endDate;
      });
    } catch (error) {
      console.error("Error filtering receipts by date:", error);
      throw error;
    }
  }

  async getTotalAmount() {
    try {
      const receipts = await this.getReceipts();
      return receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    } catch (error) {
      console.error("Error calculating total amount:", error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
