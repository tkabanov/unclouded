Feature: scenario:f6263f3c-e3da-4b67-8418-d5da8053e3c5

  Scenario: scenario:f6263f3c-e3da-4b67-8418-d5da8053e3c5
    Given workflow "f6263f3c-e3da-4b67-8418-d5da8053e3c5" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
