Feature: scenario:bTHkz

  Scenario: scenario:bTHkz
    Given workflow "bTHkz" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
