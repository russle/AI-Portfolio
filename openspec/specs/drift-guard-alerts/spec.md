# drift-guard-alerts Specification

## Purpose

TBD - created by archiving change 'drift-guard-alerts'. Update Purpose after archive.

## Requirements

### Requirement: Portfolio drift threshold checking
The system SHALL monitor the percentage deviation of all asset classes and trigger an active alert if any asset class deviates from its target allocation by 5% or more.

#### Scenario: Display drift alert banner when deviation is high
- **WHEN** the user loads the Overview page and at least one asset class has a deviation >= 5%
- **THEN** the system SHALL display a prominent glow warning banner with navigation shortcuts

##### Example: Deviation checking cases
| Class | Current % | Target % | Absolute Deviation | Trigger Alert |
|---|---|---|---|---|
| TW Stock | 46.5% | 40.0% | 6.5% | Yes |
| US Stock | 48.0% | 50.0% | 2.0% | No |
| Cash | 5.5% | 10.0% | 4.5% | No |


<!-- @trace
source: drift-guard-alerts
updated: 2026-05-28
code:
  - .github/prompts/spectra-discuss.prompt.md
  - .github/skills/spectra-discuss/SKILL.md
  - .opencode/commands/spectra-archive.md
  - .opencode/skills/spectra-discuss/SKILL.md
  - .opencode/skills/spectra-audit/SKILL.md
  - .opencode/skills/spectra-archive/SKILL.md
  - .opencode/skills/spectra-propose/SKILL.md
  - .github/skills/spectra-drift/SKILL.md
  - .github/prompts/spectra-apply.prompt.md
  - .opencode/commands/spectra-ask.md
  - GEMINI.md
  - .opencode/skills/spectra-debug/SKILL.md
  - src/pages/OverviewPage.tsx
  - .github/prompts/spectra-ask.prompt.md
  - .github/skills/spectra-archive/SKILL.md
  - .github/prompts/spectra-ingest.prompt.md
  - .opencode/skills/spectra-commit/SKILL.md
  - AGENTS.md
  - .github/prompts/spectra-drift.prompt.md
  - .opencode/commands/spectra-propose.md
  - .opencode/commands/spectra-drift.md
  - .opencode/skills/spectra-ask/SKILL.md
  - .github/prompts/spectra-audit.prompt.md
  - .opencode/commands/spectra-apply.md
  - .opencode/skills/spectra-apply/SKILL.md
  - .opencode/commands/spectra-discuss.md
  - .opencode/commands/spectra-commit.md
  - .github/skills/spectra-audit/SKILL.md
  - .github/prompts/spectra-commit.prompt.md
  - .github/prompts/spectra-debug.prompt.md
  - .github/skills/spectra-debug/SKILL.md
  - .opencode/commands/spectra-audit.md
  - .github/skills/spectra-ask/SKILL.md
  - .github/skills/spectra-ingest/SKILL.md
  - CLAUDE.md
  - .github/prompts/spectra-archive.prompt.md
  - .github/skills/spectra-apply/SKILL.md
  - .cursorrules
  - .github/skills/spectra-commit/SKILL.md
  - .github/skills/spectra-propose/SKILL.md
  - .github/prompts/spectra-propose.prompt.md
  - .opencode/commands/spectra-debug.md
  - .opencode/skills/spectra-ingest/SKILL.md
  - .opencode/commands/spectra-ingest.md
  - .opencode/skills/spectra-drift/SKILL.md
-->

---
### Requirement: Safe guard maintenance message
The system SHALL display a green confirmation banner indicating the portfolio is healthy if all asset class deviations are strictly within the 5% threshold.

#### Scenario: Display healthy banner when configuration is balanced
- **WHEN** the user loads the Overview page and all asset classes have deviations < 5%
- **THEN** the system SHALL display a subtle green confirmation banner showing that the portfolio is well-balanced

<!-- @trace
source: drift-guard-alerts
updated: 2026-05-28
code:
  - .github/prompts/spectra-discuss.prompt.md
  - .github/skills/spectra-discuss/SKILL.md
  - .opencode/commands/spectra-archive.md
  - .opencode/skills/spectra-discuss/SKILL.md
  - .opencode/skills/spectra-audit/SKILL.md
  - .opencode/skills/spectra-archive/SKILL.md
  - .opencode/skills/spectra-propose/SKILL.md
  - .github/skills/spectra-drift/SKILL.md
  - .github/prompts/spectra-apply.prompt.md
  - .opencode/commands/spectra-ask.md
  - GEMINI.md
  - .opencode/skills/spectra-debug/SKILL.md
  - src/pages/OverviewPage.tsx
  - .github/prompts/spectra-ask.prompt.md
  - .github/skills/spectra-archive/SKILL.md
  - .github/prompts/spectra-ingest.prompt.md
  - .opencode/skills/spectra-commit/SKILL.md
  - AGENTS.md
  - .github/prompts/spectra-drift.prompt.md
  - .opencode/commands/spectra-propose.md
  - .opencode/commands/spectra-drift.md
  - .opencode/skills/spectra-ask/SKILL.md
  - .github/prompts/spectra-audit.prompt.md
  - .opencode/commands/spectra-apply.md
  - .opencode/skills/spectra-apply/SKILL.md
  - .opencode/commands/spectra-discuss.md
  - .opencode/commands/spectra-commit.md
  - .github/skills/spectra-audit/SKILL.md
  - .github/prompts/spectra-commit.prompt.md
  - .github/prompts/spectra-debug.prompt.md
  - .github/skills/spectra-debug/SKILL.md
  - .opencode/commands/spectra-audit.md
  - .github/skills/spectra-ask/SKILL.md
  - .github/skills/spectra-ingest/SKILL.md
  - CLAUDE.md
  - .github/prompts/spectra-archive.prompt.md
  - .github/skills/spectra-apply/SKILL.md
  - .cursorrules
  - .github/skills/spectra-commit/SKILL.md
  - .github/skills/spectra-propose/SKILL.md
  - .github/prompts/spectra-propose.prompt.md
  - .opencode/commands/spectra-debug.md
  - .opencode/skills/spectra-ingest/SKILL.md
  - .opencode/commands/spectra-ingest.md
  - .opencode/skills/spectra-drift/SKILL.md
-->