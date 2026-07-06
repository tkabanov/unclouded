Feature: scenario:bTHRr

  Scenario: scenario:bTHRr
    Given workflow "bTHRr" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
