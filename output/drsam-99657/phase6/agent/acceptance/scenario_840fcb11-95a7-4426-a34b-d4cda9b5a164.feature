Feature: scenario:840fcb11-95a7-4426-a34b-d4cda9b5a164

  Scenario: scenario:840fcb11-95a7-4426-a34b-d4cda9b5a164
    Given workflow "840fcb11-95a7-4426-a34b-d4cda9b5a164" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
