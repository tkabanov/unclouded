Feature: scenario:3f883200-6bb6-419a-8a0a-600b1dd2558a

  Scenario: scenario:3f883200-6bb6-419a-8a0a-600b1dd2558a
    Given workflow "3f883200-6bb6-419a-8a0a-600b1dd2558a" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
