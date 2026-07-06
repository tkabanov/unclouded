Feature: scenario:bTHrd

  Scenario: scenario:bTHrd
    Given workflow "bTHrd" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
