Feature: scenario:bTJDB

  Scenario: scenario:bTJDB
    Given workflow "bTJDB" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
