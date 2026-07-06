Feature: scenario:bTHlK

  Scenario: scenario:bTHlK
    Given workflow "bTHlK" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
