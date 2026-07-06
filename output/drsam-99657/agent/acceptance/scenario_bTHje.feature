Feature: scenario:bTHje

  Scenario: scenario:bTHje
    Given workflow "bTHje" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
