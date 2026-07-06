Feature: scenario:bTIkX

  Scenario: scenario:bTIkX
    Given workflow "bTIkX" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
