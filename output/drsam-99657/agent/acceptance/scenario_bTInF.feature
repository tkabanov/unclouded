Feature: scenario:bTInF

  Scenario: scenario:bTInF
    Given workflow "bTInF" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
