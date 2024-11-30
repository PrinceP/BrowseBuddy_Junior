// popup.js
document.addEventListener('DOMContentLoaded', function() {
  // Load and display current settings
  loadCurrentSettings();

  // Save settings
  document.getElementById('save-settings').addEventListener('click', () => {
    const settings = {
      categories: Array.from(document.querySelectorAll('input[name="category"]:checked'))
        .map(cb => cb.value),
      contentMonitoring: Array.from(document.querySelectorAll('input[name="content"]:checked'))
        .map(cb => cb.value),
      screenTimeLimit: document.getElementById('screen-time-limit').value
    };

    chrome.storage.sync.set({ parentSettings: settings }, () => {
      alert('Settings saved successfully!');
      window.close(); // Close the popup after saving
    });
  });

  // Generate report
  document.getElementById('generate-report').addEventListener('click', () => {
    console.log('Requesting report generation...');
    
    // Disable the button while generating
    const button = document.getElementById('generate-report');
    button.disabled = true;
    button.textContent = 'Generating...';

    chrome.runtime.sendMessage({ type: 'GENERATE_REPORT' }, (response) => {
        console.log('Report generation response:', response);
        button.disabled = false;
        button.textContent = 'Generate Report';

        if (response && response.success) {
            console.log('Report generated successfully:', response.filename);
            alert('Report is being downloaded.');
        } else {
            console.error('Failed to generate report:', response?.error);
            alert(response?.error || 'Failed to generate report. Please try again.');
        }
    });
  });
});

function loadCurrentSettings() {
  chrome.storage.sync.get(['parentSettings'], (result) => {
    const settingsContent = document.getElementById('settings-content');
    if (result.parentSettings) {
      const settings = result.parentSettings;
      settingsContent.innerHTML = `
        <p><strong>Monitored Categories:</strong> ${settings.categories.join(', ')}</p>
        <p><strong>Content Monitoring:</strong> ${settings.contentMonitoring.join(', ')}</p>
        <p><strong>Screen Time Limit:</strong> ${settings.screenTimeLimit} hours</p>
      `;

      // Restore categories
      settings.categories.forEach(category => {
        const checkbox = document.querySelector(`input[name="category"][value="${category}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });

      // Restore content monitoring
      settings.contentMonitoring.forEach(content => {
        const checkbox = document.querySelector(`input[name="content"][value="${content}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });

      // Restore screen time limit
      document.getElementById('screen-time-limit').value = settings.screenTimeLimit || '';
    } else {
      settingsContent.innerHTML = '<p>No settings configured yet.</p>';
    }
  });
}
