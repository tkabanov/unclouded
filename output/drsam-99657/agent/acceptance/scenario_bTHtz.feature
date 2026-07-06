Feature: scenario:bTHtz

  Scenario: scenario:bTHtz
    Given workflow "bTHtz" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
