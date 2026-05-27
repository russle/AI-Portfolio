## ADDED Requirements

### Requirement: Batch fetching Yahoo Finance ticker prices
The price fetcher module SHALL support merging multiple ticker price fetch requests into a single batch network request to Yahoo Finance.

#### Scenario: Successfully batch fetch prices
- **WHEN** the user initiates a portfolio price sync with multiple tickers
- **THEN** the system SHALL trigger exactly one batch fetch request containing all the symbols

##### Example: Merged query string
- **GIVEN** tickers: '0050.TW', 'VOO', 'AAPL'
- **WHEN** price fetcher is invoked
- **THEN** it SHALL request URL with all tickers merged into a single query param or CSV symbol list

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
