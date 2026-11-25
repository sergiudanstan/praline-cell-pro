# Security Policy

This is a static, browser-only digital twin: one generated `index.html` and a display model (`cad/t3.glb`), with no backend, no accounts and no data sent anywhere. It loads three.js from the jsDelivr CDN at a pinned version (`three@0.186.1`) and Google Fonts. The page fetches `cad/t3.glb` from its own origin. Developer-only tools in `tools/` (build, screenshots, film recording, STEP-to-GLB conversion) run on the maintainer's machine and are not part of the published page.

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ Current |

Single maintainer; only the latest release receives fixes.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.** Report it privately:
**[Report a vulnerability](https://github.com/sergiudanstan/praline-cell-pro/security/advisories/new)**
(Security → Advisories → Report a vulnerability).

| Stage | Target |
|---|---|
| Acknowledgement | within 3 business days |
| Triage | within 10 business days |
| Fix, or a documented decision not to fix | within 90 days |

These are best-effort targets from a single unpaid maintainer, not a contractual SLA.
There is no bug bounty; credit is offered in the advisory and changelog.

## Scope

In scope: script injection through the page or through URL parameters (`?cad=0` and similar), the page loading code from any origin other than the pinned CDN URLs, a malformed `cad/t3.glb` handling that goes beyond a rendering failure, `tools/` scripts that execute untrusted input unsafely, and anything in this repository's workflows that could publish a release not built from `main`.

Out of scope: vulnerabilities in three.js, the CDN or Google Fonts (report upstream), the accuracy of the simulation (a correctness bug: file it as a normal issue), and the licensing of the Epson-derived model (see `THIRD_PARTY_NOTICES.md`).

## Supply chain

CI rebuilds `index.html` from `src/` and compares it with the committed file, runs the cell-logic checks (and a perturbed run that must fail), a headless page smoke test on every push, `npm audit` on the test tooling, `pip-audit` on the hash-pinned CI toolchain, CodeQL, and `zizmor` on the workflows.
Actions are pinned to full commit SHAs and kept current by Dependabot. Releases attach a
source archive with Sigstore build provenance:

```
gh attestation verify praline-cell-pro-v0.1.0.tar.gz --repo sergiudanstan/praline-cell-pro
```
