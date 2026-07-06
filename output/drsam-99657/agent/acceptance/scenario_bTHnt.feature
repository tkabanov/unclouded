Feature: scenario:bTHnt

  Scenario: scenario:bTHnt
    Given workflow "bTHnt" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
