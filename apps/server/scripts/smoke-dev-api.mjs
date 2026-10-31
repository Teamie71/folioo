#!/usr/bin/env node
/*
  Dev API smoke runner (v2)

  Pulls the OpenAPI spec from /docs-json, calls endpoints with an
  access-token (Bearer), and writes a JSON report under /tmp.

  Result Classification
  ---------------------
  Each endpoint result is classified into one of:
    implemented       - 2xx success
    not_implemented   - 501 Not Implemented
    validation_error  - 400 Bad Request (DTO / payload issue)
    not_found         - 404 Not Found
    auth_required     - 401 Unauthorized
    payment_required  - 402 Payment Required
    server_error      - 500, 502, 503 etc.
    redirect          - 3xx
    skipped           - skipped by rule (env-dependent or multipart)
    network_error     - timeout / connection failure

  Safety
  ------
  - Never hardcode tokens in this file.
  - OAuth redirects are excluded by default.
  - Multipart endpoints are skipped unless --file is given.
  - Env-dependent endpoints (e.g. auth/refresh) are auto-skipped
    when prerequisite data is unavailable.

  Usage
  -----
  # GET-only (safe, default)
  FOLIOO_ACCESS_TOKEN=... node scripts/smoke-dev-api.mjs

  # Include mutating endpoints (POST/PATCH/DELETE)
  FOLIOO_ACCESS_TOKEN=... node scripts/smoke-dev-api.mjs --mutate

  # Attach a file for multipart/form-data endpoints
  FOLIOO_ACCESS_TOKEN=... node scripts/smoke-dev-api.mjs --mutate --file ./sample.pdf

  # Internal API smoke (X-API-Key auth, static endpoint list)
  FOLIOO_INTERNAL_API_KEY=... node scripts/smoke-dev-api.mjs --internal --mutate

  # Filter by path regex
  FOLIOO_ACCESS_TOKEN=... node scripts/smoke-dev-api.mjs --include '^/portfolio-corrections'
  FOLIOO_ACCESS_TOKEN=... node scripts/smoke-dev-api.mjs --mutate --exclude '^/auth/(kakao|google|naver)'
*/

import fs from 'node:fs';
import nodePath from 'node:path';
import process from 'node:process';

const DEFAULT_BASE = 'https://dev-api.folioo.ai.kr';

// ---------------------------------------------------------------------------
// Result classification
// ---------------------------------------------------------------------------
const CLASS = Object.freeze({
    IMPLEMENTED: 'implemented',
    NOT_IMPLEMENTED: 'not_implemented',
    VALIDATION_ERROR: 'validation_error',
    NOT_FOUND: 'not_found',
    AUTH_REQUIRED: 'auth_required',
    PAYMENT_REQUIRED: 'payment_required',
    SERVER_ERROR: 'server_error',
    REDIRECT: 'redirect',
    SKIPPED: 'skipped',
    NETWORK_ERROR: 'network_error',
});

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function nowIso() {
    return new Date().toISOString();
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
    const args = {
        base: DEFAULT_BASE,
        tokenEnv: 'FOLIOO_ACCESS_TOKEN',
        out: null,
        mutate: false,
        internal: false,
        internalKeyEnv: 'FOLIOO_INTERNAL_API_KEY',
        delayMs: 120,
        timeoutMs: 15000,
        include: null,
        exclude: null,
        file: null,
    };

    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        const next = argv[i + 1];
        if (a === '--base' && next) {
            args.base = next;
            i++;
        } else if (a === '--token-env' && next) {
            args.tokenEnv = next;
            i++;
        } else if (a === '--out' && next) {
            args.out = next;
            i++;
        } else if (a === '--mutate') {
            args.mutate = true;
        } else if (a === '--internal') {
            args.internal = true;
        } else if (a === '--internal-key-env' && next) {
            args.internalKeyEnv = next;
            i++;
        } else if (a === '--delay-ms' && next) {
            args.delayMs = Number(next);
            i++;
        } else if (a === '--timeout-ms' && next) {
            args.timeoutMs = Number(next);
            i++;
        } else if (a === '--include' && next) {
            args.include = next;
            i++;
        } else if (a === '--exclude' && next) {
            args.exclude = next;
            i++;
        } else if (a === '--file' && next) {
            args.file = next;
            i++;
        } else if (a === '--help' || a === '-h') {
            printHelp();
            process.exit(0);
        }
    }

    return args;
}

function printHelp() {
    console.log(`Usage: node scripts/smoke-dev-api.mjs [options]

Options:
  --base <url>               Base URL (default: ${DEFAULT_BASE})
  --token-env <name>         Env var containing access token (default: FOLIOO_ACCESS_TOKEN)
  --mutate                   Enable POST/PATCH/DELETE (default: GET only)
  --internal                 Run Internal API smoke (X-API-Key auth, static endpoint list)
  --internal-key-env <name>  Env var containing internal API key (default: FOLIOO_INTERNAL_API_KEY)
  --file <path>              Attach a local file for multipart/form-data endpoints
  --delay-ms <n>             Delay between requests (default: 120)
  --timeout-ms <n>           Per-request timeout (default: 15000)
  --include <regex>          Only run operations whose path matches regex
  --exclude <regex>          Skip operations whose path matches regex
  --out <path>               Write report to this path (default: /tmp/folioo_dev_smoke_<ts>.json)

Result Classification:
  implemented            2xx - endpoint works
  not_implemented        501 - endpoint is stubbed / not yet built
  validation_error       400 - payload rejected by DTO validation
  not_found              404 - resource not found
  auth_required          401 - authentication missing/invalid
  payment_required       402 - payment required
  server_error           500/502/503 etc.
  skipped                endpoint skipped (env-dependent or multipart)
  network_error          timeout or connection failure

Examples:
  # GET-only smoke
  FOLIOO_ACCESS_TOKEN=... node scripts/smoke-dev-api.mjs

  # Full smoke (POST/PATCH/DELETE included)
  FOLIOO_ACCESS_TOKEN=... node scripts/smoke-dev-api.mjs --mutate

  # With a file for multipart endpoints
  FOLIOO_ACCESS_TOKEN=... node scripts/smoke-dev-api.mjs --mutate --file ./sample.pdf

  # Filter by path
  FOLIOO_ACCESS_TOKEN=... node scripts/smoke-dev-api.mjs --include '^/portfolio-corrections'
  FOLIOO_ACCESS_TOKEN=... node scripts/smoke-dev-api.mjs --mutate --exclude '^/auth/(kakao|google|naver)'
`);
}

// ---------------------------------------------------------------------------
// Schema helpers
// ---------------------------------------------------------------------------
function buildDummyValue(schema) {
    const t = schema?.type;
    if (schema?.enum?.length) return schema.enum[0];
    if (t === 'integer' || t === 'number') return 1;
    if (t === 'boolean') return true;
    if (t === 'string') {
        if (schema?.format === 'date-time') return nowIso();
        if (schema?.format === 'date') return nowIso().slice(0, 10);
        if (schema?.format === 'email') return 'smoke@folioo.local';
        if (schema?.format === 'uuid') return '00000000-0000-0000-0000-000000000001';
        if (schema?.minLength > 0) return 'a'.repeat(schema.minLength);
        return 'test';
    }
    if (t === 'array') {
        // Generate one element if items schema is available (avoids minItems failures).
        if (schema?.items && !schema.items.$ref) return [buildDummyValue(schema.items)];
        return [];
    }
    if (t === 'object') return {};
    return 'test';
}

function deref(spec, schema) {
    if (!schema) return null;
    if (!schema.$ref) return schema;
    const parts = schema.$ref.replace(/^#\//, '').split('/');
    let cur = spec;
    for (const p of parts) {
        cur = cur?.[p];
        if (!cur) return null;
    }
    return cur;
}

function buildJsonBodyFromSchema(spec, schema) {
    const s = deref(spec, schema);
    if (!s) return {};

    if (s.oneOf?.length) return buildJsonBodyFromSchema(spec, s.oneOf[0]);
    if (s.anyOf?.length) return buildJsonBodyFromSchema(spec, s.anyOf[0]);
    if (s.allOf?.length) {
        const merged = {};
        for (const part of s.allOf) {
            const v = buildJsonBodyFromSchema(spec, part);
            if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(merged, v);
        }
        return merged;
    }

    if (s.type === 'object' || s.properties) {
        const out = {};
        // Fill ALL properties (not just required) to minimise 400 masking of 501.
        for (const [k, vRaw] of Object.entries(s.properties || {})) {
            const v = deref(spec, vRaw);
            out[k] = buildJsonBodyFromSchema(spec, v);
        }
        return out;
    }
    if (s.type === 'array') {
        if (s.items) return [buildJsonBodyFromSchema(spec, s.items)];
        return [];
    }
    return buildDummyValue(s);
}

// ---------------------------------------------------------------------------
// Path / query helpers
// ---------------------------------------------------------------------------
function fillPathParams(rawPath, op, context) {
    const params = [...(op.parameters || [])];
    return rawPath.replace(/\{([^}]+)\}/g, (_m, name) => {
        const byName = context.pathParamValues?.[name];
        if (byName != null) return encodeURIComponent(String(byName));

        const p = params.find((x) => x.in === 'path' && x.name === name);
        return encodeURIComponent(String(buildDummyValue(p?.schema || { type: 'integer' })));
    });
}

function buildQuery(pathStr, op) {
    const params = op.parameters || [];
    const q = new URLSearchParams();
    for (const p of params) {
        if (p.in !== 'query') continue;
        if (!p.required) continue;
        q.set(p.name, String(buildDummyValue(p.schema || { type: 'string' })));
    }
    const qs = q.toString();
    return qs ? `${pathStr}?${qs}` : pathStr;
}

function getFirstJsonContent(op) {
    const content = op.requestBody?.content;
    if (!content) return null;
    if (content['application/json'])
        return { contentType: 'application/json', schema: content['application/json']?.schema };
    if (content['multipart/form-data'])
        return {
            contentType: 'multipart/form-data',
            schema: content['multipart/form-data']?.schema,
        };
    const first = Object.keys(content)[0];
    if (!first) return null;
    return { contentType: first, schema: content[first]?.schema };
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------
/** Classify an HTTP response into a result class. */
function classify(status, _errorCode, networkError) {
    if (networkError) return CLASS.NETWORK_ERROR;
    if (status == null) return CLASS.NETWORK_ERROR;
    if (status >= 200 && status < 300) return CLASS.IMPLEMENTED;
    if (status >= 300 && status < 400) return CLASS.REDIRECT;
    if (status === 400) return CLASS.VALIDATION_ERROR;
    if (status === 401) return CLASS.AUTH_REQUIRED;
    if (status === 402) return CLASS.PAYMENT_REQUIRED;
    if (status === 404) return CLASS.NOT_FOUND;
    if (status === 501) return CLASS.NOT_IMPLEMENTED;
    if (status >= 500) return CLASS.SERVER_ERROR;
    // Other 4xx (403, 409, 422, etc.)
    return CLASS.VALIDATION_ERROR;
}

// ---------------------------------------------------------------------------
// Environment-dependent skip rules
// ---------------------------------------------------------------------------
/**
 * Check whether an operation should be skipped based on runtime context
 * (e.g. missing prerequisite data in the environment).
 *
 * Returns { skip: boolean, reason: string | null }
 */
function envSkipCheck(method, rawPath, ctx) {
    // POST /auth/refresh - needs httpOnly refreshToken cookie, not an access token.
    if (method === 'POST' && rawPath === '/auth/refresh') {
        return { skip: true, reason: 'env:requires-refresh-cookie' };
    }

    return { skip: false, reason: null };
}

// ---------------------------------------------------------------------------
// Static skip rules (OAuth redirects, multipart without --file)
// ---------------------------------------------------------------------------
function shouldSkipOperation(method, rawPath, firstContent, hasFile) {
    // OAuth redirects aren't meaningful as API smoke requests.
    if (
        rawPath.startsWith('/auth/kakao') ||
        rawPath.startsWith('/auth/google') ||
        rawPath.startsWith('/auth/naver')
    ) {
        if (method === 'GET') return { skip: true, reason: 'oauth-redirect' };
    }
    // Multipart: skip only when --file is NOT provided.
    if (firstContent?.contentType === 'multipart/form-data' && !hasFile) {
        return { skip: true, reason: 'multipart-no-file (use --file <path>)' };
    }
    return { skip: false, reason: null };
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
/**
 * Fetch a URL and return { status, headers, text, json }.
 * Safely handles non-JSON response bodies (e.g. HTML error pages from proxies).
 */
async function fetchJson(url, opts, timeoutMs) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...opts, signal: ac.signal });
        const ct = res.headers.get('content-type') || '';
        const rawText = await res.text();
        // Truncate very large response bodies (e.g. HTML error pages).
        const text = rawText.length > 2000 ? rawText.slice(0, 2000) + '\u2026' : rawText;
        let json = null;
        if (ct.includes('application/json') && rawText) {
            try {
                json = JSON.parse(rawText);
            } catch {
                json = null;
            }
        }
        // Fallback: attempt JSON parse even without correct content-type.
        // Some error responses arrive without proper headers.
        if (!json && rawText && rawText.trimStart().startsWith('{')) {
            try {
                json = JSON.parse(rawText);
            } catch {
                // genuinely not JSON - leave null
            }
        }
        return {
            status: res.status,
            headers: Object.fromEntries(res.headers.entries()),
            text,
            json,
        };
    } finally {
        clearTimeout(t);
    }
}

// ---------------------------------------------------------------------------
// Preflight context
// ---------------------------------------------------------------------------
async function preflightContext(base, token, timeoutMs) {
    const ctx = {
        correctionId: null,
        pathParamValues: {},
    };

    // Existing corrections
    try {
        const r = await fetchJson(
            `${base}/portfolio-corrections`,
            {
                method: 'GET',
                headers: { accept: 'application/json', authorization: `Bearer ${token}` },
            },
            timeoutMs
        );
        const list = r.json?.result;
        if (Array.isArray(list) && list.length && typeof list[0]?.id === 'number') {
            ctx.correctionId = list[0].id;
        }
    } catch (e) {
        console.error('[smoke][preflight] failed to get existing corrections:', e);
    }

    if (ctx.correctionId != null) ctx.pathParamValues.correctionId = ctx.correctionId;
    return ctx;
}

// ---------------------------------------------------------------------------
// Payload overrides - known DTO shapes that the OpenAPI spec may not fully
// describe, or where we need env-specific values.
// ---------------------------------------------------------------------------
function payloadOverrides(method, rawPath, ctx) {
    if (method === 'POST' && rawPath === '/portfolio-corrections') {
        return {
            companyName: 'SmokeCo',
            positionName: 'Developer',
            jobDescriptionType: 'TEXT',
            jobDescription: 'smoke test job description',
        };
    }
    if (method === 'PATCH' && rawPath === '/users/me') {
        return { name: 'smoke-user' };
    }
    if (method === 'PATCH' && rawPath === '/users/me/marketing-consent') {
        return { isMarketingAgreed: true };
    }
    // Auth SMS endpoints (NOT_IMPLEMENTED - min-valid payloads to expose 501)
    if (method === 'POST' && rawPath === '/auth/sms/send') {
        return { phoneNum: '01000000000' };
    }
    if (method === 'POST' && rawPath === '/auth/sms/verify') {
        return { phoneNum: '01000000000', verifyToken: '000000' };
    }
    // Auth management endpoints (NOT_IMPLEMENTED - empty body to expose 501)
    if (method === 'POST' && rawPath === '/auth/logout') {
        return {};
    }
    if (method === 'POST' && /^\/auth\/(kakao|google|naver)\/unlink$/.test(rawPath)) {
        return {};
    }
    return null;
}

// ---------------------------------------------------------------------------
// Multipart body builder
// ---------------------------------------------------------------------------
/**
 * Build a FormData body for endpoints that accept file uploads.
 * Returns { body: FormData } or null when no file is available.
 */
function buildMultipartBody(filePath, spec, contentSchema) {
    if (!filePath) return null;
    const resolvedPath = nodePath.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
        console.error(`[smoke] --file path does not exist: ${resolvedPath}`);
        return null;
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const fileName = nodePath.basename(resolvedPath);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });

    // Determine the file field name from the schema.
    const s = deref(spec, contentSchema);
    let fileFieldName = 'file';
    if (s?.properties) {
        for (const [k, vRaw] of Object.entries(s.properties)) {
            const v = deref(spec, vRaw);
            if (v?.type === 'string' && v?.format === 'binary') {
                fileFieldName = k;
                break;
            }
        }
    }

    const formData = new FormData();
    formData.append(fileFieldName, blob, fileName);

    // Append required non-file fields as strings.
    if (s?.properties) {
        const required = new Set(s.required || []);
        for (const [k, vRaw] of Object.entries(s.properties)) {
            if (k === fileFieldName) continue;
            const v = deref(spec, vRaw);
            if (v?.type === 'string' && v?.format === 'binary') continue;
            if (required.has(k)) {
                formData.append(k, String(buildDummyValue(v)));
            }
        }
    }

    // Do not set content-type header; fetch sets it with the correct boundary.
    return { body: formData };
}

// ---------------------------------------------------------------------------
// Internal API smoke runner
// ---------------------------------------------------------------------------
async function runInternalSmoke(args, apiKey) {
    const startedAt = nowIso();
    const outPath = args.out || `/tmp/folioo_dev_internal_smoke_${Date.now()}.json`;
    const includeRe = args.include ? new RegExp(args.include) : null;
    const excludeRe = args.exclude ? new RegExp(args.exclude) : null;

    const results = [];
    for (const ep of INTERNAL_ENDPOINTS) {
        if (ep.mutate && !args.mutate) continue;
        if (includeRe && !includeRe.test(ep.path)) continue;
        if (excludeRe && excludeRe.test(ep.path)) continue;

        let urlStr = ep.path;
        if (ep.query) {
            const qs = new URLSearchParams(ep.query).toString();
            urlStr = `${ep.path}?${qs}`;
        }
        const url = new URL(urlStr, args.base).toString();

        const headers = {
            accept: 'application/json',
            'x-api-key': apiKey,
        };

        let body = null;
        if (ep.body) {
            body = JSON.stringify(ep.body);
            headers['content-type'] = 'application/json';
        }

        const started = Date.now();
        let status = null;
        let errorCode = null;
        let errorReason = null;
        let networkError = null;

        try {
            const r = await fetchJson(url, { method: ep.method, headers, body }, args.timeoutMs);
            status = r.status;
            const err = r.json?.error;
            if (err && typeof err === 'object') {
                errorCode = err.errorCode || err.code || null;
                errorReason = err.reason || err.message || null;
            } else if (r.status >= 400 && !r.json) {
                errorReason = r.text ? `[non-json] ${r.text.slice(0, 200)}` : '[empty body]';
            }
            if (!err && status >= 400 && r.text) {
                errorReason = r.text.slice(0, 300);
            }
        } catch (e) {
            networkError = String(e?.message || e);
        }

        const durationMs = Date.now() - started;
        const classification = classify(status, errorCode, networkError);

        results.push({
            method: ep.method,
            rawPath: ep.path,
            url,
            tag: 'internal',
            summary: null,
            operationId: null,
            classification,
            skipped: false,
            skipReason: null,
            status,
            errorCode,
            errorReason,
            durationMs,
            networkError,
        });

        await sleep(args.delayMs);
    }

    // Build classification buckets.
    const classificationBuckets = {};
    for (const cls of Object.values(CLASS)) classificationBuckets[cls] = 0;
    for (const r of results) {
        const cls = r.classification || CLASS.NETWORK_ERROR;
        classificationBuckets[cls] = (classificationBuckets[cls] || 0) + 1;
    }

    const report = {
        at: startedAt,
        finishedAt: nowIso(),
        base: args.base,
        mode: 'internal',
        options: { mutate: args.mutate, delayMs: args.delayMs, timeoutMs: args.timeoutMs },
        classification: classificationBuckets,
        count: results.length,
        results,
    };

    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

    console.log('\n--- Internal API Smoke Test Summary ---');
    console.log(`Endpoints: ${results.length}  |  Report: ${outPath}`);
    console.log('\nClassification:');
    const ordered = Object.entries(classificationBuckets)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a);
    for (const [cat, count] of ordered) {
        console.log(`  ${cat.padEnd(22)} ${count}`);
    }
    console.log(`\n${JSON.stringify({ outPath, classification: classificationBuckets, count: results.length })}`);
}

// ---------------------------------------------------------------------------
// Internal API static endpoint list
// ---------------------------------------------------------------------------
const INTERNAL_ENDPOINTS = [
    { method: 'GET', path: '/internal/health' },
    { method: 'GET', path: '/internal/portfolios/1' },
    { method: 'GET', path: '/corrections/1', mutate: false },
    { method: 'PATCH', path: '/corrections/1/status', body: { status: 'FAILED' }, mutate: true },
    { method: 'PATCH', path: '/corrections/1/company-insight', body: { companyInsight: 'smoke-test' }, mutate: true },
    { method: 'PATCH', path: '/corrections/1/result', body: { result: [] }, mutate: true },
    { method: 'POST', path: '/corrections/1/rag-data', body: { searchQuery: 'smoke', searchResults: {} }, mutate: true },
    { method: 'GET', path: '/corrections/1/rag-data' },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    const args = parseArgs(process.argv);

    // Internal API mode: use X-API-Key instead of Bearer token.
    if (args.internal) {
        const apiKey = process.env[args.internalKeyEnv];
        if (!apiKey) {
            console.error(`Missing env ${args.internalKeyEnv}. Refusing to run internal smoke.`);
            process.exit(2);
        }
        await runInternalSmoke(args, apiKey);
        return;
    }

    const token = process.env[args.tokenEnv];
    if (!token) {
        console.error(`Missing env ${args.tokenEnv}. Refusing to run.`);
        process.exit(2);
    }

    // Validate --file path early.
    if (args.file && !fs.existsSync(nodePath.resolve(args.file))) {
        console.error(`--file path does not exist: ${nodePath.resolve(args.file)}`);
        process.exit(2);
    }

    const includeRe = args.include ? new RegExp(args.include) : null;
    const excludeRe = args.exclude ? new RegExp(args.exclude) : null;

    const startedAt = nowIso();
    const outPath = args.out || `/tmp/folioo_dev_smoke_${Date.now()}.json`;

    const specRes = await fetchJson(
        `${args.base}/docs-json`,
        { method: 'GET', headers: { accept: 'application/json' } },
        args.timeoutMs
    );
    if (specRes.status !== 200 || !specRes.json) {
        console.error(`Failed to fetch OpenAPI spec: status=${specRes.status}`);
        process.exit(1);
    }
    const spec = specRes.json;

    const ctx = await preflightContext(args.base, token, args.timeoutMs);

    const httpMethods = args.mutate ? ['get', 'post', 'patch', 'delete'] : ['get'];
    const operations = [];
    for (const [rawPath, item] of Object.entries(spec.paths || {})) {
        for (const m of httpMethods) {
            const op = item?.[m];
            if (!op) continue;
            if (includeRe && !includeRe.test(rawPath)) continue;
            if (excludeRe && excludeRe.test(rawPath)) continue;

            const firstContent = getFirstJsonContent(op);
            operations.push({ method: m.toUpperCase(), rawPath, op, firstContent });
        }
    }

    const results = [];
    for (const entry of operations) {
        const { method, rawPath, op, firstContent } = entry;
        const tag = (op.tags && op.tags[0]) || '(no-tag)';

        // -- Static skip (oauth, multipart without file) --------------------
        const staticSkip = shouldSkipOperation(method, rawPath, firstContent, !!args.file);
        if (staticSkip.skip) {
            results.push({
                method,
                rawPath,
                url: `${args.base}${rawPath}`,
                tag,
                summary: op.summary || null,
                operationId: op.operationId || null,
                classification: CLASS.SKIPPED,
                skipped: true,
                skipReason: staticSkip.reason,
                status: null,
                errorCode: null,
                errorReason: null,
                durationMs: 0,
                networkError: null,
            });
            continue;
        }

        // -- Env-dependent skip ---------------------------------------------
        const envSkip = envSkipCheck(method, rawPath, ctx);
        if (envSkip.skip) {
            results.push({
                method,
                rawPath,
                url: `${args.base}${rawPath}`,
                tag,
                summary: op.summary || null,
                operationId: op.operationId || null,
                classification: CLASS.SKIPPED,
                skipped: true,
                skipReason: envSkip.reason,
                status: null,
                errorCode: null,
                errorReason: null,
                durationMs: 0,
                networkError: null,
            });
            continue;
        }

        // -- Build URL ------------------------------------------------------
        let resolvedPath = fillPathParams(rawPath, op, ctx);
        resolvedPath = buildQuery(resolvedPath, op);
        const url = new URL(resolvedPath, args.base).toString();

        const headers = {
            accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
            authorization: `Bearer ${token}`,
        };

        // -- Build body -----------------------------------------------------
        let body = null;
        let contentType = null;
        const isMultipart = firstContent?.contentType === 'multipart/form-data';

        if (isMultipart && args.file) {
            const mp = buildMultipartBody(args.file, spec, firstContent.schema);
            if (mp) {
                body = mp.body;
                // Do NOT set content-type; fetch sets it with the correct boundary.
            }
        } else if (method !== 'GET' && method !== 'DELETE') {
            const override = payloadOverrides(method, rawPath, ctx);
            if (override) {
                body = JSON.stringify(override);
                contentType = 'application/json';
            } else if (firstContent?.contentType === 'application/json') {
                body = JSON.stringify(buildJsonBodyFromSchema(spec, firstContent.schema));
                contentType = 'application/json';
            }
        }
        if (contentType) headers['content-type'] = contentType;

        // -- Execute request ------------------------------------------------
        const started = Date.now();
        let status = null;
        let errorCode = null;
        let errorReason = null;
        let networkError = null;

        try {
            const r = await fetchJson(url, { method, headers, body }, args.timeoutMs);
            status = r.status;

            // Extract error details from the standardized error envelope.
            const err = r.json?.error;
            if (err && typeof err === 'object') {
                errorCode = err.errorCode || err.code || null;
                errorReason = err.reason || err.message || null;
            } else if (r.status >= 400 && !r.json) {
                errorReason = r.text
                    ? `[non-json] ${r.text.slice(0, 200).replace(/\n/g, ' ')}`
                    : '[empty body]';
            }
            // Fallback: capture a text snippet for non-2xx without JSON error.
            if (!err && status >= 400 && r.text) {
                errorReason = r.text.slice(0, 300);
            }

        } catch (e) {
            networkError = String(e?.message || e);
        }

        const durationMs = Date.now() - started;
        const classification = classify(status, errorCode, networkError);

        results.push({
            method,
            rawPath,
            url,
            tag,
            summary: op.summary || null,
            operationId: op.operationId || null,
            classification,
            skipped: false,
            skipReason: null,
            status,
            errorCode,
            errorReason,
            durationMs,
            networkError,
        });

        await sleep(args.delayMs);
    }

    // -- Build classification buckets ---------------------------------------
    const classificationBuckets = {};
    for (const cls of Object.values(CLASS)) classificationBuckets[cls] = 0;
    for (const r of results) {
        const cls = r.classification || CLASS.NETWORK_ERROR;
        classificationBuckets[cls] = (classificationBuckets[cls] || 0) + 1;
    }

    // Legacy HTTP-status buckets (backward compat).
    const buckets = {
        ok2xx: 0,
        redirect3xx: 0,
        client4xx: 0,
        server5xx: 0,
        skipped: 0,
        network: 0,
    };
    for (const r of results) {
        if (r.skipped) {
            buckets.skipped++;
            continue;
        }
        if (r.networkError) {
            buckets.network++;
            continue;
        }
        if (r.status >= 200 && r.status < 300) buckets.ok2xx++;
        else if (r.status >= 300 && r.status < 400) buckets.redirect3xx++;
        else if (r.status >= 400 && r.status < 500) buckets.client4xx++;
        else if (r.status >= 500) buckets.server5xx++;
    }

    const report = {
        at: startedAt,
        finishedAt: nowIso(),
        base: args.base,
        openapi: {
            title: spec.info?.title || null,
            version: spec.info?.version || null,
        },
        options: {
            mutate: args.mutate,
            file: args.file,
            delayMs: args.delayMs,
            timeoutMs: args.timeoutMs,
            include: args.include,
            exclude: args.exclude,
        },
        context: {
            correctionId: ctx.correctionId,
        },
        classification: classificationBuckets,
        buckets,
        count: results.length,
        results,
    };

    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

    // -- Console summary (human-readable + machine-parseable) ---------------
    console.log('\n--- Smoke Test Summary ---');
    console.log(`Endpoints: ${results.length}  |  Report: ${outPath}`);

    console.log('\nClassification:');
    const ordered = Object.entries(classificationBuckets)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a);
    for (const [cat, count] of ordered) {
        console.log(`  ${cat.padEnd(22)} ${count}`);
    }

    console.log('\nHTTP status buckets:');
    for (const [k, v] of Object.entries(buckets)) {
        if (v > 0) console.log(`  ${k.padEnd(14)} ${v}`);
    }

    // Machine-parseable last line (backward-compatible shape + classification)
    console.log(
        `\n${JSON.stringify({ outPath, buckets, classification: classificationBuckets, count: results.length })}`
    );
}

main().catch((e) => {
    console.error(e.stack || String(e));
    process.exit(1);
});
