# 🌟 BrowseBuddy Junior: Your Online Safety Companion for Kids 🌟

BrowseBuddy Junior is a comprehensive online safety tool designed specifically for children. This Chrome extension utilizes Google's Gemini Nano model for local AI processing, ensuring a safe browsing experience by monitoring content and providing real-time analysis. Follow the setup instructions carefully to ensure proper functionality.

---

## **Features**
- Categorizes websites (educational, entertainment, social, etc.).
- Detects cyberbullying and harmful language in real-time.
- Logs instances of websites asking for personal data.
- Tracks screen time and generates CSV reports for parents.
- Privacy-first design: processes data locally.

---

## Prerequisites

Before installing the extension, please ensure you meet the following requirements:

1. Review and acknowledge [Google's Generative AI Prohibited Uses Policy](https://policies.google.com/terms/generative-ai/use-policy)
2. Install [Chrome Dev channel](https://www.google.com/chrome/dev/) (version ≥ 128.0.6545.0)
3. System Requirements:
   - Minimum 22 GB free storage space
   - Maintain at least 10 GB free space after installation
   > Note: Different operating systems may report available space differently. On macOS, use Disk Utility for accurate measurements.

## Setup

### 1. Enable Gemini Nano and Prompt API

1. Enable Gemini Nano bypass:
   - Navigate to `chrome://flags/#optimization-guide-on-device-model`
   - Set to "Enabled BypassPerfRequirement"

2. Enable Prompt API:
   - Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
   - Set to "Enabled"

3. Relaunch Chrome

### 2. Verify Gemini Nano Installation

1. Open Chrome DevTools (Press F12 or Ctrl+Shift+I)
2. In the console, run:
   ```javascript
   (await ai.languageModel.capabilities()).available;
   ```
   If it returns "readily", setup is complete.

If verification fails:

1. Force API recognition:
   ```javascript
   await ai.languageModel.create();
   ```
   (This command is expected to fail)

2. Relaunch Chrome

3. Check components:
   - Navigate to `chrome://components`
   - Locate "Optimization Guide On Device Model"
   - Verify version ≥ 2024.5.21.1031
   - If no version is listed, click "Check for update"

4. Verify again using the capabilities check in DevTools
   ```javascript
   (await ai.languageModel.capabilities()).available;
   ```

5. If still unsuccessful, relaunch Chrome, wait briefly, and repeat from step 1

---

## **Installation**
### **Load the Extension via Unpacked Method**

1. **Open Chrome Extensions Page:**  
   - Open Chrome and type `chrome://extensions` in the address bar.  

2. **Enable Developer Mode:**  
   - Toggle the "Developer mode" switch in the top-right corner.  

3. **Load Unpacked Extension:**  
   - Click the **"Load unpacked"** button.  
   - Select the folder where the BrowseBuddy Junior code resides.

4. **Activate the Extension:**  
   - Ensure the extension is toggled on.  
   - You should now see the BrowseBuddy Junior icon in your Chrome toolbar.  

---
## **Usage**
### **Getting Started**
1. Click the **BrowseBuddy Junior icon** in the Chrome toolbar to access its settings and features.  
2. Customize the preferences for website categorization, harmful language detection, and reporting intervals.  
3. Open the **Reports** section to view or download CSV files containing detailed logs of your child’s browsing activity.  

### **Features in Action**
- **Website Categorization:** Automatically assigns a category (e.g., educational, entertainment) to visited websites.  
- **Harmful Content Alerts:** Provides real-time alerts when harmful or unsafe content is detected.  
- **Screen Time Monitoring:** Tracks the amount of time spent on each website.  

---

## Contributing

We welcome contributions to improve BrowseBuddy Junior! Please fork the repository, create a branch for your feature, and submit a pull request.

## License

MIT

