Feature: scenario:44add8db-33d1-408a-89c8-4427450732a6

  Scenario: scenario:44add8db-33d1-408a-89c8-4427450732a6
    Given workflow "44add8db-33d1-408a-89c8-4427450732a6" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
