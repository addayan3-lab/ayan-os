"""Run the official-contract plugin under the installed TypeTale Python runtime.

This harness lives outside the plugin; the plugin itself uses no filesystem,
network, subprocess, imports of the host internals, or private API endpoints.
"""
import importlib.util
import json
import pathlib
import sys


async def main():
    directory = pathlib.Path(__file__).parent / "plugins/tool_plugins/app/ayan_bridge_handoff"
    manifest = json.loads((directory / "plugin.json").read_text(encoding="utf-8-sig"))
    assert manifest["scope"] == directory.parent.name == "app"
    assert manifest["name"] == directory.name and manifest["expose_as_tool"] is True
    assert manifest["declared_capabilities"][0]["requires_tools"] == ["zzdh_connection_status"]
    spec = importlib.util.spec_from_file_location("tool_plugin_ayan_bridge_handoff", directory / "main.py")
    plugin = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(plugin)
    self_test = await plugin.self_test({})
    handoff = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
    result = await plugin.execute({"arguments": {"operation": "handoff-check", "handoff": handoff}})
    print(json.dumps({"selfTest": self_test["ok"], "handoff": result}))


if __name__ == "__main__":
    # These self-tests await only pure local coroutines; no event loop or sockets.
    coroutine = main()
    try:
        coroutine.send(None)
    except StopIteration:
        pass
    else:
        coroutine.close()
        raise RuntimeError("Unexpected asynchronous I/O in deterministic self-test")

