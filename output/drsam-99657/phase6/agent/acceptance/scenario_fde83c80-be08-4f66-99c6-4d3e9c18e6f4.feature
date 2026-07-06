Feature: scenario:fde83c80-be08-4f66-99c6-4d3e9c18e6f4

  Scenario: scenario:fde83c80-be08-4f66-99c6-4d3e9c18e6f4
    Given workflow "fde83c80-be08-4f66-99c6-4d3e9c18e6f4" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
