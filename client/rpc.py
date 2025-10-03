# client/rpc.py
import json, threading, queue, subprocess, sys, os, uuid, time

class StdioProcess:
    def __init__(self, cmd: list[str], env: dict | None = None):
        self.proc = subprocess.Popen(
            cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, bufsize=1, env={**os.environ, **(env or {})}
        )
        self._q = queue.Queue()
        self._alive = True
        self._reader = threading.Thread(target=self._read_stdout, daemon=True)
        self._reader.start()

    def _read_stdout(self):
        try:
            for line in self.proc.stdout:
                line = line.strip()
                if line:
                    self._q.put(line)
        finally:
            self._alive = False

    def send_line(self, line: str):
        if not self.proc or self.proc.stdin.closed:
            raise RuntimeError("Process stdin closed")
        self.proc.stdin.write(line + "\n")
        self.proc.stdin.flush()

    def recv_line(self, timeout=5.0) -> str | None:
        try: return self._q.get(timeout=timeout)
        except queue.Empty: return None

    def kill(self):
        if self.proc and self.proc.poll() is None:
            self.proc.kill()

class JsonRpc:
    def __init__(self, io: StdioProcess):
        self.io = io

    def request(self, method: str, params: dict | None = None, timeout=5.0):
        msg_id = str(uuid.uuid4())
        payload = {"jsonrpc":"2.0","id":msg_id,"method":method,"params":params or {}}
        self.io.send_line(json.dumps(payload))
        t0 = time.time()
        while time.time() - t0 < timeout:
            line = self.io.recv_line(timeout=timeout)
            if not line: break
            try:
                msg = json.loads(line)
                if msg.get("id") == msg_id:
                    if "error" in msg: raise RuntimeError(msg["error"])
                    return msg.get("result")
            except json.JSONDecodeError:
                # Ignore non-JSON noise/log lines
                continue
        raise TimeoutError(f"RPC timeout: {method}")
