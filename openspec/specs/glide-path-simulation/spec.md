# glide-path-simulation Specification

## Purpose

TBD - created by archiving change 'portfolio-optimization-bundle'. Update Purpose after archive.

## Requirements

### Requirement: Dynamic glide path configuration
The system SHALL support configuring a dynamic Glide Path model that automatically shifts asset allocation from high-risk (stocks/crypto) to conservative (bonds/cash) as the simulated age increases.

#### Scenario: Verify stock weight Glide Path decay
- **WHEN** the simulated age progresses during a Monte Carlo timeline step
- **THEN** the system SHALL calculate the new target weights using a linear age-based glide path formula

##### Example: Glide Path weight decay formula
- **GIVEN** simulated starting age: 30
- **GIVEN** target high-risk asset (stocks) initial weight: 80%
- **GIVEN** Glide Path rule is set to: `Target Stock % = Max(0.2, 110 - Age)`
- **WHEN** the simulated age reaches 50
- **THEN** the high-risk target weight SHALL slide to 60%
- **WHEN** the simulated age reaches 95
- **THEN** the high-risk target weight SHALL slide to 20% (lower boundary)


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
### Requirement: Monte Carlo integration with glide path
The Monte Carlo simulation engine SHALL apply the dynamically computed glide path weights to calculate the portfolio's expected return and standard deviation for each year of the simulation.

#### Scenario: Apply glide path to yearly simulation step
- **WHEN** simulating the investment return for a specific year in a path
- **THEN** the simulation engine SHALL compute the weighted average return and volatility based on the dynamic glide path weights of that year

##### Example: Dynamic returns calculation
- **GIVEN** stock return: 8%, bond return: 3%
- **GIVEN** age 30: stocks weight 80%, bonds weight 20%
- **GIVEN** age 60: stocks weight 50%, bonds weight 50%
- **WHEN** simulating year age 30
- **THEN** the baseline expected return of the step SHALL be 7.0%
- **WHEN** simulating year age 60
- **THEN** the baseline expected return of the step SHALL be 5.5%

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