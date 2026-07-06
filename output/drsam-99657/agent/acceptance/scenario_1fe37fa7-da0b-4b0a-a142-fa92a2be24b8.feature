Feature: scenario:1fe37fa7-da0b-4b0a-a142-fa92a2be24b8

  Scenario: scenario:1fe37fa7-da0b-4b0a-a142-fa92a2be24b8
    Given workflow "1fe37fa7-da0b-4b0a-a142-fa92a2be24b8" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
