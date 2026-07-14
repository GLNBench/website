#!/usr/bin/env python3
"""Validate and render GLNBench's public manifest as a browser script."""

import argparse
import json
from pathlib import Path


REQUIRED_KEYS = {
    "schema_version", "repository", "datasets", "methods", "backbones",
    "noise_types", "modes", "samplers", "normalizations",
    "jumping_knowledge", "devices", "defaults",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    manifest = json.loads(args.input.read_text(encoding="utf-8"))
    missing = sorted(REQUIRED_KEYS - manifest.keys())
    if missing:
        raise SystemExit(f"Manifest is missing required keys: {', '.join(missing)}")

    modified = next(
        (item for item in manifest["backbones"] if item.get("id") == "gcn_modified"),
        None,
    )
    if not modified or not modified.get("variants"):
        raise SystemExit("gcn_modified must declare its inner GNN variants")

    for method in manifest["methods"]:
        parameters = method.get("parameters")
        if not isinstance(parameters, dict):
            raise SystemExit(f"{method.get('id', 'unknown')} must declare a parameters object")
        for name, specification in parameters.items():
            if "type" not in specification or "default" not in specification:
                raise SystemExit(
                    f"{method['id']}.{name} must declare type and default"
                )

    payload = json.dumps(manifest, ensure_ascii=False, indent=2)
    args.output.write_text(
        "/* Generated from GLNBench/benchmark_manifest.json. Do not edit by hand. */\n"
        f"window.GLNBENCH_MANIFEST = {payload};\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
