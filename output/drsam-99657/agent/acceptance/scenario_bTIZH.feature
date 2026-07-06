Feature: scenario:bTIZH

  Scenario: scenario:bTIZH
    Given workflow "bTIZH" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
