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
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
// Cache for valid Gemini API keys
var keysCache = [];
var badKeys = new Set(); // Keep track of keys that gave 401
var currentKeyIndex = 0;
var hasSyncedWithFirestore = false;
/**
 * Helper to wrap a promise with a timeout so it never hangs indefinitely.
 */
function promiseWithTimeout(promise, timeoutMs, fallbackValue) {
    var timeoutId;
    var timeoutPromise = new Promise(function (resolve) {
        timeoutId = setTimeout(function () {
            console.warn("[Gemini Sync] Firestore operation timed out after ".concat(timeoutMs, "ms."));
            resolve(fallbackValue);
        }, timeoutMs);
    });
    return Promise.race([
        promise.then(function (val) {
            clearTimeout(timeoutId);
            return val;
        }).catch(function (err) {
            clearTimeout(timeoutId);
            throw err;
        }),
        timeoutPromise
    ]);
}
/**
 * Robust background synchronization of Gemini keys with Firestore database.
 */
export function syncGeminiKeysWithFirestore() {
    return __awaiter(this, void 0, void 0, function () {
        var localKeys;
        return __generator(this, function (_a) {
            // DISABLING FIRESTORE SYNC: Force local environment variables for better reliability
            // and to avoid corrupt pools or slow Firestore operations causing timeouts.
            hasSyncedWithFirestore = true;
            localKeys = getGeminiKeysPool();
            if (localKeys.length > 0) {
                keysCache = localKeys;
            }
            return [2 /*return*/];
        });
    });
}
export function getGeminiKeysPool() {
    if (keysCache.length > 0)
        return keysCache;
    var keys = new Set();
    // Collect all potential keys
    if (process.env.GEMINI_API_KEYS) {
        process.env.GEMINI_API_KEYS.split(/[,,;]/).forEach(function (k) {
            var tk = k.trim();
            if (tk.length > 5)
                keys.add(tk);
        });
    }
    Object.keys(process.env).forEach(function (v) {
        var _a;
        if (v.includes("GEMINI_API_KEY") || v === "VITE_API_KEY") {
            var val = (_a = process.env[v]) === null || _a === void 0 ? void 0 : _a.trim();
            if (val && val.length > 5)
                keys.add(val);
        }
    });
    var allKeys = Array.from(keys);
    // Filter out known bad keys and prioritize AIzaSy keys
    // Many keys provided by the environment starting with AQ. seem to be invalid for this API
    var aizasyKeys = allKeys.filter(function (k) { return k.startsWith("AIzaSy") && !badKeys.has(k); });
    var otherKeys = allKeys.filter(function (k) { return !k.startsWith("AIzaSy") && !badKeys.has(k); });
    // If we have standard keys, use them. Otherwise fallback to everything that isn't blacklisted.
    if (aizasyKeys.length > 0) {
        keysCache = aizasyKeys;
    }
    else {
        keysCache = otherKeys;
    }
    // If still empty but we have blacklisted keys, try one last time with all keys if needed, 
    // but better to return empty and let the caller handle it.
    return keysCache;
}
export function clearKeysCache() {
    keysCache = [];
    badKeys.clear();
    hasSyncedWithFirestore = false;
}
function rotateKeyIndex(poolSize) {
    if (poolSize <= 1)
        return;
    currentKeyIndex = (currentKeyIndex + 1) % poolSize;
}
export function getRotationalClient(index) {
    var pool = getGeminiKeysPool();
    if (pool.length === 0) {
        throw new Error("Gemini API kaliti topilmadi.");
    }
    var activeIndex = index !== undefined ? index % pool.length : currentKeyIndex % pool.length;
    var client = new GoogleGenAI({ apiKey: pool[activeIndex] });
    return { client: client, keyIndex: activeIndex, totalKeys: pool.length };
}
export function generateContentWithRotation(params) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, rawKeys_1, maxAttempts, attempts, lastError, defaultSafety, _loop_1, state_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, syncGeminiKeysWithFirestore()];
                case 1:
                    _a.sent();
                    pool = getGeminiKeysPool();
                    if (!(pool.length === 0)) return [3 /*break*/, 3];
                    clearKeysCache();
                    return [4 /*yield*/, syncGeminiKeysWithFirestore()];
                case 2:
                    _a.sent();
                    pool = getGeminiKeysPool();
                    _a.label = 3;
                case 3:
                    if (pool.length === 0) {
                        rawKeys_1 = new Set();
                        Object.keys(process.env).forEach(function (v) {
                            var _a;
                            if (v.includes("GEMINI_API_KEY")) {
                                var val = (_a = process.env[v]) === null || _a === void 0 ? void 0 : _a.trim();
                                if (val)
                                    rawKeys_1.add(val);
                            }
                        });
                        pool = Array.from(rawKeys_1);
                        if (pool.length === 0)
                            throw new Error("Gemini API kaliti topilmadi.");
                    }
                    maxAttempts = Math.max(10, pool.length * 2);
                    attempts = 0;
                    lastError = null;
                    defaultSafety = [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    ];
                    _loop_1 = function () {
                        var activeIndex, apiKey, client, modelToUse, response, error_1, errorDetail, statusCode, errMsg, delay_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    activeIndex = (currentKeyIndex + attempts) % pool.length;
                                    apiKey = pool[activeIndex];
                                    // Skip if already known bad in this turn's context (though getGeminiKeysPool should have filtered)
                                    if (badKeys.has(apiKey) && pool.length > 1) {
                                        attempts++;
                                        return [2 /*return*/, "continue"];
                                    }
                                    client = new GoogleGenAI({ apiKey: apiKey });
                                    modelToUse = params.model;
                                    // Normalize model names to working ones
                                    if (modelToUse.includes("gemini-1.5-flash"))
                                        modelToUse = "gemini-2.5-flash"; // Try standard first
                                    if (modelToUse.includes("gemini-1.5-pro"))
                                        modelToUse = "gemini-3.1-pro-preview";
                                    // Strategic fallbacks
                                    if (attempts >= 1) {
                                        if (attempts % 3 === 1)
                                            modelToUse = "gemini-2.5-flash";
                                        else if (attempts % 3 === 2)
                                            modelToUse = "gemini-2.5-flash";
                                        else
                                            modelToUse = "gemini-3.1-pro-preview";
                                    }
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 3, , 6]);
                                    console.log("[Gemini Rotator] Attempt ".concat(attempts + 1, " with ").concat(modelToUse, " (Key Index ").concat(activeIndex, ")"));
                                    return [4 /*yield*/, Promise.race([
                                            client.models.generateContent({
                                                model: modelToUse,
                                                contents: params.contents,
                                                config: __assign(__assign({}, (params.config || {})), { safetySettings: params.safetySettings || defaultSafety })
                                            }),
                                            new Promise(function (_, reject) { return setTimeout(function () { return reject(new Error("Request Timeout")); }, 45000); })
                                        ])];
                                case 2:
                                    response = _b.sent();
                                    // If we got here, the key is good. Update index.
                                    currentKeyIndex = activeIndex;
                                    return [2 /*return*/, { value: response }];
                                case 3:
                                    error_1 = _b.sent();
                                    attempts++;
                                    lastError = error_1;
                                    errorDetail = error_1.message || JSON.stringify(error_1);
                                    statusCode = error_1.status || error_1.code;
                                    console.log("[Gemini Rotator] Step ".concat(attempts, " failed on index ").concat(activeIndex, " (Status: ").concat(statusCode, "): ").concat(errorDetail.substring(0, 100)));
                                    // Blacklist 401 keys permanently for this process
                                    if (statusCode === 401 || errorDetail.includes("authentication credentials") || errorDetail.includes("401")) {
                                        console.warn("[Gemini Rotator] Key at index ".concat(activeIndex, " is INVALID (401). Blacklisting."));
                                        badKeys.add(apiKey);
                                        // Force clear cache so next call doesn't see this key
                                        keysCache = [];
                                    }
                                    rotateKeyIndex(pool.length);
                                    errMsg = errorDetail.toLowerCase();
                                    // Don't retry on user errors (400)
                                    if (errMsg.includes("400") || errMsg.includes("invalid_argument"))
                                        throw error_1;
                                    if (!(errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("unavailable"))) return [3 /*break*/, 5];
                                    delay_1 = Math.min(2000, 500 * attempts);
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, delay_1); })];
                                case 4:
                                    _b.sent();
                                    _b.label = 5;
                                case 5: return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    };
                    _a.label = 4;
                case 4:
                    if (!(attempts < maxAttempts)) return [3 /*break*/, 6];
                    return [5 /*yield**/, _loop_1()];
                case 5:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    return [3 /*break*/, 4];
                case 6: throw lastError || new Error("AI generation failed after multiple attempts.");
            }
        });
    });
}
