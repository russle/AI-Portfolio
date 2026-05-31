## ADDED Requirements

### Requirement: Joint retirement configuration panel
The system SHALL provide a high-fidelity control panel that allows users to toggle between Individual and Joint retirement modes and input parameters for both spouses.

#### Scenario: Toggle joint retirement inputs
- **WHEN** the user loads the retirement page and selects the joint retirement mode option
- **THEN** the system SHALL dynamically render configuration fields for both spouses, including current age, planned retirement age, life expectancy, personal retirement spending, personal retirement passive income, and a separate joint family baseline spending field.

##### Example: Form fields rendered
- **GIVEN** the retirement page is loaded
- **WHEN** the user selects the "Joint" mode option
- **THEN** the system displays Member A inputs (Age, Retire Age, Life Expectancy, Spending, Income), Member B inputs, and Family Joint Spending.

### Requirement: Dynamic four-stage decumulation simulation
The system SHALL evaluate joint retirement feasibility using a dynamic multi-stage decumulation model that spans the combined lifecycles of both spouses and runs a Monte Carlo engine to calculate the safety survival rate.

#### Scenario: Joint Monte Carlo simulation run
- **WHEN** the user triggers the retirement simulation in joint mode
- **THEN** the system SHALL simulate 1,000 wealth progression paths, evaluating four lifecycle stages (dual employment, single retirement transition, dual retirement cohabitation, and single survivor longevity), and output the final joint safety survival probability.
