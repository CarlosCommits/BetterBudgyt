# BetterBudgyt Chrome Extension (Beta)

A Chrome extension designed to enhance Budgyt dashboards with customizable variance calculations and improved data visualization.

## Overview

BetterBudgyt is a specialized Chrome extension that extends the functionality of Budgyt's financial dashboards. It provides customizable variance calculations, dynamic percentage updates, and improved data visualization features while maintaining the integrity of your original data.

> **Note**: This is an early/beta version of the extension.

## Key Features

- **Customizable Variance Calculations**
  - Flexible column selection for variance computations
  - Support for all budget data levels
  - Real-time calculation updates

- **Dynamic Percentage Calculations**
  - Automatic percentage updates based on variance values
  - Handles zero-value edge cases
  - Maintains calculation accuracy

- **DataInput View Optimization**
  - Total-only view option
  - Simplified data presentation
  - Preserved total column functionality

- **User-Friendly Interface**
  - Intuitive settings configuration
  - Visual indicators for managed cells
  - Persistent settings across sessions

- **Data Integrity**
  - Client-side only operations
  - No server communication
  - Original data remains untouched

## Installation

### Prerequisites
- Google Chrome browser
- Access to Budgyt dashboard

### Required Permissions
- `storage`: For saving your settings
- `activeTab`: For accessing the current page
- `scripting`: For performing calculations
- Access to `*.budgyt.com` domains

## Usage

### Basic Configuration
1. Click the BetterBudgyt icon in your Chrome toolbar
2. Configure your preferred variance calculations
3. Settings are automatically saved and applied

### Variance Calculations
- Select columns for variance computations
- Supports multiple calculation combinations
- Updates dynamically as you make changes

### DataInput View Features
- Toggle "Show Total Only" for simplified view
- Quick access to essential totals
- Easy to switch between views

### Settings Management
- All settings persist across sessions
- Synchronized across devices
- Easy to modify at any time

## Technical Details

### Built With
- Chrome Extension APIs
- Native JavaScript (ES6+)
- HTML5 & CSS3

### Architecture
- Operates entirely client-side
- Uses MutationObserver for real-time updates
- Implements precise CSS selectors for data extraction

### Data Safety
- No server communication
- Only modifies visual display
- Original Budgyt data remains unchanged

## Current Status

### Implemented Features
- [x] Customizable variance column calculations
- [x] Dynamic percentage calculations
- [x] DataInput view compaction
- [x] Persistent settings storage
- [x] Real-time updates
- [x] Visual indicators for managed cells
- [x] Support for all data levels
- [x] Dynamic headers

### Planned Enhancements
- [ ] Additional column combination support
- [ ] Custom formatting options
- [ ] Export/import settings functionality
- [ ] Calculation presets
- [ ] Enhanced data validation

## Development

Built using:
- Chrome Extension Framework (Manifest V3)
- Chrome Storage Sync API
- DOM Manipulation APIs
- MutationObserver API

## License

[Your License Here]

## Support

[Your Support Information Here]
