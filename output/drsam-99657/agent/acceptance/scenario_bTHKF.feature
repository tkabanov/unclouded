Feature: scenario:bTHKF

  Scenario: scenario:bTHKF
    Given workflow "bTHKF" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
