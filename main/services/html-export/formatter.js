"use strict";
/**
 * HTML Formatter Service
 * Adds human-readable formatting to imploded microdata
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHTMLDocument = createHTMLDocument;
exports.addStyles = addStyles;
exports.formatMessage = formatMessage;
exports.createHeader = createHeader;
exports.escapeHTML = escapeHTML;
exports.addContentSecurityPolicy = addContentSecurityPolicy;
/**
 * Create a complete HTML5 document
 * @param {string} content - Body content
 * @param {string} title - Document title
 * @param {Object} options - Formatting options
 * @returns {string} - Complete HTML document
 */
function createHTMLDocument(content, title, options) {
    if (options === void 0) { options = {}; }
    var _a = options.theme, theme = _a === void 0 ? 'light' : _a;
    return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  ".concat(addContentSecurityPolicy(), "\n  <title>").concat(escapeHTML(title), "</title>\n  ").concat(addStyles(theme), "\n</head>\n<body>\n  ").concat(content, "\n</body>\n</html>");
}
/**
 * Add inline CSS styles for the specified theme
 * @param {string} theme - Theme name (light, dark, auto)
 * @returns {string} - Style tag with CSS
 */
function addStyles(theme) {
    var baseStyles = "\n    * {\n      box-sizing: border-box;\n    }\n\n    body {\n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n      line-height: 1.6;\n      margin: 0;\n      padding: 20px;\n      max-width: 800px;\n      margin: 0 auto;\n    }\n\n    .conversation-header {\n      border-bottom: 2px solid #eee;\n      padding-bottom: 20px;\n      margin-bottom: 30px;\n    }\n\n    .conversation-title {\n      font-size: 2em;\n      margin: 0 0 10px 0;\n      font-weight: 600;\n    }\n\n    .conversation-meta {\n      color: #666;\n      font-size: 0.9em;\n    }\n\n    .participants {\n      margin-top: 15px;\n    }\n\n    .participant {\n      display: inline-block;\n      margin-right: 15px;\n      padding: 5px 10px;\n      background: #f5f5f5;\n      border-radius: 15px;\n      font-size: 0.85em;\n    }\n\n    .message {\n      margin-bottom: 20px;\n      padding: 15px;\n      border-radius: 10px;\n      position: relative;\n    }\n\n    .message-bubble {\n      background: #fff;\n      border: 1px solid #ddd;\n      box-shadow: 0 1px 3px rgba(0,0,0,0.1);\n    }\n\n    .message-own {\n      background: #007bff;\n      color: white;\n      margin-left: 50px;\n    }\n\n    .message-other {\n      background: #f8f9fa;\n      margin-right: 50px;\n    }\n\n    .message-author {\n      font-weight: 600;\n      margin-bottom: 5px;\n      font-size: 0.9em;\n    }\n\n    .message-content {\n      margin: 10px 0;\n      word-wrap: break-word;\n    }\n\n    .message-timestamp {\n      font-size: 0.75em;\n      opacity: 0.7;\n      margin-top: 8px;\n    }\n\n    .message-hash {\n      font-family: monospace;\n      font-size: 0.7em;\n      opacity: 0.5;\n      margin-top: 5px;\n      word-break: break-all;\n    }\n\n    code {\n      background: rgba(0,0,0,0.1);\n      padding: 2px 4px;\n      border-radius: 3px;\n      font-family: 'Monaco', 'Consolas', monospace;\n    }\n\n    pre {\n      background: rgba(0,0,0,0.05);\n      padding: 15px;\n      border-radius: 5px;\n      overflow-x: auto;\n      border-left: 4px solid #007bff;\n    }\n\n    a {\n      color: #007bff;\n      text-decoration: none;\n    }\n\n    a:hover {\n      text-decoration: underline;\n    }\n\n    strong {\n      font-weight: 600;\n    }\n\n    em {\n      font-style: italic;\n    }\n  ";
    var themeStyles = theme === 'dark' ? "\n    body {\n      background-color: #1a1a1a;\n      color: #e0e0e0;\n    }\n\n    .conversation-header {\n      border-bottom-color: #333;\n    }\n\n    .conversation-meta {\n      color: #999;\n    }\n\n    .participant {\n      background: #333;\n      color: #fff;\n    }\n\n    .message-bubble {\n      background: #2d2d2d;\n      border-color: #444;\n      color: #e0e0e0;\n    }\n\n    .message-other {\n      background: #252525;\n    }\n\n    code {\n      background: rgba(255,255,255,0.1);\n    }\n\n    pre {\n      background: rgba(255,255,255,0.05);\n    }\n  " : '';
    return "<style>".concat(baseStyles).concat(themeStyles, "</style>");
}
/**
 * Format a message with proper styling and structure
 * @param {string} microdata - Message microdata
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted message HTML
 */
function formatMessage(microdata, options) {
    if (options === void 0) { options = {}; }
    var _a = options.isOwn, isOwn = _a === void 0 ? false : _a;
    // Wrap message in styled container
    var messageClass = "message message-bubble ".concat(isOwn ? 'message-own' : 'message-other');
    // Format timestamp if present
    var timestampFormatted = formatTimestamps(microdata);
    // Add hash display
    var withHashDisplay = addHashDisplay(timestampFormatted);
    return "<div class=\"".concat(messageClass, "\">").concat(withHashDisplay, "</div>");
}
/**
 * Create conversation header with metadata
 * @param {Object} metadata - Conversation metadata
 * @returns {string} - HTML header
 */
function createHeader(metadata) {
    var _a = metadata.title, title = _a === void 0 ? 'Conversation Export' : _a, topicId = metadata.topicId, _b = metadata.messageCount, messageCount = _b === void 0 ? 0 : _b, _c = metadata.participants, participants = _c === void 0 ? [] : _c, dateRange = metadata.dateRange, _d = metadata.exportDate, exportDate = _d === void 0 ? new Date().toISOString() : _d;
    var participantsList = participants.map(function (p) {
        return "<span class=\"participant\" itemscope itemtype=\"//refin.io/Person\">\n      <span itemprop=\"name\">".concat(escapeHTML(p.name), "</span>\n      ").concat(p.email ? "<span itemprop=\"email\" style=\"display:none;\">".concat(escapeHTML(p.email), "</span>") : '', "\n    </span>");
    }).join('');
    var dateRangeText = dateRange ?
        "".concat(formatDate(dateRange.start), " to ").concat(formatDate(dateRange.end)) :
        'All time';
    return "\n    <header class=\"conversation-header\" itemscope itemtype=\"//refin.io/ConversationExport\">\n      <h1 class=\"conversation-title\" itemprop=\"title\">".concat(escapeHTML(title), "</h1>\n      <div class=\"conversation-meta\">\n        <meta itemprop=\"topicId\" content=\"").concat(escapeHTML(topicId), "\">\n        <meta itemprop=\"messageCount\" content=\"").concat(messageCount, "\">\n        <meta itemprop=\"exportDate\" content=\"").concat(exportDate, "\">\n        <p><strong>Messages:</strong> ").concat(messageCount, "</p>\n        <p><strong>Period:</strong> <time itemprop=\"dateRange\">").concat(dateRangeText, "</time></p>\n        <p><strong>Exported:</strong> ").concat(formatDate(exportDate), "</p>\n      </div>\n      ").concat(participants.length > 0 ? "\n        <div class=\"participants\" itemprop=\"participants\">\n          <strong>Participants:</strong><br>\n          ".concat(participantsList, "\n        </div>\n      ") : '', "\n    </header>\n  ");
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
/**
 * Add Content Security Policy meta tag
 * @returns {string} - CSP meta tag
 */
function addContentSecurityPolicy() {
    return "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'; style-src 'unsafe-inline'; img-src data: 'self'; script-src 'none';\">";
}
/**
 * Format timestamps in microdata to human-readable format
 * @param {string} microdata - HTML with time elements
 * @returns {string} - Microdata with formatted timestamps
 */
function formatTimestamps(microdata) {
    return microdata.replace(/<time([^>]*itemprop="timestamp"[^>]*)>([^<]+)<\/time>/g, function (match, attributes, isoDate) {
        var humanDate = formatDate(isoDate);
        return "<time".concat(attributes, "><span class=\"message-timestamp\">").concat(humanDate, "</span></time>");
    });
}
/**
 * Add hash display to message
 * @param {string} microdata - Message microdata
 * @returns {string} - Microdata with hash display
 */
function addHashDisplay(microdata) {
    // Extract hash from data-hash attribute
    var hashMatch = String(microdata).match(/data-hash="([^"]+)"/);
    if (hashMatch) {
        var hash = hashMatch[1];
        var shortHash = String(hash).substring(0, 8) + '...';
        // Add hash display at the end
        var hashDisplay = "<div class=\"message-hash\" title=\"Message Hash: ".concat(hash, "\">Hash: ").concat(shortHash, "</div>");
        // Insert before the closing div
        return microdata.replace(/<\/div>$/, hashDisplay + '</div>');
    }
    return microdata;
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
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    catch (error) {
        return isoDate;
    }
}
exports.default = {
    createHTMLDocument: createHTMLDocument,
    addStyles: addStyles,
    formatMessage: formatMessage,
    createHeader: createHeader,
    escapeHTML: escapeHTML,
    addContentSecurityPolicy: addContentSecurityPolicy
};
