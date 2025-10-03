# client/scan.py
import argparse, json, shlex, uuid, sys
from .mcp_client import McpClient

def expect_denied(fn):
    try: fn(); return False, None
    except Exception as e: return True, str(e)

def run_tests(c, tools):
    echo = next(t["name"] for t in tools if t["name"] == "echo")
    results = []

    # login
    auth = c.login(scope="read"); token = auth["token"]

    # OK call
    ok = c.authed_call(token, echo, {"msg":"ok"}, nonce=str(uuid.uuid4()), scope="read")
    results.append({"name":"ok_call", "pass": True, "detail": ok})

    # expired
    p, err = expect_denied(lambda: c.authed_call(token, echo, {"msg":"ok"}, nonce=str(uuid.uuid4()), scope="read", expired=True))
    results.append({"name":"expired_token_denied", "pass": p, "detail": err})

    # audience mismatch
    p, err = expect_denied(lambda: c.authed_call(token, echo, {"msg":"ok"}, nonce=str(uuid.uuid4()), scope="read", aud="wrong"))
    results.append({"name":"aud_mismatch_denied", "pass": p, "detail": err})

    # scope mismatch (if write tool exists)
    if any(t["name"] == "writeThing" for t in tools):
        p, err = expect_denied(lambda: c.authed_call(token, "writeThing", {"value":"x"}, nonce=str(uuid.uuid4()), scope="read"))
        results.append({"name":"scope_mismatch_denied", "pass": p, "detail": err})

    # replay
    n = str(uuid.uuid4())
    c.authed_call(token, echo, {"msg":"ok"}, nonce=n, scope="read")
    p, err = expect_denied(lambda: c.authed_call(token, echo, {"msg":"ok"}, nonce=n, scope="read"))
    results.append({"name":"replay_denied", "pass": p, "detail": err})

    # reuse after logout
    c.logout(token)
    p, err = expect_denied(lambda: c.authed_call(token, echo, {"msg":"ok"}, nonce=str(uuid.uuid4()), scope="read"))
    results.append({"name":"reuse_after_logout_denied", "pass": p, "detail": err})

    return results

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cmd", required=True)
    ap.add_argument("--out", default="results.json")
    args = ap.parse_args()
    cmd = shlex.split(args.cmd)

    c = McpClient(cmd)
    try:
        print("[init]", c.initialize())
        tools = c.list_tools()
        results = run_tests(c, tools)

        # pretty summary
        print("\nSummary:")
        for r in results:
            mark = "✅" if r["pass"] else "❌"
            print(f"{mark} {r['name']}")

        # save JSON report
        with open(args.out, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nSaved report → {args.out}")

        # CI-friendly exit
        if not all(r["pass"] for r in results):
            sys.exit(2)

    finally:
        c.close()

if __name__ == "__main__":
    main()
