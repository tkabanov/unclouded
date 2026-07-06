Feature: scenario:bTIjP

  Scenario: scenario:bTIjP
    Given workflow "bTIjP" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
