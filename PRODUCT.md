# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers, QA engineers, tech leads, and autonomous AI coding agents collaborating on codebases that maintain a manual QA contract (`test-truth.md`).

## Product Purpose

Keep manual QA scenarios, drift detection, and coverage graphs in tight lockstep with evolving source code without requiring heavy external SaaS infrastructure.

## Positioning

A lightweight, local-first CLI, MCP server, and interactive viewer that bridges Git file changes with living QA contracts, blocking drift before code hits production.

## Operating Context

- Development environment: Local terminal, IDEs (VS Code, Cursor, Windsurf), CI/CD pipelines (GitHub Actions).
- Local viewer: A standalone single-page application served via `testweave ui` on an available loopback port (or a selected `--port`), rendering a scenario catalog, a dedicated test-document table with browser-local pass/fail and comment notes, live drift diagnostics, coverage graphs, and semantic diffs.

## Capabilities and Constraints

- Local web viewer rendered via self-contained HTML/CSS/JS in `src/ui/page.ts`.
- Zero client-side external CDN script/style dependencies; works entirely offline.
- Semantic HTML, accessible keyboard navigation, and an accessible multi-column test-document table (`ID`, `Title`, `Preconditions`, `Ordered steps` with `#`/`Action`/`Data`/`Expected`, `Priority`, `Pass / Fail`, `Comment`).
- Browser-local Pass/Fail and comment annotations remain isolated in `localStorage` keyed by stable test IDs, separate from `test-truth.md` and all canonical contract/export/schema data.

## Brand Commitments

- Calm, purposeful engineering tool aesthetic with useful density and restrained styling.
- Colors: Warm paper canvas, white rounded panels, dark ink active navigation, thread-teal and mint branding, muted blue selection and coral attention accents; green is reserved for healthy status.
- Typography: Clean system sans-serif for prose and labels paired with tabular monospace metadata precision.

## Product Principles

1. Local-first and private: no mandatory cloud accounts or external tracking.
2. Fast and lightweight: instant page renders and seamless interaction.
3. High scanability: clarity over ornamentation for complex QA coverage and diff data.
