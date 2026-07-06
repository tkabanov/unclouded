Feature: scenario:bTHNQ

  Scenario: scenario:bTHNQ
    Given workflow "bTHNQ" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
