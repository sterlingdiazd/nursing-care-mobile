import { execFileSync } from "node:child_process";

const rawPort = process.argv[2];

if (!rawPort || !/^\d+$/.test(rawPort)) {
  console.error("Usage: node scripts/release-port.mjs <port>");
  process.exit(1);
}

const port = Number(rawPort);

function listPidsForPort(targetPort) {
  try {
    const output = execFileSync(
      "/usr/sbin/lsof",
      ["-tiTCP:" + targetPort, "-sTCP:LISTEN"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();

    return output ? output.split("\n").filter(Boolean) : [];
  } catch {
    return [];
  }
}

function killPids(pids, signal) {
  for (const pid of pids) {
    try {
      process.kill(Number(pid), signal);
    } catch {
      // Ignore races where the process is already gone.
    }
  }
}

const pids = listPidsForPort(port);

if (pids.length === 0) {
  process.exit(0);
}

console.log(`Releasing port ${port} from PID(s): ${pids.join(", ")}`);
killPids(pids, "SIGTERM");

const deadline = Date.now() + 3000;
while (Date.now() < deadline) {
  if (listPidsForPort(port).length === 0) {
    process.exit(0);
  }
}

const remaining = listPidsForPort(port);
if (remaining.length > 0) {
  console.log(`Force killing remaining PID(s) on port ${port}: ${remaining.join(", ")}`);
  killPids(remaining, "SIGKILL");
}
