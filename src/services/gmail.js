import { oauthService } from "./oauth.js";
import { storageService } from "./storage.js";

class GmailService {
  constructor() {
    this.baseUrl = "https://www.googleapis.com/gmail/v1/users/me";
    this.scannedMessageIds = new Set();
  }

  async init() {
    await oauthService.init();
  }

  async searchEmails(query = 'from:uber subject:"receipt"', maxResults = 100) {
    try {
      console.log("Searching emails with query:", query);
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
        console.error("Error searching emails:", error);
        throw new Error(error.error?.message || "Failed to search emails");
      }

      const data = await response.json();
      console.log(`Found ${data.messages?.length || 0} messages`);
      return data.messages || [];
    } catch (error) {
      console.error("Error in searchEmails:", error);
      throw error;
    }
  }

  async getEmailContent(messageId) {
    try {
      console.log("Getting email details for message:", messageId);
      const response = await fetch(
        `${this.baseUrl}/messages/${messageId}?format=full`,
        {
          headers: oauthService.getAuthHeader(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Error getting email details:", error);
        throw new Error(error.error?.message || "Failed to get email details");
      }

      const data = await response.json();
      console.log("Email details retrieved successfully");
      return this.parseEmailContent(data);
    } catch (error) {
      console.error("Error in getEmailDetails:", error);
      throw error;
    }
  }

  parseEmailContent(email) {
    const headers = email.payload.headers;
    const subject = headers.find((h) => h.name === "Subject")?.value || "";
    const date = headers.find((h) => h.name === "Date")?.value || "";

    let body = "";
    if (email.payload.parts) {
      // Handle multipart emails
      const textPart = email.payload.parts.find(
        (part) =>
          part.mimeType === "text/plain" || part.mimeType === "text/html"
      );
      if (textPart) {
        body = atob(textPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      }
    } else if (email.payload.body.data) {
      // Handle single part emails
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
    const regex = /Total BDT\s*([\d.]+)/i;
    const match = body.match(regex);
    return match ? parseFloat(match[1]) : null;
  }

  async scanEmails() {
    try {
      const { messages } = await this.searchEmails();
      const results = [];

      for (const message of messages) {
        if (this.scannedMessageIds.has(message.id)) {
          continue;
        }

        const email = await this.getEmailContent(message.id);
        const cost = this.extractRideCost(email.body);

        if (cost !== null) {
          results.push({
            id: email.id,
            date: email.date,
            cost,
            subject: email.subject,
          });
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

  async getEmailBody(messageId) {
    try {
      console.log("Getting email body for message:", messageId);
      const email = await this.getEmailContent(messageId);
      const body =
        email.payload?.parts?.find((part) => part.mimeType === "text/plain")
          ?.body?.data || email.payload?.body?.data;

      if (!body) {
        console.log("No body found in email");
        return "";
      }

      const decodedBody = atob(body.replace(/-/g, "+").replace(/_/g, "/"));
      console.log("Email body retrieved successfully");
      return decodedBody;
    } catch (error) {
      console.error("Error in getEmailBody:", error);
      throw error;
    }
  }

  async processRideEmails() {
    try {
      console.log("Starting to process ride emails...");
      const query = 'from:uber subject:"Your Uber Receipt"';
      const messages = await this.searchEmails(query);

      console.log(`Processing ${messages.length} ride emails...`);
      const processedEmails = [];

      for (const message of messages) {
        try {
          const body = await this.getEmailBody(message.id);
          const receipt = this.parseRideReceipt(body);

          if (receipt) {
            processedEmails.push(receipt);
            await storageService.saveReceipt(receipt);
          }
        } catch (error) {
          console.error(`Error processing email ${message.id}:`, error);
        }
      }

      console.log(
        `Successfully processed ${processedEmails.length} ride emails`
      );
      return processedEmails;
    } catch (error) {
      console.error("Error in processRideEmails:", error);
      throw error;
    }
  }

  parseRideReceipt(emailBody) {
    try {
      console.log("Parsing ride receipt from email body...");
      // Extract date
      const dateMatch = emailBody.match(/Date: ([\w\s,]+)/);
      const date = dateMatch ? new Date(dateMatch[1]) : null;

      // Extract amount
      const amountMatch = emailBody.match(/Total: \$(\d+\.\d+)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

      // Extract trip details
      const tripMatch = emailBody.match(/Trip: ([\w\s]+)/);
      const tripDetails = tripMatch ? tripMatch[1].trim() : "";

      if (!date || !amount) {
        console.log("Could not parse required fields from email");
        return null;
      }

      const receipt = {
        date: date.toISOString(),
        amount,
        tripDetails,
        source: "gmail",
      };

      console.log("Successfully parsed receipt:", receipt);
      return receipt;
    } catch (error) {
      console.error("Error parsing ride receipt:", error);
      return null;
    }
  }
}

export const gmailService = new GmailService();
