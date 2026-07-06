Feature: scenario:bTIYo

  Scenario: scenario:bTIYo
    Given workflow "bTIYo" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
