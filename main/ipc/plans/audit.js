/**
 * Audit IPC Plans (Thin Adapter)
 *
 * Maps Electron IPC calls to AuditHandler methods.
 * Business logic lives in ../../../lama.core/plans/AuditHandler.ts
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
var AuditHandler_js_1 = require("@lama/core/plans/AuditHandler.js");
var qr_generation_js_1 = require("../../core/qr-generation.js");
var attestation_manager_js_1 = require("../../core/attestation-manager.js");
var topic_export_js_1 = require("../../core/topic-export.js");
var node_one_core_js_1 = require("../../core/node-one-core.js");
// Service instances
var attestationManager = null;
var topicExporter = null;
var auditHandler = null;
/**
 * Get or create attestation manager
 */
function getAttestationManager() {
    if (!attestationManager && node_one_core_js_1.default.initialized) {
        attestationManager = new attestation_manager_js_1.AttestationManager(node_one_core_js_1.default.channelManager, node_one_core_js_1.default.trust, node_one_core_js_1.default.leuteModel);
    }
    return attestationManager;
}
/**
 * Get or create topic exporter
 */
function getTopicExporter() {
    if (!topicExporter) {
        topicExporter = new topic_export_js_1.TopicExporter(node_one_core_js_1.default.channelManager, getAttestationManager());
    }
    return topicExporter;
}
/**
 * Get handler instance (creates on first use)
 */
function getHandler() {
    if (!auditHandler) {
        auditHandler = new AuditHandler_js_1.AuditHandler(qr_generation_js_1.default, getAttestationManager(), getTopicExporter());
    }
    return auditHandler;
}
var auditPlans = {
    /**
     * Generate QR code for message/topic attestation
     */
    generateQR: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getHandler().generateQR(params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Create attestation for a message
     */
    createAttestation: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getHandler().createAttestation(params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Get attestations for message/topic/auditor
     */
    getAttestations: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getHandler().getAttestations(params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Export topic with attestations
     */
    exportTopic: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getHandler().exportTopic(params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Verify attestation
     */
    verifyAttestation: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getHandler().verifyAttestation(params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Generate batch QR codes for multiple messages
     */
    generateBatchQR: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getHandler().generateBatchQR(params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Parse scanned QR code
     */
    parseQR: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getHandler().parseQR(params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    /**
     * Get attestation status for UI display
     */
    getAttestationStatus: function (event, params) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getHandler().getAttestationStatus(params)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    }
};
export default auditPlans;
