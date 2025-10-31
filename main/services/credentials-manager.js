"use strict";
/**
 * Verifiable Credentials Manager
 * Handles creation, validation, and management of verifiable credentials
 * for peer-to-peer settings authorization
 */
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = require("crypto");
var node_one_core_js_1 = require("../core/node-one-core.js");
var CredentialsManager = /** @class */ (function () {
    function CredentialsManager() {
        this.trustedCredentials = new Map();
        this.ownCredentials = new Map();
        this.authorityLevels = {
            'settings.connections': 'DEVICE_ADMIN',
            'settings.network': 'DEVICE_ADMIN',
            'settings.appearance': 'USER',
            'settings.notifications': 'USER',
            'settings.security': 'OWNER',
            'settings.credentials': 'OWNER'
        };
    }
    /**
     * Create a verifiable credential for settings authorization
     */
    CredentialsManager.prototype.createSettingsCredential = function (subject_1, authority_1, settingsScope_1) {
        return __awaiter(this, arguments, void 0, function (subject, authority, settingsScope, expiryHours) {
            var issuanceDate, expirationDate, credential, signature;
            if (expiryHours === void 0) { expiryHours = 24; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        issuanceDate = new Date();
                        expirationDate = new Date(issuanceDate.getTime() + (expiryHours * 60 * 60 * 1000));
                        credential = {
                            '@context': [
                                'https://www.w3.org/2018/credentials/v1',
                                'https://lama.one/credentials/v1'
                            ],
                            id: "urn:uuid:".concat(crypto_1.default.randomUUID()),
                            type: ['VerifiableCredential', 'LAMASettingsCredential'],
                            issuer: this.getOwnInstanceId(),
                            issuanceDate: issuanceDate.toISOString(),
                            expirationDate: expirationDate.toISOString(),
                            credentialSubject: {
                                id: subject.instanceId,
                                name: subject.name,
                                platform: subject.platform,
                                authority: authority,
                                permissions: {
                                    scope: settingsScope, // e.g., ['settings.connections', 'settings.network']
                                    actions: this.getPermittedActions(authority, settingsScope)
                                }
                            },
                            proof: null // Will be added by signing
                        };
                        return [4 /*yield*/, this.signCredential(credential)];
                    case 1:
                        signature = _a.sent();
                        credential.proof = {
                            type: 'Ed25519Signature2020',
                            created: issuanceDate.toISOString(),
                            proofPurpose: 'assertionMethod',
                            verificationMethod: "".concat(this.getOwnInstanceId(), "#key-1"),
                            signature: signature
                        };
                        // Store our own credential
                        this.ownCredentials.set(credential.id, credential);
                        console.log("[CredentialsManager] Created settings credential for ".concat(subject.name, " with ").concat(authority, " authority"));
                        return [2 /*return*/, credential];
                }
            });
        });
    };
    /**
     * Validate a verifiable credential for settings operations
     */
    CredentialsManager.prototype.validateCredential = function (credential, requestedAction, settingsKey) {
        return __awaiter(this, void 0, void 0, function () {
            var now, expiry, signatureValid, requiredAuthority, credentialAuthority, permissions, issuerTrusted, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // Basic structure validation
                        if (!credential || !credential.credentialSubject || !credential.proof) {
                            return [2 /*return*/, { valid: false, reason: 'Invalid credential structure' }];
                        }
                        now = new Date();
                        expiry = new Date(credential.expirationDate);
                        if (expiry < now) {
                            return [2 /*return*/, { valid: false, reason: 'Credential expired' }];
                        }
                        return [4 /*yield*/, this.verifyCredentialSignature(credential)];
                    case 1:
                        signatureValid = _a.sent();
                        if (!signatureValid) {
                            return [2 /*return*/, { valid: false, reason: 'Invalid signature' }];
                        }
                        requiredAuthority = this.authorityLevels[settingsKey];
                        credentialAuthority = credential.credentialSubject.authority;
                        if (!this.hasRequiredAuthority(credentialAuthority, requiredAuthority)) {
                            return [2 /*return*/, {
                                    valid: false,
                                    reason: "Insufficient authority: ".concat(credentialAuthority, " < ").concat(requiredAuthority)
                                }];
                        }
                        permissions = credential.credentialSubject.permissions;
                        if (!permissions.scope.includes(settingsKey)) {
                            return [2 /*return*/, { valid: false, reason: 'Setting not in credential scope' }];
                        }
                        if (!permissions.actions.includes(requestedAction)) {
                            return [2 /*return*/, { valid: false, reason: 'Action not permitted by credential' }];
                        }
                        issuerTrusted = this.isTrustedIssuer(credential.issuer);
                        if (!issuerTrusted) {
                            return [2 /*return*/, { valid: false, reason: 'Untrusted credential issuer' }];
                        }
                        return [2 /*return*/, {
                                valid: true,
                                subject: credential.credentialSubject,
                                authority: credentialAuthority
                            }];
                    case 2:
                        error_1 = _a.sent();
                        console.error('[CredentialsManager] Error validating credential:', error_1);
                        return [2 /*return*/, { valid: false, reason: 'Validation error' }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Add a trusted credential issuer
     */
    CredentialsManager.prototype.addTrustedIssuer = function (instanceId, publicKey, trustLevel) {
        if (trustLevel === void 0) { trustLevel = 'DEVICE_ADMIN'; }
        this.trustedCredentials.set(instanceId, {
            publicKey: publicKey,
            trustLevel: trustLevel,
            addedAt: new Date().toISOString()
        });
        console.log("[CredentialsManager] Added trusted issuer: ".concat(instanceId, " with ").concat(trustLevel, " trust"));
    };
    /**
     * Check if an issuer is trusted
     */
    CredentialsManager.prototype.isTrustedIssuer = function (instanceId) {
        // Always trust ourselves
        if (instanceId === this.getOwnInstanceId()) {
            return true;
        }
        // Check trusted issuers list
        return this.trustedCredentials.has(instanceId);
    };
    /**
     * Get permitted actions for authority level and scope
     */
    CredentialsManager.prototype.getPermittedActions = function (authority, settingsScope) {
        var actions = new Set();
        // All authorities can read
        actions.add('read');
        actions.add('subscribe');
        // USER and above can modify user settings
        if (this.hasRequiredAuthority(authority, 'USER')) {
            if (settingsScope.some(function (s) { return s.startsWith('settings.appearance') || s.startsWith('settings.notifications'); })) {
                actions.add('write');
                actions.add('update');
            }
        }
        // DEVICE_ADMIN and above can modify device settings
        if (this.hasRequiredAuthority(authority, 'DEVICE_ADMIN')) {
            if (settingsScope.some(function (s) { return s.startsWith('settings.connections') || s.startsWith('settings.network'); })) {
                actions.add('write');
                actions.add('update');
                actions.add('sync');
            }
        }
        // OWNER can modify any settings
        if (this.hasRequiredAuthority(authority, 'OWNER')) {
            actions.add('write');
            actions.add('update');
            actions.add('delete');
            actions.add('sync');
            actions.add('manage_credentials');
        }
        return Array.from(actions);
    };
    /**
     * Check if authority level is sufficient
     */
    CredentialsManager.prototype.hasRequiredAuthority = function (currentAuthority, requiredAuthority) {
        var authorityHierarchy = {
            'USER': 1,
            'DEVICE_ADMIN': 2,
            'OWNER': 3
        };
        var currentLevel = authorityHierarchy[currentAuthority] || 0;
        var requiredLevel = authorityHierarchy[requiredAuthority] || 0;
        return currentLevel >= requiredLevel;
    };
    /**
     * Sign a credential (simplified - in production use proper cryptographic signing)
     */
    CredentialsManager.prototype.signCredential = function (credential) {
        return __awaiter(this, void 0, void 0, function () {
            var credentialContent, hash, instanceId, signature;
            return __generator(this, function (_a) {
                credentialContent = JSON.stringify(__assign(__assign({}, credential), { proof: undefined // Exclude proof from signing
                 }));
                hash = crypto_1.default.createHash('sha256').update(credentialContent).digest('hex');
                instanceId = this.getOwnInstanceId();
                signature = crypto_1.default
                    .createHmac('sha256', instanceId)
                    .update(hash)
                    .digest('hex');
                return [2 /*return*/, signature];
            });
        });
    };
    /**
     * Verify credential signature
     */
    CredentialsManager.prototype.verifyCredentialSignature = function (credential) {
        return __awaiter(this, void 0, void 0, function () {
            var credentialContent, hash, expectedSignature;
            return __generator(this, function (_a) {
                try {
                    credentialContent = JSON.stringify(__assign(__assign({}, credential), { proof: undefined }));
                    hash = crypto_1.default.createHash('sha256').update(credentialContent).digest('hex');
                    expectedSignature = crypto_1.default
                        .createHmac('sha256', credential.issuer)
                        .update(hash)
                        .digest('hex');
                    return [2 /*return*/, expectedSignature === credential.proof.signature];
                }
                catch (error) {
                    console.error('[CredentialsManager] Signature verification failed:', error);
                    return [2 /*return*/, false];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get our own instance ID (placeholder - should get from NodeOneCore)
     */
    CredentialsManager.prototype.getOwnInstanceId = function () {
        return node_one_core_js_1.default.ownerId || 'unknown-instance';
    };
    /**
     * Create bootstrap credentials for initial trust establishment
     */
    CredentialsManager.prototype.createBootstrapCredentials = function () {
        return __awaiter(this, void 0, void 0, function () {
            var ownInstanceId, ownerCredential;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ownInstanceId = this.getOwnInstanceId();
                        return [4 /*yield*/, this.createSettingsCredential({
                                instanceId: ownInstanceId,
                                name: 'Owner Instance',
                                platform: 'nodejs'
                            }, 'OWNER', Object.keys(this.authorityLevels), 24 * 30 // 30 days
                            )
                            // Trust ourselves as owner
                        ];
                    case 1:
                        ownerCredential = _a.sent();
                        // Trust ourselves as owner
                        this.addTrustedIssuer(ownInstanceId, 'self-signed', 'OWNER');
                        console.log('[CredentialsManager] Bootstrap credentials created');
                        return [2 /*return*/, ownerCredential];
                }
            });
        });
    };
    /**
     * Get all stored credentials
     */
    CredentialsManager.prototype.getAllCredentials = function () {
        return {
            own: Array.from(this.ownCredentials.values()),
            trusted: Array.from(this.trustedCredentials.entries()).map(function (_a) {
                var id = _a[0], data = _a[1];
                return (__assign({ instanceId: id }, data));
            })
        };
    };
    return CredentialsManager;
}());
// Singleton
exports.default = new CredentialsManager();
