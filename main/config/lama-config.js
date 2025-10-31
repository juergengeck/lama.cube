"use strict";
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
exports.loadConfig = loadConfig;
var promises_1 = require("fs/promises");
var path_1 = require("path");
var os_1 = require("os");
var defaultConfig = {
    instance: {
        name: 'LAMA Instance',
        email: 'user@lama.local',
        secret: '', // Must be provided
        directory: path_1.default.join(process.cwd(), 'OneDB'), // Keep app data in project directory
        wipeStorage: false
    },
    commServer: {
        url: 'wss://comm.refinio.one' // Production commserver (was: wss://comm10.dev.refinio.one)
    },
    web: {
        url: undefined // No default web URL - must be configured
    },
    logging: {
        level: 'info'
    }
};
/**
 * Parse CLI arguments into config object
 */
function parseCLIArgs() {
    var args = process.argv.slice(2);
    var config = {};
    for (var i = 0; i < args.length; i++) {
        var arg = args[i];
        if (arg.startsWith('--commserver=') || arg.startsWith('--comm-server=')) {
            config.commServer = { url: arg.split('=')[1] };
        }
        else if (arg.startsWith('--storage=') || arg.startsWith('--instance-directory=')) {
            if (!config.instance)
                config.instance = {};
            config.instance.directory = arg.split('=')[1];
        }
        else if (arg.startsWith('--instance-name=')) {
            if (!config.instance)
                config.instance = {};
            config.instance.name = arg.split('=')[1];
        }
        else if (arg.startsWith('--instance-email=')) {
            if (!config.instance)
                config.instance = {};
            config.instance.email = arg.split('=')[1];
        }
        else if (arg.startsWith('--web-url=')) {
            if (!config.web)
                config.web = {};
            config.web.url = arg.split('=')[1];
        }
        else if (arg.startsWith('--wipe-storage')) {
            if (!config.instance)
                config.instance = {};
            config.instance.wipeStorage = true;
        }
        else if (arg.startsWith('--log-level=')) {
            if (!config.logging)
                config.logging = {};
            config.logging.level = arg.split('=')[1];
        }
    }
    return config;
}
/**
 * Deep merge config objects
 */
function mergeConfig(base, override) {
    var result = __assign({}, base);
    for (var key in override) {
        if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
            result[key] = mergeConfig(base[key] || {}, override[key]);
        }
        else {
            result[key] = override[key];
        }
    }
    return result;
}
/**
 * Load configuration from files, environment variables, and CLI arguments.
 * Precedence: CLI args > Environment variables > Config files > Defaults
 */
function loadConfig() {
    return __awaiter(this, void 0, void 0, function () {
        var config, configPaths, _i, configPaths_1, configPath, content, fileConfig, error_1, cliConfig;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    config = JSON.parse(JSON.stringify(defaultConfig));
                    configPaths = [
                        path_1.default.join(process.cwd(), 'lama.config.json'),
                        path_1.default.join(os_1.default.homedir(), '.lama', 'config.json'),
                    ];
                    _i = 0, configPaths_1 = configPaths;
                    _a.label = 1;
                case 1:
                    if (!(_i < configPaths_1.length)) return [3 /*break*/, 6];
                    configPath = configPaths_1[_i];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, promises_1.default.readFile(configPath, 'utf-8')];
                case 3:
                    content = _a.sent();
                    fileConfig = JSON.parse(content);
                    config = __assign(__assign({}, config), fileConfig);
                    console.log("[LamaConfig] Loaded config from: ".concat(configPath));
                    return [3 /*break*/, 6]; // Use first found config file
                case 4:
                    error_1 = _a.sent();
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    // Environment variables OVERRIDE config file settings
                    if (process.env.LAMA_INSTANCE_NAME) {
                        config.instance.name = process.env.LAMA_INSTANCE_NAME;
                    }
                    if (process.env.LAMA_INSTANCE_EMAIL) {
                        config.instance.email = process.env.LAMA_INSTANCE_EMAIL;
                    }
                    if (process.env.LAMA_INSTANCE_SECRET) {
                        config.instance.secret = process.env.LAMA_INSTANCE_SECRET;
                    }
                    if (process.env.LAMA_INSTANCE_DIRECTORY) {
                        config.instance.directory = process.env.LAMA_INSTANCE_DIRECTORY;
                    }
                    if (process.env.LAMA_WIPE_STORAGE !== undefined) {
                        config.instance.wipeStorage = process.env.LAMA_WIPE_STORAGE === 'true';
                    }
                    if (process.env.LAMA_COMM_SERVER_URL) {
                        config.commServer.url = process.env.LAMA_COMM_SERVER_URL;
                    }
                    if (process.env.LAMA_WEB_URL) {
                        config.web.url = process.env.LAMA_WEB_URL;
                    }
                    if (process.env.LAMA_LOG_LEVEL) {
                        config.logging.level = process.env.LAMA_LOG_LEVEL;
                    }
                    cliConfig = parseCLIArgs();
                    if (Object.keys(cliConfig).length > 0) {
                        console.log('[LamaConfig] Applying CLI arguments:', cliConfig);
                        config = mergeConfig(config, cliConfig);
                    }
                    console.log('[LamaConfig] Final configuration:', {
                        instanceName: config.instance.name,
                        instanceEmail: config.instance.email,
                        instanceDirectory: config.instance.directory,
                        commServerUrl: config.commServer.url,
                        webUrl: config.web.url,
                        wipeStorage: config.instance.wipeStorage,
                        logLevel: config.logging.level
                    });
                    return [2 /*return*/, config];
            }
        });
    });
}
