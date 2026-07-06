Feature: scenario:bTJDw

  Scenario: scenario:bTJDw
    Given workflow "bTJDw" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
