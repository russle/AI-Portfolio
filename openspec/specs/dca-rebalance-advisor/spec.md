# dca-rebalance-advisor Specification

## Purpose

TBD - created by archiving change 'portfolio-optimization-bundle'. Update Purpose after archive.

## Requirements

### Requirement: DCA budget single-directional allocation
The system SHALL support dynamic allocation of a fixed Monthly Regular Budget (DCA budget) only to under-allocated assets, ensuring no asset is recommended for selling.

#### Scenario: Allocate budget to under-allocated assets
- **WHEN** the user inputs a regular monthly DCA investment budget
- **THEN** the system SHALL distribute the budget proportionally only among assets with a positive target gap (ideal value > actual value)

##### Example: DCA allocation calculation
- **GIVEN** portfolio total net worth: 1,000,000 TWD
- **GIVEN** target weights: Stock-A (50%), Stock-B (50%)
- **GIVEN** actual values: Stock-A (600,000 TWD, over-allocated), Stock-B (400,000 TWD, under-allocated)
- **GIVEN** DCA investment budget: 50,000 TWD
- **WHEN** DCA rebalance advisor is computed
- **THEN** Stock-A SHALL receive 0 TWD allocation
- **THEN** Stock-B SHALL receive 50,000 TWD allocation


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
### Requirement: Shares conversion with remaining cash
The system SHALL convert the allocated DCA budget for each ticker into observable shares based on current price, and calculate the remaining cash.

#### Scenario: Successfully convert allocated amount to shares
- **WHEN** the DCA budget allocation completes for a ticker
- **THEN** the advisor SHALL compute recommended buying shares as `floor(allocated_amount / price)` and remaining cash as `allocated_amount - (shares * price)`

##### Example: Shares conversion
- **GIVEN** allocated budget: 10,000 TWD
- **GIVEN** stock ticker price: 3,000 TWD
- **WHEN** converting to shares
- **THEN** it SHALL recommend buying 3 shares
- **THEN** the remaining cash for this ticker SHALL be 1,000 TWD

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