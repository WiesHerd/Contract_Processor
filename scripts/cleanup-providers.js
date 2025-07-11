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
var awsServices_js_1 = require("../src/utils/awsServices.js");
var aws_amplify_1 = require("aws-amplify");
var aws_exports_js_1 = require("../src/aws-exports.js");
var clausesData_1 = require("../src/features/clauses/clausesData");
var awsServices_1 = require("../src/utils/awsServices");
// Configure Amplify
aws_amplify_1.Amplify.configure(aws_exports_js_1.default);
function cleanupProviders() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('Starting provider cleanup...');
                    return [4 /*yield*/, awsServices_js_1.awsBulkOperations.deleteAllProviders()];
                case 1:
                    _a.sent();
                    console.log('Successfully deleted all providers');
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error deleting providers:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function uploadClauses() {
    return __awaiter(this, void 0, void 0, function () {
        var success, failed, _i, CLAUSES_1, clause, input, err_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    success = 0;
                    failed = 0;
                    _i = 0, CLAUSES_1 = clausesData_1.CLAUSES;
                    _c.label = 1;
                case 1:
                    if (!(_i < CLAUSES_1.length)) return [3 /*break*/, 6];
                    clause = CLAUSES_1[_i];
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    input = {
                        id: clause.id,
                        text: clause.content,
                        tags: clause.tags,
                        condition: ((_b = (_a = clause.conditions) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) || undefined,
                        createdAt: clause.createdAt,
                        updatedAt: clause.updatedAt,
                    };
                    return [4 /*yield*/, awsServices_1.awsClauses.create(input)];
                case 3:
                    _c.sent();
                    console.log("Uploaded: ".concat(clause.title));
                    success++;
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _c.sent();
                    console.error("Failed to upload: ".concat(clause.title), err_1);
                    failed++;
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    console.log("\nUpload complete. Success: ".concat(success, ", Failed: ").concat(failed));
                    return [2 /*return*/];
            }
        });
    });
}
// Run the cleanup
cleanupProviders();
uploadClauses().catch(function (err) {
    console.error('Migration script failed:', err);
    process.exit(1);
});
