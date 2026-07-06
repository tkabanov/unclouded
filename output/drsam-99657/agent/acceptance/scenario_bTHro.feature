Feature: scenario:bTHro

  Scenario: scenario:bTHro
    Given workflow "bTHro" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
