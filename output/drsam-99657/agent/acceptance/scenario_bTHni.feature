Feature: scenario:bTHni

  Scenario: scenario:bTHni
    Given workflow "bTHni" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
