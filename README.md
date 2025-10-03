MCP Security Scanner
What it is

A local security testing suite for Model Context Protocol (MCP) servers.
Phase 1 (Auth + replay) is done; Phase 2 (input fuzzing) is in progress.

Features 

✅ Auth required (valid token/login)

✅ Expired/revoked token denied

✅ aud/iss (audience/issuer) enforced

✅ Least privilege (scope checks)

✅ Replay protection via nonce

✅ CLI summary + results.json; non-zero exit on failures (CI-ready)

Repo layout
mcpsec-demo/
  client/
    rpc.py          # JSON-per-line over stdio
    mcp_client.py   # initialize, list_tools, call_tool, login/logout
    scan.py         # runner + report
  servers/
    good/server.js  # secure demo server
    bad/server.js   # insecure demo server

Quick start

Prereqs: Python 3.10+, Node 18+

git clone <your-repo-url>
cd mcpsec-demo
python -m client.scan --cmd "node servers/good/server.js" --out results_good.json
python -m client.scan --cmd "node servers/bad/server.js"  --out results_bad.json


You’ll see a ✅/❌ summary and a saved JSON report.