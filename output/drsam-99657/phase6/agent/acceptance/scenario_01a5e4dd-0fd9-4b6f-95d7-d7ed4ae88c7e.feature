Feature: scenario:01a5e4dd-0fd9-4b6f-95d7-d7ed4ae88c7e

  Scenario: scenario:01a5e4dd-0fd9-4b6f-95d7-d7ed4ae88c7e
    Given workflow "01a5e4dd-0fd9-4b6f-95d7-d7ed4ae88c7e" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
