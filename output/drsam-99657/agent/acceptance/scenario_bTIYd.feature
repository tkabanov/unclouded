Feature: scenario:bTIYd

  Scenario: scenario:bTIYd
    Given workflow "bTIYd" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
