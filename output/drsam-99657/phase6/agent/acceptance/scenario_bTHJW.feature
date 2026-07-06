Feature: scenario:bTHJW

  Scenario: scenario:bTHJW
    Given workflow "bTHJW" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
