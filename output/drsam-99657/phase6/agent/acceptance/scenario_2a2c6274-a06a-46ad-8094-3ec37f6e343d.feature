Feature: scenario:2a2c6274-a06a-46ad-8094-3ec37f6e343d

  Scenario: scenario:2a2c6274-a06a-46ad-8094-3ec37f6e343d
    Given workflow "2a2c6274-a06a-46ad-8094-3ec37f6e343d" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
