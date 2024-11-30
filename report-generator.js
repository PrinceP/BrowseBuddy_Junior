// report-generator.js
class ReportGenerator {
    constructor() {
      this.websiteData = [];
      this.contentWarnings = [];
    }
  
    addWebsiteVisit(url, category, duration) {
      this.websiteData.push({
        url,
        category,
        visitTimestamp: new Date(),
        duration
      });
    }
  
    addContentWarning(warning) {
      this.contentWarnings.push({
        ...warning,
        timestamp: new Date()
      });
    }
  
    generateCSVReport() {
      // Create CSV content
      let csvRows = [];
      
      // Add header for website data
      csvRows.push(['Website Visits']);
      csvRows.push(['URL', 'Category', 'Visit Timestamp', 'Duration']);
      
      // Add website data
      this.websiteData.forEach(site => {
        csvRows.push([
          site.url,
          site.category,
          site.visitTimestamp.toLocaleString(),
          site.duration
        ]);
      });
      
      // Add empty row as separator
      csvRows.push([]);
      
      // Add header for content warnings
      csvRows.push(['Content Warnings']);
      csvRows.push(['Type', 'Details', 'Timestamp', 'Risk Level']);
      
      // Add content warnings
      this.contentWarnings.forEach(warning => {
        csvRows.push([
          warning.type,
          warning.details,
          warning.timestamp.toLocaleString(),
          warning.riskLevel
        ]);
      });
      
      // Convert rows to CSV string
      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      
      // Convert string to Uint8Array
      const encoder = new TextEncoder();
      const csvData = encoder.encode(csvContent);
      
      // Create the report name
      const reportName = `browseBuddy_report_${new Date().toISOString().split('T')[0]}.csv`;
      
      // Use chrome.downloads API to trigger download
      chrome.downloads.download({
        url: `data:text/csv;base64,${btoa(String.fromCharCode.apply(null, csvData))}`,
        filename: reportName,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError);
        } else {
          console.log('Download started with ID:', downloadId);
        }
      });

      return { filename: reportName };
    }
}

// Make it available globally
if (typeof window !== 'undefined') {
    window.ReportGenerator = ReportGenerator;
} else if (typeof self !== 'undefined') {
    self.ReportGenerator = ReportGenerator;
}
