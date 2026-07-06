Feature: scenario:bTIja

  Scenario: scenario:bTIja
    Given workflow "bTIja" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
