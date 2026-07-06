Feature: scenario:bTIYM

  Scenario: scenario:bTIYM
    Given workflow "bTIYM" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
