Feature: scenario:c8bd5476-3703-4166-804b-1b368764858d

  Scenario: scenario:c8bd5476-3703-4166-804b-1b368764858d
    Given workflow "c8bd5476-3703-4166-804b-1b368764858d" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
