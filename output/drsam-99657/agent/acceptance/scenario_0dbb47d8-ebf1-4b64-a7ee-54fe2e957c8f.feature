Feature: scenario:0dbb47d8-ebf1-4b64-a7ee-54fe2e957c8f

  Scenario: scenario:0dbb47d8-ebf1-4b64-a7ee-54fe2e957c8f
    Given workflow "0dbb47d8-ebf1-4b64-a7ee-54fe2e957c8f" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
