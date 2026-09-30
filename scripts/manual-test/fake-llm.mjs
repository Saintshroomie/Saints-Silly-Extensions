// Stand-in OpenAI-compatible backend for manual testing in SillyTavern.
//
// Logs every request ST sends to $SSE_TEST_DIR/fake-llm-requests.jsonl (so a
// smoke script can read the exact prompt) and answers with canned text:
//   1. $SSE_TEST_DIR/fake-llm-replies.json — optional [{ "match": "...", "reply": "..." }]
//      rules; the first rule whose `match` substring appears anywhere in the
//      request's messages wins. Re-read on every request.
//   2. $SSE_TEST_DIR/fake-llm-reply.txt — the fallback reply, re-read on every
//      request (a script can rewrite it between steps).
//   3. A built-in default.
// Streams (SSE chunks) when the request asks for it.
//
// Usage: node fake-llm.mjs  (port from FAKE_LLM_PORT, default 5005)

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TEST_DIR = process.env.SSE_TEST_DIR || path.join(os.tmpdir(), 'sse-manual-test');
const PORT = Number(process.env.FAKE_LLM_PORT || 5005);
const LOG = path.join(TEST_DIR, 'fake-llm-requests.jsonl');
const RULES = path.join(TEST_DIR, 'fake-llm-replies.json');
const FALLBACK = path.join(TEST_DIR, 'fake-llm-reply.txt');
const DEFAULT_REPLY = 'This is the stand-in model\'s reply.';

fs.mkdirSync(TEST_DIR, { recursive: true });

function readIfExists(file) {
    try {
        return fs.readFileSync(file, 'utf8');
    } catch {
        return null;
    }
}

function pickReply(body) {
    const haystack = JSON.stringify(body.messages ?? body.prompt ?? '');
    const rules = readIfExists(RULES);
    if (rules) {
        try {
            for (const rule of JSON.parse(rules)) {
                if (rule?.match && haystack.includes(rule.match)) return String(rule.reply ?? '');
            }
        } catch (err) {
            console.error('fake-llm: bad replies file:', err.message);
        }
    }
    return readIfExists(FALLBACK) ?? DEFAULT_REPLY;
}

function chunk(content, finish = null) {
    return `data: ${JSON.stringify({
        id: 'fake', object: 'chat.completion.chunk', model: 'fake-model',
        choices: [{ index: 0, delta: content === null ? {} : { content }, finish_reason: finish }],
    })}\n\n`;
}

http.createServer((req, res) => {
    let raw = '';
    req.on('data', part => { raw += part; });
    req.on('end', () => {
        if (req.method === 'GET' && req.url.endsWith('/models')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ object: 'list', data: [{ id: 'fake-model', object: 'model' }] }));
            return;
        }
        let body = {};
        try {
            body = JSON.parse(raw || '{}');
        } catch { /* keep {} */ }
        fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), url: req.url, body }) + '\n');
        const reply = pickReply(body);

        if (body.stream) {
            res.writeHead(200, { 'Content-Type': 'text/event-stream' });
            for (const piece of reply.match(/[\s\S]{1,16}/g) || ['']) res.write(chunk(piece));
            res.write(chunk(null, 'stop'));
            res.end('data: [DONE]\n\n');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            id: 'fake', object: 'chat.completion', model: 'fake-model',
            choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }],
        }));
    });
}).listen(PORT, '127.0.0.1', () => console.log(`fake-llm listening on 127.0.0.1:${PORT}, logging to ${LOG}`));
