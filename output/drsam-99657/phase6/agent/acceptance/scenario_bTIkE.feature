Feature: scenario:bTIkE

  Scenario: scenario:bTIkE
    Given workflow "bTIkE" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
