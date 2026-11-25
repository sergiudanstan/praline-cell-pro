# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-25

First tagged release of Praline Cell Pro, the hi-fi browser digital twin of the praline packing cell (a delta robot and two SCARA robots in a guarded aluminium frame, with belt-timing what-if). The page is built from `src/` into `index.html`. Published at https://sergiudanstan.github.io/praline-cell-pro/.

### Added
- CI builds the page from `src/` and fails if the committed `index.html` differs; it runs the cell-logic checks (including the belt what-if cycle times), a `--perturb` run that must fail, and a headless page smoke test.
- CI, CodeQL (JavaScript and Python), OpenSSF Scorecard and a tag-triggered release workflow with build provenance; Dependabot for actions and npm.
- `package.json` as the version source, `SECURITY.md`, `CONTRIBUTING.md` and this changelog.

[Unreleased]: https://github.com/sergiudanstan/praline-cell-pro/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sergiudanstan/praline-cell-pro/releases/tag/v0.1.0
