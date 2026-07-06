Feature: scenario:bTJGk

  Scenario: scenario:bTJGk
    Given workflow "bTJGk" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
