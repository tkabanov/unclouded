Feature: scenario:bTInQ

  Scenario: scenario:bTInQ
    Given workflow "bTInQ" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
