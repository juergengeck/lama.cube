"use strict";
/**
 * Central State Manager
 * Single source of truth for application state
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var StateManager = /** @class */ (function (_super) {
    __extends(StateManager, _super);
    function StateManager() {
        var _this = _super.call(this) || this;
        _this.state = {
            // User session
            user: {
                authenticated: false,
                id: null,
                name: null,
                email: null
            },
            // Conversations
            conversations: new Map(),
            activeConversationId: null,
            // Contacts
            contacts: new Map(),
            // Messages (indexed by conversation)
            messages: new Map(),
            // Application settings
            settings: {
                theme: 'dark',
                notifications: true,
                aiEnabled: true
            },
            // Connection status
            network: {
                connected: false,
                peers: [],
                syncStatus: 'idle'
            }
        };
        // State change listeners for specific paths
        _this.watchers = new Map();
        return _this;
    }
    // Get current state or a specific path
    StateManager.prototype.getState = function (path) {
        if (path === void 0) { path = null; }
        if (!path)
            return __assign({}, this.state);
        var parts = path.split('.');
        var current = this.state;
        for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
            var part = parts_1[_i];
            if (current[part] === undefined)
                return undefined;
            current = current[part];
        }
        return current;
    };
    // Update state and notify listeners
    StateManager.prototype.setState = function (path, value) {
        var parts = path.split('.');
        var lastPart = parts.pop();
        var current = this.state;
        for (var _i = 0, parts_2 = parts; _i < parts_2.length; _i++) {
            var part = parts_2[_i];
            if (!current[part])
                current[part] = {};
            current = current[part];
        }
        var oldValue = current[lastPart];
        current[lastPart] = value;
        // Emit change event
        this.emit('stateChanged', {
            path: path,
            oldValue: oldValue,
            newValue: value
        });
        // Notify specific watchers
        if (this.watchers.has(path)) {
            this.watchers.get(path).forEach(function (callback) {
                callback(value, oldValue);
            });
        }
        // Special handling for browser Person ID
        // Removed browserPersonId handling - browser has no ONE instance
    };
    // Watch for changes to a specific path
    StateManager.prototype.watch = function (path, callback) {
        var _this = this;
        if (!this.watchers.has(path)) {
            this.watchers.set(path, new Set());
        }
        this.watchers.get(path).add(callback);
        // Return unwatch function
        return function () {
            var watchers = _this.watchers.get(path);
            if (watchers) {
                watchers.delete(callback);
                if (watchers.size === 0) {
                    _this.watchers.delete(path);
                }
            }
        };
    };
    // User state management
    StateManager.prototype.setUser = function (user) {
        this.setState('user', {
            authenticated: true,
            id: user.id,
            name: user.name,
            email: user.email
        });
    };
    StateManager.prototype.clearUser = function () {
        this.setState('user', {
            authenticated: false,
            id: null,
            name: null,
            email: null
        });
    };
    // Conversation management
    StateManager.prototype.addConversation = function (conversation) {
        var conversations = new Map(this.state.conversations);
        conversations.set(conversation.id, conversation);
        this.setState('conversations', conversations);
    };
    StateManager.prototype.updateConversation = function (id, updates) {
        var conversations = new Map(this.state.conversations);
        var existing = conversations.get(id);
        if (existing && typeof existing === 'object') {
            conversations.set(id, __assign(__assign({}, existing), updates));
            this.setState('conversations', conversations);
        }
    };
    StateManager.prototype.setActiveConversation = function (id) {
        this.setState('activeConversationId', id);
    };
    // Message management
    StateManager.prototype.addMessage = function (conversationId, message) {
        var messages = new Map(this.state.messages);
        if (!messages.has(conversationId)) {
            messages.set(conversationId, []);
        }
        var existingMessages = messages.get(conversationId);
        if (!Array.isArray(existingMessages)) {
            messages.set(conversationId, [message]);
        }
        else {
            var conversationMessages = __spreadArray(__spreadArray([], existingMessages, true), [message], false);
            messages.set(conversationId, conversationMessages);
        }
        this.setState('messages', messages);
        // Also update conversation's last message
        this.updateConversation(conversationId, {
            lastMessage: message,
            lastMessageAt: new Date()
        });
    };
    StateManager.prototype.getMessages = function (conversationId) {
        return this.state.messages.get(conversationId) || [];
    };
    // Contact management
    StateManager.prototype.addContact = function (contact) {
        var contacts = new Map(this.state.contacts);
        contacts.set(contact.id, contact);
        this.setState('contacts', contacts);
    };
    StateManager.prototype.updateContact = function (id, updates) {
        var contacts = new Map(this.state.contacts);
        var existing = contacts.get(id);
        if (existing && typeof existing === 'object') {
            contacts.set(id, __assign(__assign({}, existing), updates));
            this.setState('contacts', contacts);
        }
    };
    // Network status
    StateManager.prototype.setNetworkStatus = function (status) {
        this.setState('network', __assign(__assign({}, this.state.network), status));
    };
    // Get serializable state for IPC
    StateManager.prototype.toJSON = function () {
        return __assign(__assign({}, this.state), { conversations: Array.from(this.state.conversations.entries()), contacts: Array.from(this.state.contacts.entries()), messages: Array.from(this.state.messages.entries()) });
    };
    // Clear all state (for app reset)
    StateManager.prototype.clearState = function () {
        // Clear EVERYTHING - don't leave any stale keys like browserInvite
        this.state = {
            user: {
                authenticated: false,
                id: null,
                name: null,
                email: null
            },
            conversations: new Map(),
            activeConversationId: null,
            contacts: new Map(),
            messages: new Map(),
            settings: {
                theme: 'dark',
                notifications: true,
                aiEnabled: true
            },
            network: {
                connected: false,
                peers: [],
                syncStatus: 'idle'
            }
        };
        // Don't need to delete specific keys - we replaced the entire state object above
        // Emit state cleared event
        this.emit('stateCleared');
    };
    return StateManager;
}(events_1.EventEmitter));
exports.default = new StateManager();
