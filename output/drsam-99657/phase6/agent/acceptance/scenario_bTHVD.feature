Feature: scenario:bTHVD

  Scenario: scenario:bTHVD
    Given workflow "bTHVD" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
