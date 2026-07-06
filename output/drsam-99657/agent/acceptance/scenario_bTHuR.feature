Feature: scenario:bTHuR

  Scenario: scenario:bTHuR
    Given workflow "bTHuR" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
