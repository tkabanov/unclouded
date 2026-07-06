Feature: scenario:bTHlR

  Scenario: scenario:bTHlR
    Given workflow "bTHlR" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
