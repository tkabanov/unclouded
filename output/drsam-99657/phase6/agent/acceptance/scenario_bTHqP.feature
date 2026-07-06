Feature: scenario:bTHqP

  Scenario: scenario:bTHqP
    Given workflow "bTHqP" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
