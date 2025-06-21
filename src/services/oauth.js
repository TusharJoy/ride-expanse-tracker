// OAuth service for handling Gmail API authentication
class OAuthService {
  constructor() {
    this.token = null;
    this.isAuthenticated = false;
  }

  async init() {
    try {
      const token = await this.getExistingToken();
      if (token) {
        this.token = token;
        this.isAuthenticated = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error("OAuth initialization failed:", error);
      return false;
    }
  }

  async getExistingToken() {
    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) {
          resolve(null);
          return;
        }
        resolve(token);
      });
    });
  }

  async getToken() {
    return new Promise((resolve, reject) => {
      if (!chrome.identity) {
        reject(new Error("Chrome identity API not available"));
        return;
      }

      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!token) {
          reject(new Error("No token received from OAuth"));
          return;
        }

        resolve(token);
      });
    });
  }

  async authenticate() {
    try {
      const token = await this.getToken();
      if (token) {
        this.token = token;
        this.isAuthenticated = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error("Authentication failed:", error);
      this.isAuthenticated = false;
      throw error;
    }
  }

  async refreshToken() {
    try {
      const token = await this.getToken();
      this.token = token;
      this.isAuthenticated = true;
      return token;
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.isAuthenticated = false;
      throw error;
    }
  }

  async revokeToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) {
          this.token = null;
          this.isAuthenticated = false;
          resolve();
          return;
        }

        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
          .then(() => {
            chrome.identity.removeCachedAuthToken({ token }, () => {
              this.token = null;
              this.isAuthenticated = false;
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
