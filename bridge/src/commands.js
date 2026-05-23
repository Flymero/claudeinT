"use strict";

function handleCommand(cmd, session, router) {
  switch (cmd.cmd) {
    case "send":
      if (!cmd.message) {
        router.broadcast({ event: "error", message: "send requires 'message'" });
        return;
      }
      if (session.state === "running") {
        router.broadcast({ event: "error", message: "session is busy, wait for idle" });
        return;
      }
      session.send(cmd.message);
      break;

    case "abort":
      session.abort();
      break;

    case "approve":
      if (session.state !== "waiting_permission") {
        router.broadcast({ event: "error", message: "no pending permission request" });
        return;
      }
      if (!cmd.tool) {
        router.broadcast({ event: "error", message: "approve requires 'tool' name" });
        return;
      }
      session.approve(cmd.tool);
      router.broadcast({ event: "permission_granted", tool: cmd.tool });
      break;

    case "deny":
      session.deny();
      router.broadcast({ event: "permission_rejected" });
      break;

    case "stop":
      session.stop();
      router.broadcast({ event: "stopped" });
      break;

    case "resume":
      if (!cmd.sessionId) {
        router.broadcast({ event: "error", message: "resume requires 'sessionId'" });
        return;
      }
      session.resume(cmd.sessionId);
      break;

    case "status":
      router.broadcast({
        event: "status",
        state: session.state,
        sessionId: session.sessionId,
        alive: !!session.proc,
      });
      break;

    default:
      router.broadcast({ event: "error", message: `unknown command: ${cmd.cmd}` });
  }
}

module.exports = { handleCommand };
