Feature: scenario:bTHUs

  Scenario: scenario:bTHUs
    Given workflow "bTHUs" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
