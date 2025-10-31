"use strict";
/**
 * Pairing Trust Handler
 *
 * Handles trust establishment and profile sharing after successful pairing.
 * Based on one.leute's LeuteAccessRightsManager.trustPairingKeys implementation.
 */
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
exports.trustPairingKeys = trustPairingKeys;
exports.shareMainProfileWithPeer = shareMainProfileWithPeer;
exports.completePairingTrust = completePairingTrust;
var reverse_map_query_js_1 = require("@refinio/one.core/lib/reverse-map-query.js");
var storage_unversioned_objects_js_1 = require("@refinio/one.core/lib/storage-unversioned-objects.js");
var ProfileModel_js_1 = require("@refinio/one.models/lib/models/Leute/ProfileModel.js");
var access_js_1 = require("@refinio/one.core/lib/access.js");
var storage_base_common_js_1 = require("@refinio/one.core/lib/storage-base-common.js");
var promise_js_1 = require("@refinio/one.core/lib/util/promise.js");
/**
 * Trust the keys of a newly paired remote peer.
 * This is critical for enabling secure communication.
 *
 * @param {Object} trust - The TrustedKeysManager instance
 * @param {boolean} initiatedLocally - Whether pairing was initiated by us
 * @param {string} localPersonId - Our person ID
 * @param {string} localInstanceId - Our instance ID
 * @param {string} remotePersonId - Remote person ID
 * @param {string} remoteInstanceId - Remote instance ID
 * @param {string} token - Pairing token
 */
function trustPairingKeys(trust, initiatedLocally, localPersonId, localInstanceId, remotePersonId, remoteInstanceId, token) {
    return __awaiter(this, void 0, void 0, function () {
        var maxRetries, retryDelay, attempt, keys, key, signKey, profile, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('[PairingTrust] 🔑 Starting key trust establishment for:', remotePersonId === null || remotePersonId === void 0 ? void 0 : remotePersonId.substring(0, 8));
                    maxRetries = 10;
                    retryDelay = 1000 // 1 second
                    ;
                    attempt = 1;
                    _c.label = 1;
                case 1:
                    if (!(attempt <= maxRetries)) return [3 /*break*/, 16];
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 11, , 15]);
                    console.log("[PairingTrust] Attempt ".concat(attempt, "/").concat(maxRetries, " to find keys..."));
                    return [4 /*yield*/, (0, reverse_map_query_js_1.getAllEntries)(remotePersonId, 'Keys')];
                case 3:
                    keys = _c.sent();
                    if (!(keys.length > 0)) return [3 /*break*/, 8];
                    console.log("[PairingTrust] Found ".concat(keys.length, " key object(s) for remote peer"));
                    return [4 /*yield*/, (0, storage_unversioned_objects_js_1.getObject)(keys[0])];
                case 4:
                    key = _c.sent();
                    console.log('[PairingTrust] Retrieved key object:', {
                        owner: (_a = key.owner) === null || _a === void 0 ? void 0 : _a.substring(0, 8),
                        hasPublicKey: !!key.publicKey,
                        hasPublicSignKey: !!key.publicSignKey
                    });
                    signKey = {
                        $type$: 'SignKey',
                        key: key.publicSignKey
                    };
                    // Create a Profile with the sign key
                    // This profile represents our view/trust of the remote person
                    console.log('[PairingTrust] Creating profile with trusted sign key...');
                    return [4 /*yield*/, ProfileModel_js_1.default.constructWithNewProfile(remotePersonId, localPersonId, 'trusted-peer', // Profile type
                        [], // Communication endpoints (can be added later)
                        [signKey] // Person descriptions (the sign key)
                        )];
                case 5:
                    profile = _c.sent();
                    if (!profile.loadedVersion) {
                        throw new Error('Profile model has no hash for profile with sign key');
                    }
                    console.log('[PairingTrust] Profile created:', (_b = profile.loadedVersion) === null || _b === void 0 ? void 0 : _b.substring(0, 8));
                    // Issue a trust certificate for this profile
                    console.log('[PairingTrust] Issuing TrustKeysCertificate...');
                    return [4 /*yield*/, trust.certify('TrustKeysCertificate', { profile: profile.loadedVersion })
                        // Refresh trust caches to apply the new certificate
                    ];
                case 6:
                    _c.sent();
                    // Refresh trust caches to apply the new certificate
                    return [4 /*yield*/, trust.refreshCaches()];
                case 7:
                    // Refresh trust caches to apply the new certificate
                    _c.sent();
                    console.log('[PairingTrust] ✅ Key trust established successfully for:', remotePersonId === null || remotePersonId === void 0 ? void 0 : remotePersonId.substring(0, 8));
                    return [2 /*return*/, { success: true, profileHash: profile.loadedVersion }];
                case 8:
                    if (!(attempt < maxRetries)) return [3 /*break*/, 10];
                    console.log('[PairingTrust] Keys not yet available, waiting...');
                    return [4 /*yield*/, (0, promise_js_1.wait)(retryDelay)];
                case 9:
                    _c.sent();
                    _c.label = 10;
                case 10: return [3 /*break*/, 15];
                case 11:
                    error_1 = _c.sent();
                    console.error("[PairingTrust] Error in attempt ".concat(attempt, ":"), error_1.message);
                    if (!(attempt < maxRetries)) return [3 /*break*/, 13];
                    return [4 /*yield*/, (0, promise_js_1.wait)(retryDelay)];
                case 12:
                    _c.sent();
                    return [3 /*break*/, 14];
                case 13:
                    // Final attempt failed
                    console.error('[PairingTrust] ❌ Failed to establish key trust after all retries');
                    throw error_1;
                case 14: return [3 /*break*/, 15];
                case 15:
                    attempt++;
                    return [3 /*break*/, 1];
                case 16:
                    // If we get here, we couldn't find keys after all retries
                    console.warn('[PairingTrust] ⚠️ Could not find keys for remote peer after', maxRetries, 'attempts');
                    return [2 /*return*/, { success: false, reason: 'Keys not available' }];
            }
        });
    });
}
/**
 * Share our main profile with the newly paired peer.
 * This allows them to see our information and establish trust.
 *
 * @param {Object} leuteModel - The LeuteModel instance
 * @param {string} remotePersonId - The remote person to share with
 */
function shareMainProfileWithPeer(leuteModel, remotePersonId) {
    return __awaiter(this, void 0, void 0, function () {
        var me, mainProfile, setAccessParam, error_2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('[PairingTrust] 📤 Sharing our main profile with peer:', remotePersonId === null || remotePersonId === void 0 ? void 0 : remotePersonId.substring(0, 8));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, leuteModel.me()];
                case 2:
                    me = _b.sent();
                    mainProfile = me.mainProfileLazyLoad();
                    if (!mainProfile || !mainProfile.idHash) {
                        console.warn('[PairingTrust] No main profile to share');
                        return [2 /*return*/, { success: false, reason: 'No main profile' }];
                    }
                    console.log('[PairingTrust] Our main profile:', (_a = mainProfile.idHash) === null || _a === void 0 ? void 0 : _a.substring(0, 8));
                    setAccessParam = {
                        id: mainProfile.idHash,
                        person: [remotePersonId], // Grant access to this specific person
                        group: [], // No group access needed for P2P
                        mode: storage_base_common_js_1.SET_ACCESS_MODE.ADD
                    };
                    return [4 /*yield*/, (0, access_js_1.createAccess)([setAccessParam])];
                case 3:
                    _b.sent();
                    console.log('[PairingTrust] ✅ Profile shared successfully');
                    return [2 /*return*/, { success: true, profileHash: mainProfile.idHash }];
                case 4:
                    error_2 = _b.sent();
                    console.error('[PairingTrust] Error sharing profile:', error_2);
                    return [2 /*return*/, { success: false, error: error_2.message }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Complete trust establishment after pairing.
 * This combines key trust and profile sharing.
 *
 * @param {Object} params - Parameters object
 * @param {Object} params.trust - TrustedKeysManager instance
 * @param {Object} params.leuteModel - LeuteModel instance
 * @param {boolean} params.initiatedLocally - Whether we initiated pairing
 * @param {string} params.localPersonId - Our person ID
 * @param {string} params.localInstanceId - Our instance ID
 * @param {string} params.remotePersonId - Remote person ID
 * @param {string} params.remoteInstanceId - Remote instance ID
 * @param {string} params.token - Pairing token
 */
function completePairingTrust(params) {
    return __awaiter(this, void 0, void 0, function () {
        var trust, leuteModel, initiatedLocally, localPersonId, localInstanceId, remotePersonId, remoteInstanceId, token, trustResult, shareResult, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    trust = params.trust, leuteModel = params.leuteModel, initiatedLocally = params.initiatedLocally, localPersonId = params.localPersonId, localInstanceId = params.localInstanceId, remotePersonId = params.remotePersonId, remoteInstanceId = params.remoteInstanceId, token = params.token;
                    console.log('[PairingTrust] 🤝 Completing trust establishment for pairing');
                    console.log('[PairingTrust] Details:', {
                        initiatedLocally: initiatedLocally,
                        localPerson: localPersonId === null || localPersonId === void 0 ? void 0 : localPersonId.substring(0, 8),
                        remotePerson: remotePersonId === null || remotePersonId === void 0 ? void 0 : remotePersonId.substring(0, 8)
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, trustPairingKeys(trust, initiatedLocally, localPersonId, localInstanceId, remotePersonId, remoteInstanceId, token)];
                case 2:
                    trustResult = _a.sent();
                    if (!trustResult.success) {
                        console.warn('[PairingTrust] Could not establish key trust:', trustResult.reason);
                        // Continue anyway - profile sharing can still work
                    }
                    return [4 /*yield*/, shareMainProfileWithPeer(leuteModel, remotePersonId)];
                case 3:
                    shareResult = _a.sent();
                    if (!shareResult.success) {
                        console.warn('[PairingTrust] Could not share profile:', shareResult.reason);
                    }
                    console.log('[PairingTrust] ✅ Trust establishment completed');
                    return [2 /*return*/, {
                            success: true,
                            keyTrust: trustResult,
                            profileShare: shareResult
                        }];
                case 4:
                    error_3 = _a.sent();
                    console.error('[PairingTrust] ❌ Error completing trust establishment:', error_3);
                    return [2 /*return*/, {
                            success: false,
                            error: error_3.message
                        }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
