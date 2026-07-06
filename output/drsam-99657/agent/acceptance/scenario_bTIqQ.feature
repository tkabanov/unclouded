Feature: scenario:bTIqQ

  Scenario: scenario:bTIqQ
    Given workflow "bTIqQ" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
