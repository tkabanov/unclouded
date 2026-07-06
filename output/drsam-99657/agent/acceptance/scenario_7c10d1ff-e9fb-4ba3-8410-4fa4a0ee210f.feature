Feature: scenario:7c10d1ff-e9fb-4ba3-8410-4fa4a0ee210f

  Scenario: scenario:7c10d1ff-e9fb-4ba3-8410-4fa4a0ee210f
    Given workflow "7c10d1ff-e9fb-4ba3-8410-4fa4a0ee210f" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
