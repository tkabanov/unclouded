Feature: scenario:bTJBU

  Scenario: scenario:bTJBU
    Given workflow "bTJBU" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
