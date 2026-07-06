Feature: scenario:bTHIT

  Scenario: scenario:bTHIT
    Given workflow "bTHIT" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
