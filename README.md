# Ride Expanse Tracker Pro

A Chrome extension that automatically tracks your ride expenses by scanning your Gmail for ride-sharing service receipts.

## Features

- 🔐 **Gmail Integration** - Securely connects to your Gmail account
- 📧 **Automatic Scanning** - Finds ride service receipt emails
- 💰 **Expense Tracking** - Displays lifetime, monthly, and yearly totals
- 📊 **Transaction History** - View all your ride trips
- 📅 **Date Filtering** - Filter transactions by date range
- 📁 **CSV Export** - Export your data for external use
- 🔒 **Privacy First** - All data stored locally in your browser

## Setup & Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ride-cost-tracker-pro
```

### 2. Install Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the project directory
4. The extension will appear in your Chrome toolbar

## Usage

1. **Connect Gmail**: Click the extension icon and select "Connect Gmail"
2. **Scan Emails**: Click "Scan Emails" to find ride service receipts
3. **View Totals**: See your lifetime, monthly, and yearly spending
4. **Filter Data**: Use date filters to view specific time periods
5. **Export Data**: Download your transaction history as CSV

## Project Structure

```
ride-cost-tracker-pro/
├── popup.html          # Extension popup UI
├── popup.css           # Popup styling
├── popup.js            # Popup functionality
├── background.js       # Background service worker
├── manifest.json       # Extension configuration
├── icons/              # Extension icons
└── src/
    └── services/       # Core services
        ├── oauth.js    # Gmail authentication
        ├── gmail.js    # Email processing
        └── storage.js  # Local data storage
```

## Privacy & Security

- **Local Storage**: All data is stored locally in your browser
- **OAuth 2.0**: Secure Gmail authentication through Google
- **Minimal Permissions**: Only requests necessary Gmail read access
- **No External Servers**: Data never leaves your device

## Development

The extension uses vanilla JavaScript with ES modules. No build process required.

### Key Components

- **OAuth Service**: Handles Gmail authentication
- **Gmail Service**: Scans and parses ride service receipt emails
- **Storage Service**: Manages local data storage
- **Popup UI**: Displays data and handles user interactions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with the Chrome extension
5. Submit a pull request

## License

MIT License - see LICENSE file for details
