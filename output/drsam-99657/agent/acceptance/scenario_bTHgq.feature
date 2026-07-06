Feature: scenario:bTHgq

  Scenario: scenario:bTHgq
    Given workflow "bTHgq" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
