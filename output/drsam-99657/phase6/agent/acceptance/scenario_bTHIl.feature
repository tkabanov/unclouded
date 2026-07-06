Feature: scenario:bTHIl

  Scenario: scenario:bTHIl
    Given workflow "bTHIl" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
