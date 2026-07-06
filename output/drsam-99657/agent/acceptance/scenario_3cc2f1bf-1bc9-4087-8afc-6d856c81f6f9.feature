Feature: scenario:3cc2f1bf-1bc9-4087-8afc-6d856c81f6f9

  Scenario: scenario:3cc2f1bf-1bc9-4087-8afc-6d856c81f6f9
    Given workflow "3cc2f1bf-1bc9-4087-8afc-6d856c81f6f9" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
