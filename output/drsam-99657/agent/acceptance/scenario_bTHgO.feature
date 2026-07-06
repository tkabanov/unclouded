Feature: scenario:bTHgO

  Scenario: scenario:bTHgO
    Given workflow "bTHgO" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
