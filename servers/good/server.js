#!/usr/bin/env node
// Good server: requires auth, nonce; blocks replay; supports logout; checks scope/aud/iss/expired.
const readline = require("readline");
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

const EXPECTED_AUD = "mcpsec-demo";
const EXPECTED_ISS = "good-mcp";
const VALID_TOKEN = "SECRET";

const seenNonces = new Set();   // recent nonces
const revoked = new Set();      // revoked tokens via logout

function reply(id, payload, isError = false) {
  const msg = { jsonrpc: "2.0", id };
  if (isError) msg.error = payload;
  else msg.result = payload;
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function err(id, code, message) {
  reply(id, { code, message }, true);
}

rl.on("line", (line) => {
  let req; try { req = JSON.parse(line); } catch { return; }
  const { id, method, params = {} } = req;

  if (method === "initialize") {
    return reply(id, { server: "good-mcp", version: "0.1" });
  }

  if (method === "listTools") {
    return reply(id, [
      {
        name: "echo",
        schema: {
          type: "object",
          properties: { msg: { type: "string" } },
          required: ["msg"],
        },
      },
      {
        name: "writeThing",
        schema: {
          type: "object",
          properties: { value: { type: "string" } },
          required: ["value"],
        },
      },
    ]);
  }

  if (method === "login") {
    const scope = params.scope || "read";
    // In real life you'd verify a user here.
    return reply(id, { token: VALID_TOKEN, scope, aud: EXPECTED_AUD, iss: EXPECTED_ISS });
  }

  if (method === "logout") {
    const token = params.meta?.Authorization?.replace(/^Bearer\s+/, "") || "";
    if (token) revoked.add(token);
    return reply(id, { ok: true });
  }

  if (method === "callTool") {
    const { name, args = {}, meta = {} } = params;

    // --- Auth ---
    const token = meta.Authorization?.replace(/^Bearer\s+/, "") || "";
    if (!token || token !== VALID_TOKEN) return err(id, 401, "missing/invalid token");
    if (revoked.has(token)) return err(id, 401, "token revoked");

    // --- Token claim checks (simulated via meta flags/fields) ---
    if (meta.expired === true) return err(id, 401, "token expired");
    if (meta.aud && meta.aud !== EXPECTED_AUD) return err(id, 401, "aud mismatch");
    if (meta.iss && meta.iss !== EXPECTED_ISS) return err(id, 401, "iss mismatch");

    // --- Nonce / replay ---
    const nonce = meta.nonce;
    if (!nonce) return err(id, 403, "missing nonce");
    if (seenNonces.has(nonce)) return err(id, 403, "replay detected");
    seenNonces.add(nonce);

    // --- Scope check ---
    const scope = meta.scope || "read";
    if (name === "writeThing" && scope !== "write") return err(id, 403, "scope mismatch");
    if (name === "echo" && scope !== "read") return err(id, 403, "scope mismatch");

    // --- Tools ---
    if (name === "echo") {
      return reply(id, { ok: true, echo: args });
    }
    if (name === "writeThing") {
      // pretend to mutate state (we won't, but this is the "write" API)
      return reply(id, { ok: true, wrote: args.value });
    }
    return err(id, 404, "unknown tool");
  }

  return err(id, -32601, "method not found");
});
