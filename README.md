# GLNBench website

Static GitHub Pages site for GLNBench. It intentionally has no backend,
analytics, third-party JavaScript, or runtime network requests.

- `index.html` is the project landing page.
- `builder.html` is the experiment configuration builder.
- `builder-manifest.js` is generated from the code repository's canonical
  `benchmark_manifest.json` using:

  ```bash
  python3 tools/export_builder_manifest.py website/builder-manifest.js
  ```

Contributors update `benchmark_manifest.json` in `GLNBench/GLNBench` whenever
they add or change supported datasets, methods, backbones, noise types, variants,
or defaults. Code-side synchronization tests reject registry changes that omit
the corresponding manifest entry.

After the canonical manifest reaches the GLNBench `main` branch, the daily and
manually dispatchable `Sync benchmark manifest` workflow downloads and
validates it, regenerates only `builder-manifest.js`, and opens a pull request
in this repository. Merge that pull request to publish the change on GitHub
Pages. The workflow uses this repository's built-in `GITHUB_TOKEN`; no personal
token is required.

The export command above remains available for local preview and troubleshooting.
Do not edit `builder-manifest.js` manually.
