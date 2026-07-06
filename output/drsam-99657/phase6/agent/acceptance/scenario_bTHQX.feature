Feature: scenario:bTHQX

  Scenario: scenario:bTHQX
    Given workflow "bTHQX" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
