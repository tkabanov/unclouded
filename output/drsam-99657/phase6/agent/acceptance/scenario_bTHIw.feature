Feature: scenario:bTHIw

  Scenario: scenario:bTHIw
    Given workflow "bTHIw" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
