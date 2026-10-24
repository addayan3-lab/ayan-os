"""Verify installed AYAN tool plugin using only the official bundled TypeTale Python.
This does not start the app, use its internal endpoints, or trigger generation.
"""
import asyncio
import importlib.util
import json
import pathlib
import sys

if len(sys.argv) != 2:
    raise SystemExit("usage: verify-installed-plugin.py path-to-main.py")
plugin_path = pathlib.Path(sys.argv[1])
manifest = json.loads((plugin_path.parent / "plugin.json").read_text(encoding="utf-8-sig"))
assert manifest["name"] == "ayan_bridge_handoff"
assert manifest["scope"] == "app"
assert manifest["expose_as_tool"] is True
assert plugin_path.is_file()
spec = importlib.util.spec_from_file_location("ayan_bridge_handoff", plugin_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
result = asyncio.run(module.self_test({}))
assert result.get("ok") is True, "Self-test failed"
print(json.dumps({"officialBundledPython": True, "pluginSelfTest": True,
                  "hostExecution": "not-verified", "generation": False}, ensure_ascii=True))
