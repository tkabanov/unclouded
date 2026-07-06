Feature: scenario:bTHgZ

  Scenario: scenario:bTHgZ
    Given workflow "bTHgZ" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
