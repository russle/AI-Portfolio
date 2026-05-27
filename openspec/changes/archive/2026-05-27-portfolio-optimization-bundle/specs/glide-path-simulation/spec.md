## ADDED Requirements

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
