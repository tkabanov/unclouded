Feature: scenario:bTHqI

  Scenario: scenario:bTHqI
    Given workflow "bTHqI" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
