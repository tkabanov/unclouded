Feature: scenario:bTImE

  Scenario: scenario:bTImE
    Given workflow "bTImE" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
