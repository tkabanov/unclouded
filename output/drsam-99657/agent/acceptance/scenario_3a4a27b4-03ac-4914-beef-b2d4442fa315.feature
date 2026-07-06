Feature: scenario:3a4a27b4-03ac-4914-beef-b2d4442fa315

  Scenario: scenario:3a4a27b4-03ac-4914-beef-b2d4442fa315
    Given workflow "3a4a27b4-03ac-4914-beef-b2d4442fa315" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
