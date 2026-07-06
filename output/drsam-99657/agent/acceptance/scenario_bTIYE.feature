Feature: scenario:bTIYE

  Scenario: scenario:bTIYE
    Given workflow "bTIYE" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
