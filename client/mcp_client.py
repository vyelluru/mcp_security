# client/mcp_client.py
from typing import Any
from .rpc import StdioProcess, JsonRpc

class McpClient:
    def __init__(self, cmd: list[str], env: dict | None = None):
        self.io = StdioProcess(cmd, env)
        self.rpc = JsonRpc(self.io)

    def close(self):
        self.io.kill()

    # ---- Core MCP-ish calls (names are placeholders; match your servers) ----
    def initialize(self) -> dict:
        return self.rpc.request("initialize", {"client":"mcpsec-demo","version":"0.1"})

    def list_tools(self) -> list[dict[str, Any]]:
        return self.rpc.request("listTools", {})

    def call_tool(self, name: str, args: dict, meta: dict | None = None) -> dict:
        # meta can carry Authorization, nonce, audience, etc.
        return self.rpc.request("callTool", {"name": name, "args": args, "meta": meta or {}})

    # convenience: one-shot call with header hooks
    def authed_call(self, token: str, name: str, args: dict, nonce: str | None = None, **extras):
        meta = {"Authorization": f"Bearer {token}"}
        if nonce: meta["nonce"] = nonce
        meta.update(extras)
        return self.call_tool(name, args, meta)
