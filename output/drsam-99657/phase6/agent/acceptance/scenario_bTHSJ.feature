Feature: scenario:bTHSJ

  Scenario: scenario:bTHSJ
    Given workflow "bTHSJ" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
