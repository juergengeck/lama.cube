"use strict";
/**
 * Shared IPC type definitions for LAMA Electron
 * These types are used across main process, preload, and renderer
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPCError = exports.IPC_CHANNELS = void 0;
// ============================================================================
// IPC Channel Names (for type safety)
// ============================================================================
exports.IPC_CHANNELS = {
    // Auth
    'auth:login': 'auth:login',
    'auth:logout': 'auth:logout',
    'auth:status': 'auth:status',
    // Contacts
    'contacts:list': 'contacts:list',
    'contacts:add': 'contacts:add',
    'contacts:remove': 'contacts:remove',
    'contacts:update': 'contacts:update',
    // Chat
    'chat:listTopics': 'chat:listTopics',
    'chat:createTopic': 'chat:createTopic',
    'chat:sendMessage': 'chat:sendMessage',
    'chat:getMessages': 'chat:getMessages',
    'chat:newMessages': 'chat:newMessages',
    // AI
    'ai:chat': 'ai:chat',
    'ai:analyze': 'ai:analyze',
    'ai:extractKeywords': 'ai:extractKeywords',
    // Devices
    'devices:list': 'devices:list',
    'devices:register': 'devices:register',
    'devices:remove': 'devices:remove',
    // Export
    'export:conversation': 'export:conversation',
    'export:htmlWithMicrodata': 'export:htmlWithMicrodata',
    // System
    'app:clearData': 'app:clearData',
    'instance:info': 'instance:info',
    'connections:info': 'connections:info',
    'connections:status': 'connections:status',
};
// ============================================================================
// Error Types
// ============================================================================
var IPCError = /** @class */ (function (_super) {
    __extends(IPCError, _super);
    function IPCError(message, code, details) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.details = details;
        _this.name = 'IPCError';
        return _this;
    }
    return IPCError;
}(Error));
exports.IPCError = IPCError;
