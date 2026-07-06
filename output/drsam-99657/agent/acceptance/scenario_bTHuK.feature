Feature: scenario:bTHuK

  Scenario: scenario:bTHuK
    Given workflow "bTHuK" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
