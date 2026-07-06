Feature: scenario:bTHDH

  Scenario: scenario:bTHDH
    Given workflow "bTHDH" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
