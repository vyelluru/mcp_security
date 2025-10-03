# MCP Security Scanner

> A lightweight, local **security testing suite** for Model Context Protocol (MCP) servers.  
> **Phase 1 (Auth + replay)** ✅ done · **Phase 2 (Input fuzzing)** 🚧 in progress

## ✨ Features (MVP)
- ✅ **Auth required** (valid token/login)
- ✅ **Expired/revoked** tokens denied
- ✅ **aud/iss** (audience/issuer) enforced
- ✅ **Least privilege** (scope checks)
- ✅ **Replay protection** via nonce
- ✅ **CLI summary** + `results.json`; **non-zero exit** on failures (CI-ready)

## 📁 Repo Layout
```text
mcpsec-demo/
  client/
    rpc.py          # JSON-per-line over stdio
    mcp_client.py   # initialize, list_tools, call_tool, login/logout
    scan.py         # runner + report
  servers/
    good/server.js  # secure demo server
    bad/server.js   # insecure demo server
Quickstart
git clone <your-repo-url>
cd mcpsec-demo

# Secure server (all checks should pass)
python -m client.scan --cmd "node servers/good/server.js" --out results_good.json

# Insecure server (most checks should fail by design)
python -m client.scan --cmd "node servers/bad/server.js"  --out results_bad.json
