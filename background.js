// background.js
// importScripts('report-generator.js');
console.log('Background script starting...');

class ReportGenerator {
    constructor() {
        this.websiteData = new Map();
        this.contentWarnings = [];
        this.contentAnalyses = [];
    }

    addOrUpdateWebsiteVisit(url) {
        const now = new Date();
        if (!this.websiteData.has(url)) {
            this.websiteData.set(url, {
                url,
                firstVisit: now,
                lastVisit: now,
                totalTime: 0,
                visits: 1
            });
        } else {
            const data = this.websiteData.get(url);
            data.lastVisit = now;
            data.visits += 1;
        }
    }

    updateScreenTime(url, duration) {
        if (this.websiteData.has(url)) {
            const data = this.websiteData.get(url);
            data.totalTime += duration;
        }
    }

    addContentAnalysis(analysis, url) {
        console.log('Adding content analysis:', analysis, 'for URL:', url);
        
        if (!analysis) {
            console.warn('Empty analysis received');
            return;
        }
        
        // Clean and truncate the details for CSV
        const cleanDetails = analysis.details
            ?.replace(/[\n\r]+/g, ' ')  // Replace newlines with spaces
            ?.replace(/,/g, ';')        // Replace commas with semicolons
            ?.substring(0, 1000)        // Limit length
            || '';

        const analysisEntry = {
            url,
            timestamp: new Date(),
            type: analysis.type || 'unknown',
            riskLevel: analysis.riskLevel || 'unknown',
            details: cleanDetails,
            harmfulContent: analysis.harmfulContent || false
        };

        console.log('Adding analysis entry:', analysisEntry);
        this.contentAnalyses.push(analysisEntry);

        // If harmful content is found, also add to warnings
        if (analysis.harmfulContent) {
            this.contentWarnings.push({
                type: analysis.type,
                details: cleanDetails,
                timestamp: new Date(),
                riskLevel: analysis.riskLevel,
                url
            });
        }
    }

    generateCSVReport() {
        console.log('Generating report with:', {
            websiteCount: this.websiteData.size,
            analysesCount: this.contentAnalyses.length,
            warningsCount: this.contentWarnings.length
        });

        let csvRows = [];
        
        // Website Data Section with screen time
        csvRows.push(['Website Activity Report']);
        csvRows.push(['URL', 'First Visit', 'Last Visit', 'Total Time (minutes)', 'Number of Visits']);
        
        // Convert Map to Array and add website data
        Array.from(this.websiteData.entries()).forEach(([url, data]) => {
            const totalMinutes = (data.totalTime / 60000).toFixed(2); // Convert ms to minutes
            csvRows.push([
                data.url,
                data.firstVisit.toLocaleString(),
                data.lastVisit.toLocaleString(),
                totalMinutes,
                data.visits
            ]);
        });
        
        csvRows.push([]); // Empty row as separator
        
        // Content Analyses Section
        csvRows.push(['Content Analyses']);
        csvRows.push(['Timestamp', 'URL', 'Type', 'Risk Level', 'Harmful Content', 'Details']);
        
        this.contentAnalyses.forEach(analysis => {
            csvRows.push([
                analysis.timestamp.toLocaleString(),
                analysis.url,
                analysis.type,
                analysis.riskLevel,
                analysis.harmfulContent ? 'Yes' : 'No',
                analysis.details
            ]);
        });
        
        csvRows.push([]);  // Empty row as separator
        
        // Content Warnings Section
        if (this.contentWarnings.length > 0) {
            csvRows.push(['Content Warnings']);
            csvRows.push(['Timestamp', 'URL', 'Type', 'Risk Level', 'Details']);
            
            this.contentWarnings.forEach(warning => {
                csvRows.push([
                    warning.timestamp.toLocaleString(),
                    warning.url,
                    warning.type,
                    warning.riskLevel,
                    warning.details
                ]);
            });
        }

        // Convert to CSV string with proper escaping
        const csvContent = csvRows.map(row => 
            row.map(cell => {
                const cellStr = String(cell);
                if (cellStr.includes('"') || cellStr.includes(',') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',')
        ).join('\n');
        
        const reportName = `browseBuddy_report_${new Date().toISOString().split('T')[0]}.csv`;
        
        // Use base64 encoding directly
        const base64Content = btoa(unescape(encodeURIComponent(csvContent)));
        const dataUrl = `data:text/csv;base64,${base64Content}`;
        
        chrome.downloads.download({
            url: dataUrl,
            filename: reportName,
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('Download failed:', chrome.runtime.lastError);
                throw new Error('Failed to download report: ' + chrome.runtime.lastError.message);
            } else {
                console.log('Report downloaded:', downloadId);
            }
        });

        return { success: true, filename: reportName };
    }
}

let reportGenerator = new ReportGenerator();

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const url = sender.tab?.url || 'unknown';
    console.log('Received message:', request.type, 'from:', url);
    
    switch(request.type) {
        case 'PAGE_VISIT':
            console.log('Recording page visit for:', url);
            reportGenerator.addOrUpdateWebsiteVisit(url);
            sendResponse({ success: true });
            break;
            
        case 'UPDATE_SCREEN_TIME':
            if (request.data && typeof request.data.duration === 'number') {
                console.log('Updating screen time:', url, request.data.duration, 'ms');
                reportGenerator.updateScreenTime(url, request.data.duration);
                sendResponse({ success: true });
            } else {
                console.error('Invalid screen time data:', request.data);
                sendResponse({ success: false, error: 'Invalid duration' });
            }
            break;
            
        case 'ADD_CONTENT_ANALYSIS':
            console.log('Adding content analysis:', request.data);
            reportGenerator.addContentAnalysis(request.data.analysis, url);
            sendResponse({ success: true });
            break;
            
        case 'GENERATE_REPORT':
            try {
                console.log('Starting report generation...');
                const result = reportGenerator.generateCSVReport();
                console.log('Report generation completed');
                sendResponse({ 
                    success: true,
                    filename: `browseBuddy_report_${new Date().toISOString().split('T')[0]}.csv`
                });
            } catch (error) {
                console.error('Report generation failed:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message || 'Failed to generate report'
                });
            }
            break;

        default:
            console.warn('Unknown message type:', request.type);
            sendResponse({ success: false, error: 'Unknown message type' });
    }
    return true;  // Keep message channel open for async response
});

// Add listener for tab updates to track page visits
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab updated:', tab.url);
        reportGenerator.addOrUpdateWebsiteVisit(tab.url);
    }
});

// Add listener for tab activation to track active tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url) {
            console.log('Tab activated:', tab.url);
            reportGenerator.addOrUpdateWebsiteVisit(tab.url);
        }
    } catch (error) {
        console.error('Error handling tab activation:', error);
    }
});