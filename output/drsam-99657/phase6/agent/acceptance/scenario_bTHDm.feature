Feature: scenario:bTHDm

  Scenario: scenario:bTHDm
    Given workflow "bTHDm" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
