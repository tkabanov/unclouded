Feature: scenario:fa6e2b3f-663a-4d9b-9c60-e1088ed4003a

  Scenario: scenario:fa6e2b3f-663a-4d9b-9c60-e1088ed4003a
    Given workflow "fa6e2b3f-663a-4d9b-9c60-e1088ed4003a" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
