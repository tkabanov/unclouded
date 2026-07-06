Feature: scenario:b94a4040-6c99-4b17-8230-c517ed0b54c8

  Scenario: scenario:b94a4040-6c99-4b17-8230-c517ed0b54c8
    Given workflow "b94a4040-6c99-4b17-8230-c517ed0b54c8" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
