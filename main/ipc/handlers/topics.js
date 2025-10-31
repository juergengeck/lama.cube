"use strict";
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
exports.getOrCreateTopicForContact = getOrCreateTopicForContact;
exports.recordSubjectFeedback = recordSubjectFeedback;
var node_one_core_js_1 = require("../../core/node-one-core.js");
/**
 * Get or create a one-to-one topic for a contact
 */
function getOrCreateTopicForContact(event, contactId) {
    return __awaiter(this, void 0, void 0, function () {
        var nodeInstance, topicModel, channelManager, myPersonId, isAI, contactName, others, contact, personId, profile, nameDesc, chatHandlers, result, p2pTopicId, targetPersonId, others, contact, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('[Topics IPC] Getting or creating topic for contact:', contactId);
                    nodeInstance = node_one_core_js_1.default;
                    if (!nodeInstance || !nodeInstance.initialized) {
                        console.error('[Topics IPC] No Node.js ONE.core instance available');
                        return [2 /*return*/, { success: false, error: 'No Node.js ONE.core instance' }];
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 13, , 14]);
                    topicModel = nodeInstance.topicModel;
                    channelManager = nodeInstance.channelManager;
                    myPersonId = nodeInstance.ownerId;
                    if (!topicModel || !channelManager || !myPersonId) {
                        console.error('[Topics IPC] Missing required models');
                        return [2 /*return*/, { success: false, error: 'Models not initialized' }];
                    }
                    isAI = false;
                    contactName = 'Contact';
                    if (!nodeInstance.leuteModel) return [3 /*break*/, 5];
                    return [4 /*yield*/, nodeInstance.leuteModel.others()];
                case 2:
                    others = _c.sent();
                    contact = others.find(function (c) { return c.id === contactId; });
                    if (!contact) return [3 /*break*/, 5];
                    return [4 /*yield*/, contact.mainIdentity()];
                case 3:
                    personId = _c.sent();
                    // Check if AI using LLMObjectManager
                    if ((_a = nodeInstance.aiAssistantModel) === null || _a === void 0 ? void 0 : _a.llmObjectManager) {
                        isAI = nodeInstance.aiAssistantModel.llmObjectManager.isLLMPerson(personId);
                        console.log("[Topics IPC] Contact ".concat(contactId.substring(0, 8), " isAI: ").concat(isAI));
                    }
                    return [4 /*yield*/, contact.mainProfile()];
                case 4:
                    profile = _c.sent();
                    if (profile === null || profile === void 0 ? void 0 : profile.personDescriptions) {
                        nameDesc = profile.personDescriptions.find(function (d) { return d.$type$ === 'PersonName'; });
                        if (nameDesc === null || nameDesc === void 0 ? void 0 : nameDesc.name) {
                            contactName = nameDesc.name;
                        }
                    }
                    _c.label = 5;
                case 5:
                    if (!isAI) return [3 /*break*/, 8];
                    console.log('[Topics IPC] AI contact detected - creating conversation via chat handler');
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./chat.js'); })];
                case 6:
                    chatHandlers = (_c.sent()).chatHandlers;
                    return [4 /*yield*/, chatHandlers.createConversation(event, {
                            type: 'group', // AI conversations are always groups (even 1-on-1)
                            participants: [contactId], // Pass contact ID
                            name: contactName
                        })];
                case 7:
                    result = _c.sent();
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to create AI conversation');
                    }
                    console.log('[Topics IPC] AI conversation created:', (_b = result.data) === null || _b === void 0 ? void 0 : _b.id);
                    return [2 /*return*/, {
                            success: true,
                            topicId: result.data.id
                        }];
                case 8:
                    p2pTopicId = contactId;
                    console.log('[Topics IPC] Using profile-based topic ID (Someone hash):', p2pTopicId);
                    targetPersonId = contactId;
                    if (!nodeInstance.leuteModel) return [3 /*break*/, 10];
                    return [4 /*yield*/, nodeInstance.leuteModel.others()];
                case 9:
                    others = _c.sent();
                    contact = others.find(function (c) { return c.id === contactId; });
                    if (contact && contact.personId) {
                        targetPersonId = contact.personId;
                        console.log("[Topics IPC] Found Person ID ".concat(targetPersonId, " for Someone ").concat(contactId));
                    }
                    _c.label = 10;
                case 10:
                    if (!nodeInstance.topicGroupManager) return [3 /*break*/, 12];
                    return [4 /*yield*/, nodeInstance.topicGroupManager.ensureP2PChannelsForProfile(contactId, targetPersonId)];
                case 11:
                    _c.sent();
                    console.log('[Topics IPC] Profile-based P2P channels ensured via TopicGroupManager');
                    _c.label = 12;
                case 12:
                    // Return the P2P topic ID directly - no need to create it again
                    console.log('[Topics IPC] Topic ready:', p2pTopicId);
                    // For P2P conversations, the channel should already be created with null owner
                    // by TopicGroupManager.ensureP2PChannelsForPeer
                    // Don't create another channel with owner here
                    console.log('[Topics IPC] P2P channel should already exist with null owner');
                    return [2 /*return*/, {
                            success: true,
                            topicId: p2pTopicId
                        }];
                case 13:
                    error_1 = _c.sent();
                    console.error('[Topics IPC] Failed to create topic:', error_1);
                    return [2 /*return*/, {
                            success: false,
                            error: error_1.message
                        }];
                case 14: return [2 /*return*/];
            }
        });
    });
}
/**
 * Record feedback (like/dislike) for a subject
 */
function recordSubjectFeedback(event, params) {
    return __awaiter(this, void 0, void 0, function () {
        var nodeInstance, getObjectByIdHash, storeVersionedObject, calculateIdHashOfObj, result, subject, storeResult, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("[Topics IPC] Recording ".concat(params.feedbackType, " for subject:"), params.subjectId);
                    nodeInstance = node_one_core_js_1.default;
                    if (!nodeInstance || !nodeInstance.initialized) {
                        console.error('[Topics IPC] No Node.js ONE.core instance available');
                        return [2 /*return*/, { success: false, error: 'No Node.js ONE.core instance' }];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                case 2:
                    getObjectByIdHash = (_a.sent()).getObjectByIdHash;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/storage-versioned-objects.js'); })];
                case 3:
                    storeVersionedObject = (_a.sent()).storeVersionedObject;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('@refinio/one.core/lib/util/object.js'); })];
                case 4:
                    calculateIdHashOfObj = (_a.sent()).calculateIdHashOfObj;
                    return [4 /*yield*/, getObjectByIdHash(params.subjectId)];
                case 5:
                    result = _a.sent();
                    if (!result || !result.obj) {
                        console.error('[Topics IPC] Subject not found:', params.subjectId);
                        return [2 /*return*/, { success: false, error: 'Subject not found' }];
                    }
                    subject = result.obj;
                    console.log('[Topics IPC] Found subject:', subject.id, 'Current likes:', subject.likes, 'dislikes:', subject.dislikes);
                    // Update feedback counters
                    if (params.feedbackType === 'like') {
                        subject.likes = (subject.likes || 0) + 1;
                    }
                    else {
                        subject.dislikes = (subject.dislikes || 0) + 1;
                    }
                    return [4 /*yield*/, storeVersionedObject(subject)];
                case 6:
                    storeResult = _a.sent();
                    console.log("[Topics IPC] Updated subject ".concat(subject.id, " - likes: ").concat(subject.likes, ", dislikes: ").concat(subject.dislikes));
                    return [2 /*return*/, {
                            success: true,
                            subject: {
                                id: subject.id,
                                likes: subject.likes,
                                dislikes: subject.dislikes
                            }
                        }];
                case 7:
                    error_2 = _a.sent();
                    console.error('[Topics IPC] Failed to record feedback:', error_2);
                    return [2 /*return*/, {
                            success: false,
                            error: error_2.message
                        }];
                case 8: return [2 /*return*/];
            }
        });
    });
}
