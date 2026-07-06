Feature: scenario:a5fd67c6-23e5-42ee-89de-f5899cf777b7

  Scenario: scenario:a5fd67c6-23e5-42ee-89de-f5899cf777b7
    Given workflow "a5fd67c6-23e5-42ee-89de-f5899cf777b7" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
