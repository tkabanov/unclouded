Feature: scenario:bTIrl

  Scenario: scenario:bTIrl
    Given workflow "bTIrl" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
