#!/usr/bin/env node
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

function write(resultOrError, id) {
  const msg = { jsonrpc: "2.0", id };
  if (resultOrError && resultOrError.error) msg.error = resultOrError.error;
  else msg.result = resultOrError;
  process.stdout.write(JSON.stringify(msg) + "\n");
}

rl.on('line', (line) => {
  let req; try { req = JSON.parse(line); } catch { return; }
  const { id, method, params = {} } = req;

  if (method === 'initialize') return write({ server: "bad-mcp", version: "0.1" }, id);
  if (method === 'listTools') return write([{ name: "echo", schema: {} }], id);
  if (method === 'logout') return write({ ok: true }, id);

  if (method === 'callTool') {
    // No auth, no nonce, always succeeds
    if (params.name === "echo") return write({ ok: true, echo: params.args }, id);
    return write({ error: { code: 404, message: "unknown tool" } }, id);
  }

  write({ error: { code: -32601, message: "method not found" } }, id);
});
