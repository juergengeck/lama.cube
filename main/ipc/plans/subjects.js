"use strict";
/**
 * IPC Handler for Subjects
 * Thin adapter that delegates to lama.core SubjectsHandler
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
exports.subjectsHandler = exports.subjectHandlers = void 0;
var SubjectsHandler_js_1 = require("@lama/core/handlers/SubjectsHandler.js");
// Initialize handler
var subjectsHandler = new SubjectsHandler_js_1.SubjectsHandler();
exports.subjectsHandler = subjectsHandler;
/**
 * Subject IPC handlers
 */
var subjectHandlers = {
    /**
     * Create or update a subject
     */
    'subjects:create': function (event_1, _a) { return __awaiter(void 0, [event_1, _a], void 0, function (event, _b) {
        var response;
        var name = _b.name, createdBy = _b.createdBy, confidence = _b.confidence, references = _b.references;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, subjectsHandler.createSubject({ name: name, createdBy: createdBy, confidence: confidence, references: references })];
                case 1:
                    response = _c.sent();
                    return [2 /*return*/, { success: response.success, subject: response.subject, error: response.error }];
            }
        });
    }); },
    /**
     * Attach subject to content
     */
    'subjects:attach': function (event_1, _a) { return __awaiter(void 0, [event_1, _a], void 0, function (event, _b) {
        var response;
        var subjectName = _b.subjectName, contentHash = _b.contentHash, attachedBy = _b.attachedBy, confidence = _b.confidence, context = _b.context;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, subjectsHandler.attachSubject({ subjectName: subjectName, contentHash: contentHash, attachedBy: attachedBy, confidence: confidence, context: context })];
                case 1:
                    response = _c.sent();
                    return [2 /*return*/, { success: response.success, attachment: response.attachment, error: response.error }];
            }
        });
    }); },
    /**
     * Get subjects for content
     */
    'subjects:getForContent': function (event_1, _a) { return __awaiter(void 0, [event_1, _a], void 0, function (event, _b) {
        var response;
        var contentHash = _b.contentHash;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, subjectsHandler.getForContent({ contentHash: contentHash })];
                case 1:
                    response = _c.sent();
                    return [2 /*return*/, { success: response.success, subjects: response.subjects, error: response.error }];
            }
        });
    }); },
    /**
     * Get all subjects
     */
    'subjects:getAll': function (event) { return __awaiter(void 0, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, subjectsHandler.getAll({})];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, { success: response.success, subjects: response.subjects, error: response.error }];
            }
        });
    }); },
    /**
     * Search subjects
     */
    'subjects:search': function (event_1, _a) { return __awaiter(void 0, [event_1, _a], void 0, function (event, _b) {
        var response;
        var query = _b.query, limit = _b.limit;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, subjectsHandler.search({ query: query, limit: limit })];
                case 1:
                    response = _c.sent();
                    return [2 /*return*/, { success: response.success, results: response.results, error: response.error }];
            }
        });
    }); },
    /**
     * Get subject resonance
     */
    'subjects:getResonance': function (event_1, _a) { return __awaiter(void 0, [event_1, _a], void 0, function (event, _b) {
        var response;
        var subjectNames = _b.subjectNames, topK = _b.topK;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, subjectsHandler.getResonance({ subjectNames: subjectNames, topK: topK })];
                case 1:
                    response = _c.sent();
                    return [2 /*return*/, { success: response.success, resonance: response.resonance, error: response.error }];
            }
        });
    }); },
    /**
     * Extract subjects from text
     */
    'subjects:extract': function (event_1, _a) { return __awaiter(void 0, [event_1, _a], void 0, function (event, _b) {
        var response;
        var text = _b.text, extractor = _b.extractor, minConfidence = _b.minConfidence;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, subjectsHandler.extract({ text: text, extractor: extractor, minConfidence: minConfidence })];
                case 1:
                    response = _c.sent();
                    return [2 /*return*/, { success: response.success, subjects: response.subjects, error: response.error }];
            }
        });
    }); }
};
exports.subjectHandlers = subjectHandlers;
