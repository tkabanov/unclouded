Feature: scenario:bTHNF

  Scenario: scenario:bTHNF
    Given workflow "bTHNF" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
