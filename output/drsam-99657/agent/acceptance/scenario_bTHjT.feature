Feature: scenario:bTHjT

  Scenario: scenario:bTHjT
    Given workflow "bTHjT" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
