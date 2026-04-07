# CI, README, and Porting Guide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add GitHub Actions CI for the frontend, improve the README with a full development guide, and document how to fold histlens into histserv as a first-party dashboard.

**Architecture:** Three independent changes — a pixi.toml platform fix to unblock Linux CI, a single GHA workflow file running all frontend quality checks, and README prose covering local dev, CI, and the porting migration path.

**Tech Stack:** pixi (prefix-dev/setup-pixi GHA action), bun, Vite, Svelte, Vitest, ESLint, Prettier, svelte-check.

---

### Task 1: Add linux-64 to pixi.toml platforms

pixi.toml currently only lists `osx-arm64`, which would make CI fail on the default `ubuntu-latest` runner.

**Files:**
- Modify: `pixi.toml`

**Step 1: Add linux-64 platform**

Change:
```toml
platforms = ["osx-arm64"]
```
To:
```toml
platforms = ["osx-arm64", "linux-64"]
```

**Step 2: Also add a `dashboard-install` pixi task** so CI can install frontend deps before running any other task:

```toml
dashboard-install = { cmd = "bun install", cwd = "dashboard" }
```

**Step 3: Regenerate pixi.lock**

```bash
pixi install
```

This will extend pixi.lock with linux-64 entries. Expect the file to grow — that's correct.

**Step 4: Commit**

```bash
git add pixi.toml pixi.lock
git commit -m "build: add linux-64 platform and dashboard-install task for CI"
```

---

### Task 2: Create GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Write the workflow**

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  frontend:
    name: Frontend (${{ matrix.check }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        check: [test, lint, check, build]

    steps:
      - uses: actions/checkout@v4

      - uses: prefix-dev/setup-pixi@v0
        with:
          pixi-version: latest
          cache: true

      - name: Install frontend dependencies
        run: pixi run dashboard-install

      - name: Run ${{ matrix.check }}
        run: pixi run dashboard-${{ matrix.check }}
```

Key choices:
- `prefix-dev/setup-pixi@v0` handles pixi install + `pixi install` + caching the pixi env
- Matrix over `[test, lint, check, build]` gives independent pass/fail per check
- `dashboard-install` runs `bun install` in `dashboard/` before any check
- `actions/checkout@v4` (not v6 — histserv uses v6 but that's for their own repo; v4 is current stable for new workflows)

**Step 2: Verify locally that the tasks exist**

```bash
pixi run dashboard-test   # should run vitest
pixi run dashboard-lint   # should run eslint
pixi run dashboard-check  # should run svelte-check + tsc
pixi run dashboard-build  # should run vite build
```

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions frontend CI workflow"
```

---

### Task 3: Rewrite README

**Files:**
- Modify: `README.md`

The README needs:
1. **What is this** — one paragraph, link to histserv
2. **Quickstart** — the minimal path to see it running (server + dev server)
3. **Development guide** — install deps, run tests, lint, format, type-check, build
4. **Repository layout** — file tree with purpose of each directory
5. **pixi task reference** — table of all tasks
6. **Porting guide** — how to move this into the histserv repo (see below)

**Porting guide content (key section):**

The porting guide should explain three things:
1. **What to copy** — `dashboard/` directory goes into `histserv/` (suggested path: `src/histserv/dashboard-ui/`)
2. **How to wire the build output** — update `pyproject.toml` to include `dist/` via hatch wheel include, update `bridge.py` / `server.py` to locate and pass `static_dir` at runtime using `importlib.resources` or `__file__`
3. **How to automate the build** — either commit a pre-built `dist/` (simplest, suitable for releases) or add a `hatch_build.py` custom hook that runs `bun install && bun run build` during wheel packaging

Concrete example for the `static_dir` wiring in `server.py`:

```python
# Locate the bundled frontend assets installed with the package
from pathlib import Path
_DASHBOARD_DIST = Path(__file__).parent / "dashboard-ui" / "dist"

async def _start_dashboard(self, port: int) -> None:
    from histserv.dashboard import create_app
    import uvicorn
    static_dir = _DASHBOARD_DIST if _DASHBOARD_DIST.is_dir() else None
    app = create_app(self.histogrammer, static_dir=static_dir)
    config = uvicorn.Config(app=app, host="0.0.0.0", port=port, log_level="warning")
    await uvicorn.Server(config).serve()
```

And the hatch wheel include addition to `pyproject.toml`:

```toml
[tool.hatch.build.targets.wheel]
packages = ["src/histserv"]
include = ["src/histserv/dashboard-ui/dist/**"]
```

**Step 1: Write the full README** (complete rewrite)

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README with dev guide, CI docs, and porting guide"
```

---

### Task 4: Verify everything locally

```bash
pixi run dashboard-install
pixi run dashboard-test    # 16 tests pass
pixi run dashboard-lint    # no errors
pixi run dashboard-check   # no errors
pixi run dashboard-build   # dist/ produced
```
