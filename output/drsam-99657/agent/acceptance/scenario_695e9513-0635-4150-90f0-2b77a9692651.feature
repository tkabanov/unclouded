Feature: scenario:695e9513-0635-4150-90f0-2b77a9692651

  Scenario: scenario:695e9513-0635-4150-90f0-2b77a9692651
    Given workflow "695e9513-0635-4150-90f0-2b77a9692651" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
