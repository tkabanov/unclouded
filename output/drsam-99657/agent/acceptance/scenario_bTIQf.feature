Feature: scenario:bTIQf

  Scenario: scenario:bTIQf
    Given workflow "bTIQf" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
