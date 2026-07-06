Feature: scenario:bTIVW

  Scenario: scenario:bTIVW
    Given workflow "bTIVW" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
