Feature: scenario:bTHPg

  Scenario: scenario:bTHPg
    Given workflow "bTHPg" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
