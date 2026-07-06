Feature: scenario:bTJHg

  Scenario: scenario:bTJHg
    Given workflow "bTJHg" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
