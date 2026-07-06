Feature: scenario:b28fe2f3-3f32-4d65-9e5b-0670a8291e57

  Scenario: scenario:b28fe2f3-3f32-4d65-9e5b-0670a8291e57
    Given workflow "b28fe2f3-3f32-4d65-9e5b-0670a8291e57" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
