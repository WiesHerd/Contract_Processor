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
exports.uploadFile = uploadFile;
exports.getSignedDownloadUrl = getSignedDownloadUrl;
var client_s3_1 = require("@aws-sdk/client-s3");
var s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
// Initialize the S3 client
var s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
/**
 * Upload a file to S3
 * @param file - File, Buffer, or Blob to upload
 * @param key - S3 object key (e.g., 'uploads/myfile.csv')
 * @returns Promise with S3 upload result
 */
function uploadFile(file, key) {
    return __awaiter(this, void 0, void 0, function () {
        var command, response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    command = new client_s3_1.PutObjectCommand({
                        Bucket: process.env.S3_BUCKET,
                        Key: key,
                        Body: file,
                    });
                    return [4 /*yield*/, s3Client.send(command)];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            location: "https://".concat(process.env.S3_BUCKET, ".s3.").concat(process.env.AWS_REGION, ".amazonaws.com/").concat(key),
                            response: response,
                        }];
                case 2:
                    error_1 = _a.sent();
                    console.error('S3 upload error:', error_1);
                    throw new Error("Failed to upload file to S3: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error'));
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Generate a pre-signed URL for downloading a file
 * @param key - S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 3600)
 * @returns Promise with pre-signed URL
 */
function getSignedDownloadUrl(key_1) {
    return __awaiter(this, arguments, void 0, function (key, expiresIn) {
        var command, url, error_2;
        if (expiresIn === void 0) { expiresIn = 3600; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    command = new client_s3_1.GetObjectCommand({
                        Bucket: process.env.S3_BUCKET,
                        Key: key,
                    });
                    return [4 /*yield*/, (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: expiresIn })];
                case 1:
                    url = _a.sent();
                    return [2 /*return*/, url];
                case 2:
                    error_2 = _a.sent();
                    console.error('Error generating signed URL:', error_2);
                    throw new Error("Failed to generate signed URL: ".concat(error_2 instanceof Error ? error_2.message : 'Unknown error'));
                case 3: return [2 /*return*/];
            }
        });
    });
}
