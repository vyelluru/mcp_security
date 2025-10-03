#!/usr/bin/env node
// Bad server: no auth, no nonce checks; very permissive (for negative tests).
const readline = require("readline");
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

function reply(id, payload, isError = false) {
  const msg = { jsonrpc: "2.0", id };
  if (isError) msg.error = payload;
  else msg.result = payload;
  process.stdout.write(JSON.stringify(msg) + "\n");
}
function err(id, code, message) { reply(id, { code, message }, true); }

rl.on("line", (line) => {
  let req; try { req = JSON.parse(line); } catch { return; }
  const { id, method, params = {} } = req;

  if (method === "initialize") return reply(id, { server: "bad-mcp", version: "0.1" });

  if (method === "listTools") {
    return reply(id, [
      { name: "echo", schema: {} },
      { name: "writeThing", schema: {} },
    ]);
  }

  if (method === "login") {
    // Pretend login always "works"
    return reply(id, { token: "ANY", scope: "all", aud: "any", iss: "bad-mcp" });
  }

  if (method === "logout") {
    // Does nothing (no revocation)
    return reply(id, { ok: true });
  }

  if (method === "callTool") {
    const { name, args = {} } = params;
    // No auth, no nonce, no scope/aud/iss/expired checks
    if (name === "echo") return reply(id, { ok: true, echo: args });
    if (name === "writeThing") return reply(id, { ok: true, wrote: args.value ?? null });
    return err(id, 404, "unknown tool");
  }

  return err(id, -32601, "method not found");
});
