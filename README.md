# BetterBudgyt Chrome Extension

A Chrome extension that enhances Budgyt.com dashboards with customizable variance calculations and improved data visualization.

## Quick Installation Guide

1. **Download the Extension**
   - Download this repository as a ZIP file
   - Extract the ZIP file to a location on your computer

2. **Install in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" in the top-left
   - Select the extracted extension folder
   - The BetterBudgyt icon should appear in your Chrome toolbar

3. **Verify Installation**
   - The BetterBudgyt icon should appear in your Chrome toolbar
   - Click the icon to open the settings popup
   - Visit any Budgyt dashboard page to see the extension in action

## Quick Start Guide

1. **Configure Variance Calculations**
   - Click the BetterBudgyt icon in your toolbar
   - Select your desired columns for variance calculations
   - Changes are saved automatically

2. **Using Total-Only View**
   - Open any DataInput page in Budgyt
   - Click the BetterBudgyt icon
   - Toggle "Show Total Only" for a simplified view

3. **Understanding Visual Indicators**
   - Modified cells have a subtle highlight
   - Hover over rows for enhanced visibility
   - Headers show current calculation formulas

## Features

### Variance Calculations
- Customize which columns to use in variance calculations
- Real-time updates as you make changes
- Support for all budget data levels
- Dynamic percentage calculations

### DataInput View Optimization
- Toggle between full and total-only views
- Simplified data presentation
- Preserved total column functionality

### User-Friendly Interface
- Intuitive settings configuration
- Visual indicators for modified cells
- Settings persist across sessions

### Data Safety
- Works entirely client-side
- No data is sent to servers
- Original Budgyt data remains unchanged

## Troubleshooting

### Extension Not Working?
1. Ensure you're on a Budgyt dashboard page (https://*.budgyt.com/*)
2. Check if the extension is enabled in chrome://extensions/
3. Try refreshing the page
4. Disable and re-enable the extension if needed

### Settings Not Saving?
1. Check if Chrome sync is enabled
2. Try removing and re-adding the extension
3. Clear extension storage and reconfigure

### Visual Issues?
1. Refresh the page
2. Ensure no other extensions are conflicting
3. Check if your Budgyt page is fully loaded

## Technical Details

### Built With
- Chrome Extension APIs (Manifest V3)
- Native JavaScript (ES6+)
- HTML5 & CSS3

### Permissions Used
- `storage`: Saves your settings
- `activeTab`: Accesses current page
- `scripting`: Performs calculations
- Access to `*.budgyt.com` domains

### Architecture
- Client-side operations only
- Uses MutationObserver for real-time updates
- Implements precise CSS selectors

## Development

### Project Structure
```
├── manifest.json      # Extension configuration
├── popup.html        # Settings interface
├── popup.js         # Settings logic
├── content.js       # Main functionality
├── styles.css       # Custom styling
└── images/          # Extension icons
```

### Building from Source
1. Clone the repository
2. Make desired modifications
3. Test locally using Chrome's developer mode
4. Run `.\build.ps1` to create a zip for Chrome Web Store submission

The build script reads the version from `manifest.json` and outputs `BetterBudgyt-v{version}.zip`, excluding development files like `context/`, `AGENTS.md`, and `README.md`.

### Contributing
- Fork the repository
- Create a feature branch
- Submit a pull request

## Future Enhancements
- Additional column combination support
- Custom formatting options
- Export/import settings
- Calculation presets
- Enhanced data validation