## ADDED Requirements

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

### Requirement: Safe guard maintenance message
The system SHALL display a green confirmation banner indicating the portfolio is healthy if all asset class deviations are strictly within the 5% threshold.

#### Scenario: Display healthy banner when configuration is balanced
- **WHEN** the user loads the Overview page and all asset classes have deviations < 5%
- **THEN** the system SHALL display a subtle green confirmation banner showing that the portfolio is well-balanced
