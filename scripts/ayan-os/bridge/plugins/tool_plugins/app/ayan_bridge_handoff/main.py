"""AYAN adapter for the published TypeTale Python tool-plugin contract.

No imports with side effects, filesystem, network, process or model access.
The host owns ToolClient and all host-side permissions.
"""
import math


def _handoff(value):
    if not isinstance(value, dict) or set(value) != {"schemaVersion", "taskId", "shots"}:
        return {"ok": False, "error": "INVALID_HANDOFF"}
    if value["schemaVersion"] != 1 or not isinstance(value["taskId"], str) or not value["taskId"].strip():
        return {"ok": False, "error": "INVALID_HANDOFF"}
    shots = value["shots"]
    if not isinstance(shots, list) or not 1 <= len(shots) <= 200:
        return {"ok": False, "error": "INVALID_SHOTS"}
    identifiers = set()
    total = 0.0
    for shot in shots:
        if not isinstance(shot, dict) or set(shot) != {"id", "duration", "prompt"}:
            return {"ok": False, "error": "INVALID_SHOT"}
        identifier, duration, prompt = shot["id"], shot["duration"], shot["prompt"]
        if not isinstance(identifier, str) or not identifier.strip() or identifier in identifiers:
            return {"ok": False, "error": "INVALID_SHOT_ID"}
        if isinstance(duration, bool) or not isinstance(duration, (float, int)) or not math.isfinite(duration) or not 0 < duration <= 60:
            return {"ok": False, "error": "INVALID_DURATION"}
        if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 10000:
            return {"ok": False, "error": "INVALID_PROMPT"}
        identifiers.add(identifier)
        total += duration
    return {"ok": True, "shotCount": len(shots), "totalSeconds": round(total, 3),
            "generatedMedia": False, "productionAssetWrites": False}


async def execute(context):
    args = context.get("arguments") or {}
    if not isinstance(args, dict) or set(args) - {"operation", "handoff"}:
        return {"ok": False, "error": "POLICY_DENIED"}
    operation = args.get("operation")
    if operation == "handoff-check":
        return _handoff(args.get("handoff"))
    if operation == "status" and "handoff" not in args:
        tools = context.get("tools")
        if tools is None:
            return {"ok": False, "error": "HOST_CONTEXT_REQUIRED"}
        try:
            result = await tools.call_tool("zzdh_connection_status", {})
        except Exception:
            return {"ok": False, "error": "HOST_TOOL_FAILED"}
        if not isinstance(result, dict) or result.get("error") or result.get("success") is False or result.get("ok") is False:
            return {"ok": False, "error": "HOST_TOOL_FAILED"}
        # Do not forward active project paths, backend ports, or unknown fields.
        return {"ok": True, "hostToolResponded": True, "inference": False}
    return {"ok": False, "error": "POLICY_DENIED"}


async def self_test(context):
    sample = {"schemaVersion": 1, "taskId": "self-test",
              "shots": [{"id": "01", "duration": 30, "prompt": "Opening"},
                        {"id": "02", "duration": 30, "prompt": "Closing"}]}
    result = await execute({"arguments": {"operation": "handoff-check", "handoff": sample}})
    assert result["ok"] and result["shotCount"] == 2 and result["totalSeconds"] == 60
    sample["shots"][1]["id"] = "01"
    assert not (await execute({"arguments": {"operation": "handoff-check", "handoff": sample}}))["ok"]
    sample["shots"][1]["id"] = "02"
    sample["shots"][0]["duration"] = True
    assert not (await execute({"arguments": {"operation": "handoff-check", "handoff": sample}}))["ok"]

    class MockTools:
        def __init__(self):
            self.calls = []
            self.fail = False

        async def call_tool(self, name, arguments):
            self.calls.append((name, arguments))
            if self.fail:
                return {"success": False, "error": "test failure"}
            return {"connected": True, "project_path": "must-not-be-forwarded"}

    tools = MockTools()
    status = await execute({"arguments": {"operation": "status"}, "tools": tools})
    assert status == {"ok": True, "hostToolResponded": True, "inference": False}
    assert tools.calls == [("zzdh_connection_status", {})]
    tools.fail = True
    assert (await execute({"arguments": {"operation": "status"}, "tools": tools}))["error"] == "HOST_TOOL_FAILED"
    assert (await execute({"arguments": {"operation": "generate"}}))["error"] == "POLICY_DENIED"
    return {"ok": True, "summary": "Deterministic handoff and read-only host response checks passed",
            "checks": [{"id": "handoff", "ok": True}, {"id": "host_status_contract", "ok": True}],
            "artifacts": []}

