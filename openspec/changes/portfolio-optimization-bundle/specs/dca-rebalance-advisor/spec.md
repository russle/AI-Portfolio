## ADDED Requirements

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
