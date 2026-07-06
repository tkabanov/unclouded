Feature: scenario:bTHrv

  Scenario: scenario:bTHrv
    Given workflow "bTHrv" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
