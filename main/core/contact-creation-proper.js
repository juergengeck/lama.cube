"use strict";
/**
 * Proper contact creation helper using ONE.models APIs
 * Based on lama's createProfileAndSomeoneForPerson implementation
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
exports.createProfileAndSomeoneForPerson = createProfileAndSomeoneForPerson;
exports.ensureContactExists = ensureContactExists;
exports.handleNewConnection = handleNewConnection;
exports.handleReceivedProfile = handleReceivedProfile;
var ProfileModel_js_1 = require("@refinio/one.models/lib/models/Leute/ProfileModel.js");
var SomeoneModel_js_1 = require("@refinio/one.models/lib/models/Leute/SomeoneModel.js");
var type_checks_js_1 = require("@refinio/one.core/lib/util/type-checks.js");
var storage_versioned_objects_js_1 = require("@refinio/one.core/lib/storage-versioned-objects.js");
/**
 * Creates a Profile and Someone object for an existing Person, following the correct ONE object relationship sequence.
 * This is based on lama's createProfileAndSomeoneForPerson function.
 *
 * @param {string} personId - The Person ID to create objects for
 * @param {Object} leuteModel - The initialized LeuteModel instance
 * @param {Object} profileOptions - Options for the profile (displayName, descriptors, etc.)
 * @returns {Promise<Object>} The newly created Someone object
 */
function createProfileAndSomeoneForPerson(personId_1, leuteModel_1) {
    return __awaiter(this, arguments, void 0, function (personId, leuteModel, profileOptions) {
        var profile_1, _a, _b, _c, someoneId, someone, calculateIdHashOfObj, _d, getObjectByIdHash_1, storeVersionObjectAsChange, leuteIdHash, leuteResult, updatedLeute, error_1;
        if (profileOptions === void 0) { profileOptions = {}; }
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    console.log("[ContactCreationProper] \uD83D\uDCDD Creating new contact for Person ".concat(personId === null || personId === void 0 ? void 0 : personId.substring(0, 8), "..."));
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 12, , 13]);
                    // 1. Create Profile using proper ProfileModel API
                    console.log('[ContactCreationProper]   ├─ Creating Profile object...');
                    _b = (_a = ProfileModel_js_1.default).constructWithNewProfile;
                    _c = [(0, type_checks_js_1.ensureIdHash)(personId)];
                    return [4 /*yield*/, leuteModel.myMainIdentity()];
                case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([_e.sent(), 'default',
                        [], // communicationEndpoints - empty array
                        [] // personDescriptions - will add after creation
                    ]))
                    // Add display name if provided
                ];
                case 3:
                    profile_1 = _e.sent();
                    // Add display name if provided
                    if (profileOptions.displayName) {
                        console.log("[ContactCreationProper] Adding display name: ".concat(profileOptions.displayName));
                        profile_1.personDescriptions.push({
                            $type$: 'PersonName',
                            name: profileOptions.displayName
                        });
                    }
                    // Add any other descriptors if provided
                    if (profileOptions.descriptors && Array.isArray(profileOptions.descriptors)) {
                        profileOptions.descriptors.forEach(function (descriptor) {
                            profile_1.personDescriptions.push(descriptor);
                        });
                    }
                    return [4 /*yield*/, profile_1.saveAndLoad()];
                case 4:
                    _e.sent();
                    console.log("[ContactCreationProper]   \u251C\u2500 Profile saved: ".concat(profile_1.idHash.toString().substring(0, 8)));
                    // 2. Create Someone using proper SomeoneModel API
                    console.log('[ContactCreationProper]   ├─ Creating Someone object...');
                    someoneId = "someone-for-".concat(personId);
                    return [4 /*yield*/, SomeoneModel_js_1.default.constructWithNewSomeone(leuteModel, someoneId, profile_1)];
                case 5:
                    someone = _e.sent();
                    console.log("[ContactCreationProper]   \u251C\u2500 Someone created: ".concat(someone.idHash.toString().substring(0, 8)));
                    // 3. Add to contacts (idempotent) - manual update to avoid frozen object error
                    console.log('[ContactCreationProper]   ├─ Adding to contacts list...');
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/object.js'); })];
                case 6:
                    calculateIdHashOfObj = (_e.sent()).calculateIdHashOfObj;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                case 7:
                    _d = _e.sent(), getObjectByIdHash_1 = _d.getObjectByIdHash, storeVersionObjectAsChange = _d.storeVersionObjectAsChange;
                    return [4 /*yield*/, calculateIdHashOfObj({
                            $type$: 'Leute',
                            appId: 'one.leute'
                        })];
                case 8:
                    leuteIdHash = _e.sent();
                    return [4 /*yield*/, getObjectByIdHash_1(leuteIdHash)];
                case 9:
                    leuteResult = _e.sent();
                    updatedLeute = __assign(__assign({}, leuteResult.obj), { other: __spreadArray([], new Set(__spreadArray(__spreadArray([], leuteResult.obj.other, true), [someone.idHash], false)), true) });
                    return [4 /*yield*/, storeVersionObjectAsChange(updatedLeute)];
                case 10:
                    _e.sent();
                    return [4 /*yield*/, leuteModel.loadLatestVersion()];
                case 11:
                    _e.sent();
                    console.log('[ContactCreationProper]   └─ ✅ Contact creation complete!');
                    return [2 /*return*/, someone];
                case 12:
                    error_1 = _e.sent();
                    console.error('[ContactCreationProper] Error creating Profile/Someone:', error_1);
                    throw error_1;
                case 13: return [2 /*return*/];
            }
        });
    });
}
/**
 * Ensures a contact (Person, Profile, Someone) exists for a given Person ID.
 * Retrieves the existing Someone or creates the full persona if needed.
 *
 * @param {string} personId - The ID hash of the Person
 * @param {Object} leuteModel - The initialized LeuteModel instance
 * @param {Object} profileOptions - Options for creating the profile if needed
 * @returns {Promise<Object>} The Someone object (existing or created)
 */
function ensureContactExists(personId_1, leuteModel_1) {
    return __awaiter(this, arguments, void 0, function (personId, leuteModel, profileOptions) {
        var others, _i, others_1, contact, contactPersonId, identityError_1, othersError_1, someone, creationError_1;
        if (profileOptions === void 0) { profileOptions = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("[ContactCreationProper] Ensuring contact for Person ".concat(personId === null || personId === void 0 ? void 0 : personId.substring(0, 8), "..."));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 11, , 12]);
                    return [4 /*yield*/, leuteModel.others()];
                case 2:
                    others = _a.sent();
                    if (!(others && Array.isArray(others) && others.length > 0)) return [3 /*break*/, 10];
                    _i = 0, others_1 = others;
                    _a.label = 3;
                case 3:
                    if (!(_i < others_1.length)) return [3 /*break*/, 10];
                    contact = others_1[_i];
                    if (!contact)
                        return [3 /*break*/, 9];
                    contactPersonId = void 0;
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 8, , 9]);
                    if (!(typeof contact.mainIdentity === 'function')) return [3 /*break*/, 6];
                    return [4 /*yield*/, contact.mainIdentity()];
                case 5:
                    contactPersonId = _a.sent();
                    return [3 /*break*/, 7];
                case 6:
                    if ('personId' in contact) {
                        contactPersonId = contact.personId;
                    }
                    _a.label = 7;
                case 7:
                    // If this contact has the same Person ID, return it
                    if (contactPersonId && contactPersonId.toString() === personId.toString()) {
                        console.log("[ContactCreationProper] Found existing Someone ".concat(contact.idHash, " with matching Person ID in contacts"));
                        return [2 /*return*/, contact];
                    }
                    return [3 /*break*/, 9];
                case 8:
                    identityError_1 = _a.sent();
                    console.warn("[ContactCreationProper] Error getting identity for contact:", identityError_1);
                    return [3 /*break*/, 9];
                case 9:
                    _i++;
                    return [3 /*break*/, 3];
                case 10: return [3 /*break*/, 12];
                case 11:
                    othersError_1 = _a.sent();
                    console.warn("[ContactCreationProper] Error checking existing contacts:", othersError_1);
                    return [3 /*break*/, 12];
                case 12:
                    // If no matching contact was found in the list, we need to create one
                    // Note: leuteModel.getSomeone looks for Someone objects that reference the Person ID,
                    // not the Person ID itself, so we can't use it to check if we need to create a Someone
                    console.log("[ContactCreationProper] No existing Someone found for Person ".concat(personId, ". Creating Profile and Someone..."));
                    _a.label = 13;
                case 13:
                    _a.trys.push([13, 15, , 16]);
                    return [4 /*yield*/, createProfileAndSomeoneForPerson(personId, leuteModel, profileOptions)];
                case 14:
                    someone = _a.sent();
                    console.log("[ContactCreationProper] \u2705 Successfully created and added contact for Person ".concat(personId));
                    return [2 /*return*/, someone];
                case 15:
                    creationError_1 = _a.sent();
                    console.error("[ContactCreationProper] Failed to create Profile/Someone for Person ".concat(personId, ":"), creationError_1);
                    throw creationError_1;
                case 16: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get display name from a Person object
 * @param {string} personId - The Person ID
 * @returns {Promise<string>} Display name or default
 */
function getPersonDisplayName(personId) {
    return __awaiter(this, void 0, void 0, function () {
        var personResult, person, emailName, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, storage_versioned_objects_js_1.getObjectByIdHash)((0, type_checks_js_1.ensureIdHash)(personId))];
                case 1:
                    personResult = _a.sent();
                    person = personResult === null || personResult === void 0 ? void 0 : personResult.obj;
                    if (person) {
                        // Try to get name or email
                        if (person.name)
                            return [2 /*return*/, person.name];
                        if (person.email) {
                            emailName = person.email.split('@')[0];
                            return [2 /*return*/, emailName.replace(/[._-]/g, ' ').replace(/\b\w/g, function (l) { return l.toUpperCase(); })];
                        }
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.log("[ContactCreationProper] Could not get Person object for display name:", error_2.message);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/, 'Remote Contact'];
            }
        });
    });
}
/**
 * Handle new contact when a connection is established
 * This is called when we receive a new connection from a remote instance
 *
 * @param {string} remotePersonId - The remote person's ID
 * @param {Object} leuteModel - The LeuteModel instance
 * @returns {Promise<Object>} The Someone object
 */
function handleNewConnection(remotePersonId, leuteModel) {
    return __awaiter(this, void 0, void 0, function () {
        var displayName, someone, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('[ContactCreationProper] 🤝 Handling new connection from:', remotePersonId === null || remotePersonId === void 0 ? void 0 : remotePersonId.substring(0, 8));
                    console.log('[ContactCreationProper] Step 1/3: Getting display name for contact...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, getPersonDisplayName(remotePersonId)];
                case 2:
                    displayName = _a.sent();
                    console.log('[ContactCreationProper] Step 2/3: Creating/retrieving contact for:', displayName);
                    return [4 /*yield*/, ensureContactExists(remotePersonId, leuteModel, { displayName: displayName })];
                case 3:
                    someone = _a.sent();
                    console.log('[ContactCreationProper] Step 3/3: Contact setup complete!');
                    console.log('[ContactCreationProper] ✅ Contact ready for:', displayName);
                    return [2 /*return*/, someone];
                case 4:
                    error_3 = _a.sent();
                    console.error('[ContactCreationProper] Error handling new connection:', error_3);
                    throw error_3;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Update Someone when we receive Profile data via CHUM
 * @param {string} personId - The person ID
 * @param {Object} profileData - The received profile data
 * @param {Object} leuteModel - The LeuteModel instance
 */
function handleReceivedProfile(personId, profileData, leuteModel) {
    return __awaiter(this, void 0, void 0, function () {
        var someone, profile, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('[ContactCreationProper] 📦 Received Profile data for:', personId === null || personId === void 0 ? void 0 : personId.substring(0, 8));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    return [4 /*yield*/, ensureContactExists(personId, leuteModel)];
                case 2:
                    someone = _a.sent();
                    if (!someone) return [3 /*break*/, 6];
                    return [4 /*yield*/, someone.mainProfile()
                        // Update profile descriptions if provided
                    ];
                case 3:
                    profile = _a.sent();
                    if (!profileData.personDescriptions) return [3 /*break*/, 5];
                    profile.personDescriptions = profileData.personDescriptions;
                    return [4 /*yield*/, profile.saveAndLoad()];
                case 4:
                    _a.sent();
                    console.log('[ContactCreationProper] ✅ Updated Profile with received data');
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    console.log('[ContactCreationProper] Could not ensure contact exists for:', personId === null || personId === void 0 ? void 0 : personId.substring(0, 8));
                    _a.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_4 = _a.sent();
                    console.error('[ContactCreationProper] Error handling received Profile:', error_4);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
