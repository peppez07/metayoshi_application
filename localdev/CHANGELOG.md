# Changelog

All notable changes to this repository should be documented here.

## [Unreleased]

### Added

- GitHub community health files, issue templates, CI workflow, and Dependabot configuration
- release checklist and release-readiness audit documentation
- standard support, contribution, and conduct guidance

### Changed

- refreshed README structure for public GitHub publication
- added `npm run test` and `npm run check:release`
- added repository engine metadata and release-oriented package metadata

### Fixed

- refreshed the dependency tree and lockfile until `npm audit --omit=dev` returned clean
- local environment and build profile files are now ignored for GitHub publication
- verbose runtime asset debug logging was removed from wallet asset loading paths
- temporary repository scratch script `scripts/tmp-import-test.ts` was removed

## [0.2.1] - 2026-04-05

### Notes

- Public GitHub release candidate baseline for MetaYoshi Wallet
