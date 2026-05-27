# batch-price-fetch Specification

## Purpose

TBD - created by archiving change 'portfolio-optimization-bundle'. Update Purpose after archive.

## Requirements

### Requirement: Batch fetching Yahoo Finance ticker prices
The price fetcher module SHALL support merging multiple ticker price fetch requests into a single batch network request to Yahoo Finance.

#### Scenario: Successfully batch fetch prices
- **WHEN** the user initiates a portfolio price sync with multiple tickers
- **THEN** the system SHALL trigger exactly one batch fetch request containing all the symbols

##### Example: Merged query string
- **GIVEN** tickers: '0050.TW', 'VOO', 'AAPL'
- **WHEN** price fetcher is invoked
- **THEN** it SHALL request URL with all tickers merged into a single query param or CSV symbol list


<!-- @trace
source: portfolio-optimization-bundle
updated: 2026-05-27
code:
  - src/utils/priceFetcher.ts
  - .opencode/commands/spectra-propose.md
  - .opencode/commands/spectra-commit.md
  - .opencode/commands/spectra-archive.md
  - .opencode/skills/spectra-audit/SKILL.md
  - .opencode/commands/spectra-ask.md
  - src/pages/RetirementPage.tsx
  - .opencode/commands/spectra-apply.md
  - .opencode/commands/spectra-ingest.md
  - .opencode/skills/spectra-discuss/SKILL.md
  - .github/skills/spectra-ask/SKILL.md
  - .opencode/commands/spectra-debug.md
  - .opencode/skills/spectra-ask/SKILL.md
  - .github/prompts/spectra-ask.prompt.md
  - .spectra.yaml
  - .github/skills/spectra-propose/SKILL.md
  - .github/skills/spectra-archive/SKILL.md
  - .opencode/commands/spectra-drift.md
  - .github/skills/spectra-ingest/SKILL.md
  - src/utils/retirement.ts
  - .opencode/skills/spectra-apply/SKILL.md
  - .github/prompts/spectra-ingest.prompt.md
  - AGENTS.md
  - .github/skills/spectra-commit/SKILL.md
  - .opencode/commands/spectra-audit.md
  - .github/prompts/spectra-commit.prompt.md
  - .github/prompts/spectra-propose.prompt.md
  - .opencode/commands/spectra-discuss.md
  - CLAUDE.md
  - .github/prompts/spectra-archive.prompt.md
  - src/utils/rebalance.ts
  - .github/skills/spectra-debug/SKILL.md
  - .cursorrules
  - .github/skills/spectra-discuss/SKILL.md
  - .opencode/skills/spectra-drift/SKILL.md
  - .github/skills/spectra-drift/SKILL.md
  - GEMINI.md
  - .github/prompts/spectra-debug.prompt.md
  - .opencode/skills/spectra-archive/SKILL.md
  - .opencode/skills/spectra-debug/SKILL.md
  - .github/prompts/spectra-drift.prompt.md
  - .github/prompts/spectra-apply.prompt.md
  - .github/prompts/spectra-discuss.prompt.md
  - .github/skills/spectra-apply/SKILL.md
  - .github/skills/spectra-audit/SKILL.md
  - .opencode/skills/spectra-commit/SKILL.md
  - .github/prompts/spectra-audit.prompt.md
  - src/pages/OrderPage.tsx
  - .opencode/skills/spectra-ingest/SKILL.md
  - .opencode/skills/spectra-propose/SKILL.md
-->

---
### Requirement: Ticker price TTL caching
The system SHALL cache retrieved ticker prices in LocalStorage with a 15-minute Time-To-Live (TTL).

#### Scenario: Load price from cache within TTL
- **WHEN** the user requests a price update for a ticker within 15 minutes of the last successful fetch
- **THEN** the system SHALL load the price from local cache without triggering a new network request

##### Example: Cache status over time
| Time Elapsed | Target | Network Request | Load Source |
|---|---|---|---|
| 0 min | 'VOO' | Yes | Remote API |
| 5 min | 'VOO' | No | Local Cache |
| 16 min | 'VOO' | Yes | Remote API |

<!-- @trace
source: portfolio-optimization-bundle
updated: 2026-05-27
code:
  - src/utils/priceFetcher.ts
  - .opencode/commands/spectra-propose.md
  - .opencode/commands/spectra-commit.md
  - .opencode/commands/spectra-archive.md
  - .opencode/skills/spectra-audit/SKILL.md
  - .opencode/commands/spectra-ask.md
  - src/pages/RetirementPage.tsx
  - .opencode/commands/spectra-apply.md
  - .opencode/commands/spectra-ingest.md
  - .opencode/skills/spectra-discuss/SKILL.md
  - .github/skills/spectra-ask/SKILL.md
  - .opencode/commands/spectra-debug.md
  - .opencode/skills/spectra-ask/SKILL.md
  - .github/prompts/spectra-ask.prompt.md
  - .spectra.yaml
  - .github/skills/spectra-propose/SKILL.md
  - .github/skills/spectra-archive/SKILL.md
  - .opencode/commands/spectra-drift.md
  - .github/skills/spectra-ingest/SKILL.md
  - src/utils/retirement.ts
  - .opencode/skills/spectra-apply/SKILL.md
  - .github/prompts/spectra-ingest.prompt.md
  - AGENTS.md
  - .github/skills/spectra-commit/SKILL.md
  - .opencode/commands/spectra-audit.md
  - .github/prompts/spectra-commit.prompt.md
  - .github/prompts/spectra-propose.prompt.md
  - .opencode/commands/spectra-discuss.md
  - CLAUDE.md
  - .github/prompts/spectra-archive.prompt.md
  - src/utils/rebalance.ts
  - .github/skills/spectra-debug/SKILL.md
  - .cursorrules
  - .github/skills/spectra-discuss/SKILL.md
  - .opencode/skills/spectra-drift/SKILL.md
  - .github/skills/spectra-drift/SKILL.md
  - GEMINI.md
  - .github/prompts/spectra-debug.prompt.md
  - .opencode/skills/spectra-archive/SKILL.md
  - .opencode/skills/spectra-debug/SKILL.md
  - .github/prompts/spectra-drift.prompt.md
  - .github/prompts/spectra-apply.prompt.md
  - .github/prompts/spectra-discuss.prompt.md
  - .github/skills/spectra-apply/SKILL.md
  - .github/skills/spectra-audit/SKILL.md
  - .opencode/skills/spectra-commit/SKILL.md
  - .github/prompts/spectra-audit.prompt.md
  - src/pages/OrderPage.tsx
  - .opencode/skills/spectra-ingest/SKILL.md
  - .opencode/skills/spectra-propose/SKILL.md
-->