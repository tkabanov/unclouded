Feature: scenario:29d79aa5-ff18-4adf-bf37-d8a4d33186d9

  Scenario: scenario:29d79aa5-ff18-4adf-bf37-d8a4d33186d9
    Given workflow "29d79aa5-ff18-4adf-bf37-d8a4d33186d9" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
