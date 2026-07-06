Feature: scenario:bTHVt

  Scenario: scenario:bTHVt
    Given workflow "bTHVt" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
