Feature: scenario:bTIji

  Scenario: scenario:bTIji
    Given workflow "bTIji" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
