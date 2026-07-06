Feature: scenario:bTIjt

  Scenario: scenario:bTIjt
    Given workflow "bTIjt" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
