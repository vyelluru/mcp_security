#!/usr/bin/env node
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
const seenNonces = new Set();
const revoked = new Set(); // tokens revoked by logout

function write(resultOrError, id) {
  const msg = { jsonrpc: "2.0", id };
  if (resultOrError && resultOrError.error) msg.error = resultOrError.error;
  else msg.result = resultOrError;
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function unauthorized(id, msg="unauthorized") { write({ error: { code: 401, message: msg } }, id); }
function forbidden(id, msg="forbidden") { write({ error: { code: 403, message: msg } }, id); }

rl.on('line', (line) => {
  let req; try { req = JSON.parse(line); } catch { return; }
  const { id, method, params = {} } = req;

  if (method === 'initialize') {
    return write({ server: "good-mcp", version: "0.1" }, id);
  }

  if (method === 'listTools') {
    return write([{ name: "echo", schema: { type: "object", properties: { msg: { type: "string" } }, required: ["msg"] } }], id);
  }

  if (method === 'logout') {
    const token = params.meta?.Authorization?.replace(/^Bearer\s+/,'') || "";
    if (token) revoked.add(token);
    return write({ ok: true }, id);
  }

  if (method === 'callTool') {
    const meta = params.meta || {};
    const token = meta.Authorization?.replace(/^Bearer\s+/,'') || "";
    if (!token || token !== "SECRET") return unauthorized(id, "missing/invalid token");
    if (revoked.has(token)) return unauthorized(id, "token revoked");

    // Nonce / replay check
    const nonce = meta.nonce;
    if (!nonce) return forbidden(id, "missing nonce");
    if (seenNonces.has(nonce)) return forbidden(id, "replay detected");
    seenNonces.add(nonce);

    // Scope check (echo requires "read")
    const scope = meta.scope || "read";
    if (scope !== "read") return forbidden(id, "scope mismatch");

    if (params.name === "echo") {
      return write({ ok: true, echo: params.args }, id);
    } else {
      return write({ error: { code: 404, message: "unknown tool" } }, id);
    }
  }

  // Unknown
  write({ error: { code: -32601, message: "method not found" } }, id);
});
