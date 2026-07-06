Feature: scenario:bTHEH

  Scenario: scenario:bTHEH
    Given workflow "bTHEH" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
