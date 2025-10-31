"use strict";
/**
 * HTML Template Service
 * Provides HTML boilerplate and structure templates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCompleteHTML = generateCompleteHTML;
/**
 * Generate complete HTML document with all components
 * @param {Object} data - Export data
 * @returns {string} - Complete HTML document
 */
function generateCompleteHTML(data) {
    var metadata = data.metadata, messages = data.messages, _a = data.options, options = _a === void 0 ? {} : _a;
    var _b = options.theme, theme = _b === void 0 ? 'light' : _b;
    return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  ".concat(getContentSecurityPolicy(), "\n  <title>").concat(escapeHTML(metadata.title || 'LAMA Conversation Export'), "</title>\n  ").concat(getStyles(theme), "\n</head>\n<body>\n  ").concat(generateHeader(metadata), "\n  <main class=\"conversation-content\">\n    ").concat(messages.join('\n'), "\n  </main>\n  ").concat(generateFooter(metadata), "\n  ").concat(getVerificationScript(), "\n</body>\n</html>");
}
/**
 * Generate conversation header
 * @param {Object} metadata - Conversation metadata
 * @returns {string} - Header HTML
 */
function generateHeader(metadata) {
    var _a = metadata.title, title = _a === void 0 ? 'Conversation Export' : _a, topicId = metadata.topicId, _b = metadata.messageCount, messageCount = _b === void 0 ? 0 : _b, _c = metadata.participants, participants = _c === void 0 ? [] : _c, dateRange = metadata.dateRange, _d = metadata.exportDate, exportDate = _d === void 0 ? new Date().toISOString() : _d;
    var participantsList = participants.map(function (participant) { return "\n    <div class=\"participant\" itemscope itemtype=\"//refin.io/Person\">\n      <span itemprop=\"name\">".concat(escapeHTML(participant.name), "</span>\n      <span itemprop=\"email\" class=\"participant-email\">").concat(escapeHTML(participant.email), "</span>\n      ").concat(participant.personHash ? "<meta itemprop=\"personHash\" content=\"".concat(participant.personHash, "\">") : '', "\n    </div>\n  "); }).join('');
    var dateRangeText = dateRange ?
        "".concat(formatDate(dateRange.start), " - ").concat(formatDate(dateRange.end)) :
        'All messages';
    return "\n    <header class=\"conversation-header\" itemscope itemtype=\"//refin.io/ConversationExport\">\n      <div class=\"header-main\">\n        <h1 class=\"conversation-title\" itemprop=\"title\">".concat(escapeHTML(title), "</h1>\n        <div class=\"conversation-meta\">\n          <meta itemprop=\"topicId\" content=\"").concat(escapeHTML(topicId), "\">\n          <meta itemprop=\"messageCount\" content=\"").concat(messageCount, "\">\n          <meta itemprop=\"exportDate\" content=\"").concat(exportDate, "\">\n\n          <div class=\"meta-item\">\n            <span class=\"meta-label\">Messages:</span>\n            <span class=\"meta-value\">").concat(messageCount, "</span>\n          </div>\n\n          <div class=\"meta-item\">\n            <span class=\"meta-label\">Period:</span>\n            <time class=\"meta-value\" itemprop=\"dateRange\">").concat(dateRangeText, "</time>\n          </div>\n\n          <div class=\"meta-item\">\n            <span class=\"meta-label\">Exported:</span>\n            <time class=\"meta-value\">").concat(formatDate(exportDate), "</time>\n          </div>\n        </div>\n      </div>\n\n      ").concat(participants.length > 0 ? "\n        <div class=\"participants-section\" itemprop=\"participants\">\n          <h2 class=\"participants-title\">Participants</h2>\n          <div class=\"participants-list\">\n            ".concat(participantsList, "\n          </div>\n        </div>\n      ") : '', "\n    </header>\n  ");
}
/**
 * Generate footer with export information
 * @param {Object} metadata - Export metadata
 * @returns {string} - Footer HTML
 */
function generateFooter(metadata) {
    return "\n    <footer class=\"conversation-footer\">\n      <div class=\"export-info\">\n        <p class=\"export-notice\">\n          This conversation was exported from LAMA on ".concat(formatDate(metadata.exportDate || new Date().toISOString()), ".\n          All messages include cryptographic hashes for integrity verification.\n        </p>\n        <div class=\"verification-info\">\n          <details>\n            <summary>Verification Information</summary>\n            <div class=\"verification-details\">\n              <p><strong>Message Hashes:</strong> Each message includes a SHA-256 hash in the <code>data-hash</code> attribute.</p>\n              <p><strong>Signatures:</strong> Signed messages include cryptographic signatures in the <code>data-signature</code> attribute.</p>\n              <p><strong>Microdata:</strong> All data is embedded using HTML5 microdata format for machine readability.</p>\n              <p><strong>Integrity:</strong> You can verify message integrity by recalculating hashes from the source content.</p>\n            </div>\n          </details>\n        </div>\n      </div>\n    </footer>\n  ");
}
/**
 * Get Content Security Policy meta tag
 * @returns {string} - CSP meta tag
 */
function getContentSecurityPolicy() {
    return "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'; style-src 'unsafe-inline'; img-src data: 'self'; script-src 'unsafe-inline'; connect-src 'none';\">";
}
/**
 * Get CSS styles for the document
 * @param {string} theme - Theme name
 * @returns {string} - Style tag with CSS
 */
function getStyles(theme) {
    var baseStyles = "\n    :root {\n      --primary-color: #007bff;\n      --secondary-color: #6c757d;\n      --success-color: #28a745;\n      --danger-color: #dc3545;\n      --warning-color: #ffc107;\n      --info-color: #17a2b8;\n      --light-color: #f8f9fa;\n      --dark-color: #343a40;\n    }\n\n    * {\n      box-sizing: border-box;\n    }\n\n    body {\n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;\n      line-height: 1.6;\n      margin: 0;\n      padding: 0;\n      background-color: #f5f5f5;\n      color: #333;\n    }\n\n    .conversation-header {\n      background: white;\n      border-bottom: 3px solid var(--primary-color);\n      padding: 30px;\n      margin-bottom: 20px;\n      box-shadow: 0 2px 10px rgba(0,0,0,0.1);\n    }\n\n    .header-main {\n      max-width: 800px;\n      margin: 0 auto;\n    }\n\n    .conversation-title {\n      font-size: 2.5em;\n      margin: 0 0 20px 0;\n      font-weight: 700;\n      color: var(--primary-color);\n    }\n\n    .conversation-meta {\n      display: grid;\n      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n      gap: 15px;\n      margin-bottom: 25px;\n    }\n\n    .meta-item {\n      display: flex;\n      flex-direction: column;\n    }\n\n    .meta-label {\n      font-weight: 600;\n      color: var(--secondary-color);\n      font-size: 0.9em;\n      text-transform: uppercase;\n      letter-spacing: 0.5px;\n    }\n\n    .meta-value {\n      font-size: 1.1em;\n      margin-top: 5px;\n    }\n\n    .participants-section {\n      border-top: 1px solid #eee;\n      padding-top: 25px;\n    }\n\n    .participants-title {\n      font-size: 1.3em;\n      margin: 0 0 15px 0;\n      color: var(--secondary-color);\n    }\n\n    .participants-list {\n      display: flex;\n      flex-wrap: wrap;\n      gap: 10px;\n    }\n\n    .participant {\n      background: var(--light-color);\n      border: 1px solid #dee2e6;\n      border-radius: 20px;\n      padding: 8px 15px;\n      font-size: 0.9em;\n    }\n\n    .participant-email {\n      color: var(--secondary-color);\n      margin-left: 8px;\n      font-size: 0.85em;\n    }\n\n    .conversation-content {\n      max-width: 800px;\n      margin: 0 auto;\n      padding: 0 20px;\n    }\n\n    .message {\n      margin-bottom: 25px;\n      padding: 20px;\n      border-radius: 12px;\n      background: white;\n      box-shadow: 0 2px 8px rgba(0,0,0,0.08);\n      border-left: 4px solid #e9ecef;\n    }\n\n    .message[data-own=\"true\"] {\n      border-left-color: var(--primary-color);\n      background: #f8f9ff;\n    }\n\n    .message-author {\n      font-weight: 600;\n      color: var(--primary-color);\n      margin-bottom: 8px;\n      font-size: 0.95em;\n    }\n\n    .message-content {\n      margin: 12px 0;\n      word-wrap: break-word;\n      line-height: 1.7;\n    }\n\n    .message-timestamp {\n      font-size: 0.8em;\n      color: var(--secondary-color);\n      margin-top: 12px;\n    }\n\n    .message-hash {\n      font-family: 'Monaco', 'Consolas', 'Courier New', monospace;\n      font-size: 0.7em;\n      color: #999;\n      margin-top: 8px;\n      padding: 5px 8px;\n      background: #f8f9fa;\n      border-radius: 4px;\n      border: 1px solid #e9ecef;\n      cursor: help;\n    }\n\n    code {\n      background: rgba(0,0,0,0.05);\n      padding: 2px 6px;\n      border-radius: 4px;\n      font-family: 'Monaco', 'Consolas', 'Courier New', monospace;\n      font-size: 0.9em;\n    }\n\n    pre {\n      background: #f8f9fa;\n      padding: 20px;\n      border-radius: 8px;\n      overflow-x: auto;\n      border: 1px solid #e9ecef;\n      margin: 15px 0;\n    }\n\n    pre code {\n      background: none;\n      padding: 0;\n    }\n\n    a {\n      color: var(--primary-color);\n      text-decoration: none;\n    }\n\n    a:hover {\n      text-decoration: underline;\n    }\n\n    strong {\n      font-weight: 600;\n    }\n\n    em {\n      font-style: italic;\n    }\n\n    blockquote {\n      border-left: 4px solid var(--secondary-color);\n      margin: 15px 0;\n      padding: 10px 20px;\n      background: #f8f9fa;\n      font-style: italic;\n    }\n\n    .conversation-footer {\n      margin-top: 50px;\n      background: white;\n      border-top: 1px solid #dee2e6;\n      padding: 30px;\n      text-align: center;\n    }\n\n    .export-info {\n      max-width: 600px;\n      margin: 0 auto;\n    }\n\n    .export-notice {\n      font-size: 0.9em;\n      color: var(--secondary-color);\n      margin-bottom: 20px;\n    }\n\n    .verification-info details {\n      text-align: left;\n      background: #f8f9fa;\n      border: 1px solid #dee2e6;\n      border-radius: 8px;\n      padding: 15px;\n    }\n\n    .verification-info summary {\n      font-weight: 600;\n      cursor: pointer;\n      margin-bottom: 10px;\n    }\n\n    .verification-details p {\n      margin: 10px 0;\n      font-size: 0.9em;\n    }\n\n    @media (max-width: 768px) {\n      .conversation-header {\n        padding: 20px;\n      }\n\n      .conversation-title {\n        font-size: 2em;\n      }\n\n      .conversation-meta {\n        grid-template-columns: 1fr;\n      }\n\n      .participants-list {\n        flex-direction: column;\n      }\n\n      .conversation-content {\n        padding: 0 15px;\n      }\n\n      .message {\n        padding: 15px;\n      }\n    }\n\n    @media print {\n      body {\n        background: white;\n      }\n\n      .conversation-header {\n        box-shadow: none;\n        border-bottom: 2px solid #333;\n      }\n\n      .message {\n        box-shadow: none;\n        border: 1px solid #ddd;\n        break-inside: avoid;\n      }\n\n      .verification-info {\n        display: none;\n      }\n    }\n  ";
    var darkTheme = theme === 'dark' ? "\n    body {\n      background-color: #1a1a1a;\n      color: #e0e0e0;\n    }\n\n    .conversation-header {\n      background: #2d2d2d;\n      border-bottom-color: #0d6efd;\n    }\n\n    .conversation-title {\n      color: #0d6efd;\n    }\n\n    .meta-label {\n      color: #adb5bd;\n    }\n\n    .participant {\n      background: #343a40;\n      border-color: #495057;\n      color: #fff;\n    }\n\n    .participant-email {\n      color: #adb5bd;\n    }\n\n    .message {\n      background: #2d2d2d;\n      border-left-color: #495057;\n    }\n\n    .message[data-own=\"true\"] {\n      background: #1e2a3a;\n      border-left-color: #0d6efd;\n    }\n\n    .message-author {\n      color: #0d6efd;\n    }\n\n    .message-timestamp {\n      color: #adb5bd;\n    }\n\n    .message-hash {\n      background: #343a40;\n      border-color: #495057;\n      color: #adb5bd;\n    }\n\n    code {\n      background: rgba(255,255,255,0.1);\n    }\n\n    pre {\n      background: #343a40;\n      border-color: #495057;\n    }\n\n    blockquote {\n      background: #343a40;\n      border-left-color: #adb5bd;\n    }\n\n    .conversation-footer {\n      background: #2d2d2d;\n      border-top-color: #495057;\n    }\n\n    .export-notice {\n      color: #adb5bd;\n    }\n\n    .verification-info details {\n      background: #343a40;\n      border-color: #495057;\n    }\n  " : '';
    return "<style>".concat(baseStyles).concat(darkTheme, "</style>");
}
/**
 * Get verification script (optional JavaScript for hash verification)
 * @returns {string} - Script tag with verification code
 */
function getVerificationScript() {
    return "\n    <script>\n      // Optional client-side hash verification\n      function verifyMessageHashes(): any {\n        const messages = document.querySelectorAll('[data-hash]');\n        console.log('Found', messages.length, 'messages with hashes');\n\n        messages.forEach((message, index) => {\n          const hash = message.getAttribute('data-hash');\n          const shortHash = hash ? String(hash).substring(0, 8) + '...' : 'N/A';\n          console.log(`Message ${index + 1}: ${shortHash}`);\n        });\n      }\n\n      // Auto-run verification on load\n      document.addEventListener('DOMContentLoaded', verifyMessageHashes);\n    </script>\n  ";
}
/**
 * Format date to human-readable string
 * @param {string} isoDate - ISO date string
 * @returns {string} - Formatted date
 */
function formatDate(isoDate) {
    try {
        var date = new Date(isoDate);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    catch (error) {
        return isoDate;
    }
}
/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHTML(text) {
    if (typeof text !== 'string') {
        return '';
    }
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
exports.default = {
    generateCompleteHTML: generateCompleteHTML
};
