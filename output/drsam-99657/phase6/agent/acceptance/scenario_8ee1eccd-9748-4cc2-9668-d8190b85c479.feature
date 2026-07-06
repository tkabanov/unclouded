Feature: scenario:8ee1eccd-9748-4cc2-9668-d8190b85c479

  Scenario: scenario:8ee1eccd-9748-4cc2-9668-d8190b85c479
    Given workflow "8ee1eccd-9748-4cc2-9668-d8190b85c479" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
