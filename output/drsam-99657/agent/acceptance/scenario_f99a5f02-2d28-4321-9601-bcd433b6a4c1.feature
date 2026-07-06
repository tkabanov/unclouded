Feature: scenario:f99a5f02-2d28-4321-9601-bcd433b6a4c1

  Scenario: scenario:f99a5f02-2d28-4321-9601-bcd433b6a4c1
    Given workflow "f99a5f02-2d28-4321-9601-bcd433b6a4c1" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
