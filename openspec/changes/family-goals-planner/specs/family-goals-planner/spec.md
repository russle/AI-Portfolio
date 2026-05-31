## ADDED Requirements

### Requirement: Family Goal Planning Interface
The system SHALL provide a dedicated page at `/family` and render a family goal-based envelope planner. The page MUST feature a dual-column layout with a global budget control panel on the left and a grid of glassmorphic goal cards on the right. Each goal card SHALL display a visual progress bar, current accumulated amount, monthly budget, target amount, target years, target annual return, priority label, and the calculated success rate. When a card is clicked, the system SHALL display a detailed line chart showing the compound interest growth trajectory alongside a financial diagnosis report.

#### Scenario: Navigating to Family Goal Planner
- **WHEN** user clicks on the "Family" item in the sidebar navigation
- **THEN** the system SHALL render the Family Goal Planner page displaying the budget controller and goal grid

#### Scenario: Displaying goal details
- **WHEN** user clicks on a specific goal card
- **THEN** the system SHALL open a detailed drawer showing a Recharts line chart of the compound growth trajectory

##### Example: Displaying house goal details
- **GIVEN** a goal "House Purchase" with $300,000 current asset and $20,000 monthly investment
- **WHEN** user clicks on the "House Purchase" card
- **THEN** the system SHALL slide open a drawer rendering a Recharts line chart starting at $300,000 and growing based on compound interest

### Requirement: Priority-Based Budget Allocation
The system SHALL support a "Priority Weighting" budget allocation algorithm. Users SHALL be allowed to specify a "Family Monthly Budget Limit". When the sum of monthly budgets across all goals exceeds this family budget limit, the system SHALL satisfy the budget of the highest-priority goals first. The remaining budget SHALL then be allocated to lower-priority goals. Any goals with reduced budget allocation SHALL be visually highlighted in red with an explicit warning of the reduced success rate.

#### Scenario: Budget allocation under surplus
- **WHEN** the sum of all goals' monthly budgets is less than or equal to the Family Monthly Budget Limit
- **THEN** the system SHALL satisfy 100% of each goal's monthly budget

#### Scenario: Budget allocation under deficit
- **WHEN** the sum of all goals' monthly budgets exceeds the Family Monthly Budget Limit
- **THEN** the system SHALL satisfy the highest-priority goals first and highlight any underfunded goals with a red deficit warning

##### Example: Deficit budget allocation
| Family Budget | Goal A (Rigid First) Budget | Goal B (Important) Budget | Goal C (Flexible) Budget | Allocated A | Allocated B | Allocated C |
| ------------- | --------------------------- | ------------------------- | ------------------------ | ----------- | ----------- | ----------- |
| 40000         | 30000                       | 20000                     | 10000                    | 30000       | 10000       | 0           |
| 25000         | 30000                       | 20000                     | 10000                    | 25000       | 0           | 0           |

### Requirement: Retirement Page Restore to Individual
The system SHALL restore the retirement planning page to its original individual-only Monte Carlo simulation and crisis backtest workflows. The system SHALL remove all joint-retirement states, segmented dual-engine switches, Member A/B double panel forms, and dual-age X-axis matching from the retirement page.

#### Scenario: Accessing retirement planner
- **WHEN** user navigates to the `/retirement` page
- **THEN** the system SHALL only render the individual's retirement config panel and success rate gauge, without any couple-mode elements
