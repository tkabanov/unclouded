Feature: scenario:bTIkM

  Scenario: scenario:bTIkM
    Given workflow "bTIkM" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
