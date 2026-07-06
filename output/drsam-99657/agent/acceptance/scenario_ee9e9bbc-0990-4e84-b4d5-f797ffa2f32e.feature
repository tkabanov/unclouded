Feature: scenario:ee9e9bbc-0990-4e84-b4d5-f797ffa2f32e

  Scenario: scenario:ee9e9bbc-0990-4e84-b4d5-f797ffa2f32e
    Given workflow "ee9e9bbc-0990-4e84-b4d5-f797ffa2f32e" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
