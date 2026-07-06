Feature: scenario:fabbc169-21d7-4d32-bd5f-a9d7ff5d5063

  Scenario: scenario:fabbc169-21d7-4d32-bd5f-a9d7ff5d5063
    Given workflow "fabbc169-21d7-4d32-bd5f-a9d7ff5d5063" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
