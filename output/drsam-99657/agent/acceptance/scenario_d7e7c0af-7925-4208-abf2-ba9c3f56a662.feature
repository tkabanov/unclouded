Feature: scenario:d7e7c0af-7925-4208-abf2-ba9c3f56a662

  Scenario: scenario:d7e7c0af-7925-4208-abf2-ba9c3f56a662
    Given workflow "d7e7c0af-7925-4208-abf2-ba9c3f56a662" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
