// OAuth service for handling Gmail API authentication
class OAuthService {
  constructor() {
    this.token = null;
    this.isAuthenticated = false;
  }

  async init() {
    try {
      console.log("Initializing OAuth...");
      // Check for existing token without prompting user
      const token = await this.getExistingToken();
      if (token) {
        this.token = token;
        this.isAuthenticated = true;
        console.log("OAuth initialized with existing token");
        return true;
      }
      console.log("No existing token found");
      return false;
    } catch (error) {
      console.error("OAuth initialization failed:", error);
      return false;
    }
  }

  async getExistingToken() {
    return new Promise((resolve, reject) => {
      console.log("Checking for existing auth token...");
      // Use interactive: false to avoid showing popup during init
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          console.log("No existing token:", chrome.runtime.lastError.message);
          resolve(null); // Don't reject, just return null
          return;
        }
        if (token) {
          console.log("Existing token found");
          resolve(token);
        } else {
          console.log("No token available");
          resolve(null);
        }
      });
    });
  }

  async getToken() {
    return new Promise((resolve, reject) => {
      console.log("Getting auth token with user interaction...");

      // Check if chrome.identity is available
      if (!chrome.identity) {
        const error = new Error("Chrome identity API not available");
        console.error(error);
        reject(error);
        return;
      }

      // This will show the OAuth popup
      console.log(
        "Calling chrome.identity.getAuthToken with interactive: true"
      );
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        console.log("OAuth callback executed");

        if (chrome.runtime.lastError) {
          console.error("Chrome runtime error:", chrome.runtime.lastError);
          console.error("Error message:", chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!token) {
          const error = new Error("No token received from OAuth");
          console.error(error);
          reject(error);
          return;
        }

        console.log(
          "Token received from user interaction:",
          token ? "✅ Present" : "❌ Missing"
        );
        resolve(token);
      });
    });
  }

  async authenticate() {
    try {
      console.log("🚀 Starting interactive authentication...");
      console.log("Chrome identity API available:", !!chrome.identity);
      console.log(
        "Extension manifest oauth2 config:",
        chrome.runtime.getManifest().oauth2
      );

      const token = await this.getToken();
      if (token) {
        this.token = token;
        this.isAuthenticated = true;
        console.log("✅ Authentication successful");
        return true;
      }
      console.log("❌ Authentication failed - no token received");
      return false;
    } catch (error) {
      console.error("❌ Authentication failed with error:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      this.isAuthenticated = false;
      throw error;
    }
  }

  async refreshToken() {
    try {
      console.log("Refreshing token...");
      const token = await this.getToken();
      this.token = token;
      this.isAuthenticated = true;
      console.log("Token refreshed successfully");
      return token;
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.isAuthenticated = false;
      throw error;
    }
  }

  async revokeToken() {
    return new Promise((resolve, reject) => {
      console.log("Revoking token...");
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error getting token for revocation:",
            chrome.runtime.lastError
          );
          reject(chrome.runtime.lastError);
          return;
        }

        if (!token) {
          console.log("No token to revoke");
          this.token = null;
          this.isAuthenticated = false;
          resolve();
          return;
        }

        // Revoke token
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
          .then(() => {
            chrome.identity.removeCachedAuthToken({ token }, () => {
              this.token = null;
              this.isAuthenticated = false;
              console.log("Token revoked successfully");
              resolve();
            });
          })
          .catch((error) => {
            console.error("Error revoking token:", error);
            reject(error);
          });
      });
    });
  }

  getAuthHeader() {
    if (!this.token) {
      throw new Error("Not authenticated");
    }
    return {
      Authorization: `Bearer ${this.token}`,
    };
  }
}

export const oauthService = new OAuthService();
