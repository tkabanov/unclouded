Feature: scenario:c6f0370b-b434-4c50-a7ad-bf43d7c804f8

  Scenario: scenario:c6f0370b-b434-4c50-a7ad-bf43d7c804f8
    Given workflow "c6f0370b-b434-4c50-a7ad-bf43d7c804f8" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
