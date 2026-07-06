Feature: scenario:bTHjl

  Scenario: scenario:bTHjl
    Given workflow "bTHjl" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
