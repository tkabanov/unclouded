Feature: scenario:bTHoA

  Scenario: scenario:bTHoA
    Given workflow "bTHoA" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
