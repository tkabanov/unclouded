Feature: scenario:e5f563c3-00b3-4a9d-a8b6-e4aedfbd05ad

  Scenario: scenario:e5f563c3-00b3-4a9d-a8b6-e4aedfbd05ad
    Given workflow "e5f563c3-00b3-4a9d-a8b6-e4aedfbd05ad" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
