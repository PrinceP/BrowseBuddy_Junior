// content.js
let analyzer = null;
let isInitialized = false;
let initializationPromise = null;
let monitor = null;
let monitoringInterval = null;
let pageStartTime = Date.now();
let lastUpdateTime = Date.now();

async function initializeAnalyzer() {
    if (initializationPromise) {
        return initializationPromise;
    }

    if (isInitialized && analyzer) {
        console.log('Analyzer already initialized');
        return true;
    }

    initializationPromise = (async () => {
        try {
            console.log('Initializing AI analyzer...');
            analyzer = await ai.languageModel.create({
                systemPrompt: `You are an AI content moderator. Analyze content for:
                    1. Harmful content
                    2. Cyberbullying
                    3. Inappropriate language
                    4. Personal information exposure
                    Respond with small analysis including type and risk level.`
            });
            isInitialized = true;
            console.log('AI analyzer initialized successfully');
            console.log('Initial token status:', {
                max: analyzer.maxTokens,
                used: analyzer.tokensSoFar,
                left: analyzer.tokensLeft
            });
            return true;
        } catch (error) {
            console.error('Failed to initialize AI analyzer:', error);
            isInitialized = false;
            analyzer = null;
            throw error;
        } finally {
            initializationPromise = null;
        }
    })();

    return initializationPromise;
}

async function checkAndRefreshAnalyzer() {
    try {
        if (!analyzer) {
            console.log('No analyzer session exists, creating new one');
            return await initializeAnalyzer();
        }

        // Check token usage
        const tokensUsed = analyzer.tokensSoFar || 0;
        const maxTokens = analyzer.maxTokens || 6144;
        const tokensLeft = analyzer.tokensLeft || 0;

        console.log('Token status:', {
            used: tokensUsed,
            max: maxTokens,
            left: tokensLeft
        });

        // If we've used more than 80% of tokens, refresh the session
        if (tokensLeft < (maxTokens * 0.2)) {
            console.log('Token limit approaching, refreshing analyzer session');
            await analyzer.destroy();
            analyzer = null;
            isInitialized = false;
            return await initializeAnalyzer();
        }

        return true;
    } catch (error) {
        console.error('Error checking/refreshing analyzer:', error);
        return false;
    }
}

async function analyzeContent(text) {
    try {
        // Check and refresh analyzer if needed
        await checkAndRefreshAnalyzer();
        
        if (!analyzer) {
            throw new Error('Analyzer not initialized');
        }

        const estimatedTokens = Math.ceil(text.length / 4);
        const maxTokens = analyzer.maxTokens || 6144;
        const safeTokenLimit = Math.floor(maxTokens * 0.5);

        let processedText = text;
        if (estimatedTokens > safeTokenLimit) {
            const safeCharLimit = safeTokenLimit * 4;
            processedText = text.substring(0, safeCharLimit) + '...';
            console.log(`Text truncated from ${text.length} to ${safeCharLimit} characters`);
        }

        console.log(`Processing text (${processedText.length} chars, ~${estimatedTokens} tokens)`);
        console.log('Current token status:', {
            used: analyzer.tokensSoFar,
            max: analyzer.maxTokens,
            left: analyzer.tokensLeft
        });

        const result = await analyzer.prompt(processedText);
        
        const analysis = {
            harmfulContent: result.toLowerCase().includes('harmful') || 
                          result.toLowerCase().includes('inappropriate'),
            type: result.toLowerCase().includes('cyberbullying') ? 'cyberbullying' : 'harmful-content',
            details: result,
            riskLevel: result.toLowerCase().includes('high') ? 'high' : 'low'
        };

        // Send analysis to background script
        await chrome.runtime.sendMessage({
            type: 'ADD_CONTENT_ANALYSIS',
            data: { analysis }
        });

        // Increase cooldown after successful analysis
        this.lastAnalysis = Date.now() + 30000; // Wait 30 seconds before next analysis

        return {
            success: true,
            analysis: analysis
        };
    } catch (error) {
        console.error('Analysis failed:', error);
        
        // If error is related to token limit, try to refresh the session
        if (error.message.includes('token') || error.message.includes('limit')) {
            console.log('Token-related error detected, attempting to refresh session');
            await analyzer?.destroy();
            analyzer = null;
            isInitialized = false;
            await initializeAnalyzer();
        }
        
        return { 
            success: false, 
            error: error.message 
        };
    }
}

class ContentMonitor {
    constructor() {
        this.lastAnalysis = 0;
        this.analysisCooldown = 30000; // 30 seconds cooldown
        this.isValid = true;
        this.hasAnalyzed = false; // New flag to track if analysis has been done
    }

    getVisibleText() {
        // Get only headlines and important text
        const importantElements = [
            ...document.querySelectorAll('h1, h2, h3, h4, title'),
            ...document.querySelectorAll('meta[name="description"]'),
            ...document.querySelectorAll('meta[property="og:title"]'),
            ...document.querySelectorAll('meta[property="og:description"]')
        ];

        let text = '';

        // Process each element
        importantElements.forEach(element => {
            if (element.tagName.toLowerCase() === 'meta') {
                text += element.getAttribute('content') + '. ';
            } else {
                const style = window.getComputedStyle(element);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                    text += element.textContent + '. ';
                }
            }
        });

        // Clean up the text
        text = text
            .replace(/\s+/g, ' ')
            .replace(/\. \./g, '.')
            .trim();

        console.log('Extracted headlines:', text.substring(0, 100) + '...');
        return text;
    }

    async monitorWebpage() {
        if (!this.isValid || this.hasAnalyzed) return; // Stop if already analyzed

        try {
            if (!chrome.runtime) {
                this.isValid = false;
                throw new Error('Extension context invalidated');
            }

            const now = Date.now();
            if (now - this.lastAnalysis > this.analysisCooldown) {
                const headlineText = this.getVisibleText();
                if (headlineText.length > 0) {
                    const result = await analyzeContent(headlineText);
                    if (result.success) {
                        console.log('Content analysis result:', result.analysis);
                        this.lastAnalysis = now;
                        this.hasAnalyzed = true; // Mark as analyzed
                        
                        // Stop the monitoring interval after successful analysis
                        if (monitoringInterval) {
                            console.log('Analysis complete, stopping monitoring');
                            clearInterval(monitoringInterval);
                            monitoringInterval = null;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in monitorWebpage:', error);
            if (error.message.includes('Extension context invalidated')) {
                this.stopMonitoring();
            }
        }
    }

    stopMonitoring() {
        this.isValid = false;
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
        }
    }

    // Reset monitoring (if needed for new page loads)
    resetMonitoring() {
        this.hasAnalyzed = false;
        this.lastAnalysis = 0;
        this.isValid = true;
    }
}

function updateScreenTime() {
    const now = Date.now();
    const duration = now - lastUpdateTime;
    lastUpdateTime = now;
    
    chrome.runtime.sendMessage({
        type: 'UPDATE_SCREEN_TIME',
        data: { duration }
    });
}

// Start monitoring when the content script loads
async function startMonitoring() {
    try {
        if (!chrome.runtime) {
            throw new Error('Extension context invalidated');
        }

        const initialized = await initializeAnalyzer();
        if (!initialized) {
            console.error('Failed to initialize analyzer');
            return;
        }

        console.log('Analyzer initialized successfully, starting monitor...');
        monitor = new ContentMonitor();
        
        // Only start monitoring if not already analyzed
        if (!monitor.hasAnalyzed) {
            monitoringInterval = setInterval(() => {
                if (document.visibilityState === 'visible' && monitor.isValid) {
                    monitor.monitorWebpage();
                }
            }, 5000);

            // Clean up when the page unloads
            window.addEventListener('unload', () => {
                if (monitor) {
                    monitor.stopMonitoring();
                }
            });
            
            // Clean up when visibility changes to hidden
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden' && monitor) {
                    monitor.stopMonitoring();
                }
            });
        }
    } catch (error) {
        console.error('Error starting monitoring:', error);
    }
}

startMonitoring();
