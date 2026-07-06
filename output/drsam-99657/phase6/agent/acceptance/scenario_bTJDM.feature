Feature: scenario:bTJDM

  Scenario: scenario:bTJDM
    Given workflow "bTJDM" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
