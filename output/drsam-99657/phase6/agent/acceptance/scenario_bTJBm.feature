Feature: scenario:bTJBm

  Scenario: scenario:bTJBm
    Given workflow "bTJBm" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
