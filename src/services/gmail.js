import { oauthService } from "./oauth.js";

class GmailService {
  constructor() {
    this.baseUrl = "https://www.googleapis.com/gmail/v1/users/me";
    this.scannedMessageIds = new Set();
  }

  async init() {
    await oauthService.init();
  }

  async searchEmails(
    query = "from:noreply@uber.com OR from:uber",
    maxResults = 100
  ) {
    try {
      const response = await fetch(
        `${this.baseUrl}/messages?q=${encodeURIComponent(
          query
        )}&maxResults=${maxResults}`,
        {
          headers: oauthService.getAuthHeader(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to search emails");
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error("Error in searchEmails:", error);
      throw error;
    }
  }

  async getEmailContent(messageId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/messages/${messageId}?format=full`,
        {
          headers: oauthService.getAuthHeader(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to get email details");
      }

      const data = await response.json();
      return this.parseEmailContent(data);
    } catch (error) {
      console.error("Error in getEmailContent:", error);
      throw error;
    }
  }

  parseEmailContent(email) {
    const headers = email.payload.headers;
    const subject = headers.find((h) => h.name === "Subject")?.value || "";
    const date = headers.find((h) => h.name === "Date")?.value || "";

    let body = "";
    if (email.payload.parts) {
      const textPart = email.payload.parts.find(
        (part) =>
          part.mimeType === "text/plain" || part.mimeType === "text/html"
      );
      if (textPart) {
        body = atob(textPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      }
    } else if (email.payload.body.data) {
      body = atob(
        email.payload.body.data.replace(/-/g, "+").replace(/_/g, "/")
      );
    }

    return {
      id: email.id,
      subject,
      date: new Date(date),
      body,
      snippet: email.snippet,
    };
  }

  extractRideCost(body) {
    const cleanBody = body
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/Â/g, " ")
      .replace(/\u00A0/g, " ")
      .replace(/\u2009/g, " ")
      .replace(/\u202F/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const patterns = [
      /Total:\s*\$([0-9,]+\.?\d*)/i,
      /Total\s*\$([0-9,]+\.?\d*)/i,
      /Total\s+BDT\s*([0-9,]+\.?\d*)/i,
      /Total:\s*BDT\s*([0-9,]+\.?\d*)/i,
      /Total\s*([0-9,]+\.?\d*)/i,
      /Fare:\s*\$([0-9,]+\.?\d*)/i,
      /Amount:\s*\$([0-9,]+\.?\d*)/i,
      /\$([0-9,]+\.?\d*)\s*total/i,
      /BDT\s*([0-9,]+\.?\d*)/i,
      /([0-9,]+\.?\d*)\s*BDT/i,
    ];

    for (const pattern of patterns) {
      const match = cleanBody.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(amount) && amount > 0) {
          return amount;
        }
      }
    }

    return null;
  }

  async scanEmails() {
    try {
      const messages = await this.searchEmails();
      const results = [];

      for (const message of messages) {
        if (this.scannedMessageIds.has(message.id)) {
          continue;
        }

        const email = await this.getEmailContent(message.id);
        const cost = this.extractRideCost(email.body);

        if (cost !== null) {
          const result = {
            id: email.id,
            date: email.date,
            cost,
            subject: email.subject,
          };
          results.push(result);
          this.scannedMessageIds.add(email.id);
        }
      }

      return results;
    } catch (error) {
      console.error("Error scanning emails:", error);
      throw error;
    }
  }

  clearScannedCache() {
    this.scannedMessageIds.clear();
  }
}

export const gmailService = new GmailService();
