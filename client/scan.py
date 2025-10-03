# client/scan.py
import argparse, json, shlex, uuid
from .mcp_client import McpClient

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cmd", required=True)
    args = ap.parse_args()
    cmd = shlex.split(args.cmd)

    client = McpClient(cmd)
    try:
        init = client.initialize()
        tools = client.list_tools()
        print("[init]", init)
        print("[tools]", json.dumps(tools, indent=2))

        # --- Authed call ---
        token = "SECRET"           # accepted by good server
        nonce = str(uuid.uuid4())  # unique per call
        res = client.authed_call(token, tools[0]["name"], {"msg": "ok"}, nonce=nonce, scope="read")
        print("[authed call]", res)

        # Replay check: same nonce again -> expect 403
        try:
            res2 = client.authed_call(token, tools[0]["name"], {"msg": "ok"}, nonce=nonce, scope="read")
            print("[replay]", res2)
        except Exception as e:
            print("[replay error]", e)

    finally:
        client.close()

if __name__ == "__main__":
    main()
