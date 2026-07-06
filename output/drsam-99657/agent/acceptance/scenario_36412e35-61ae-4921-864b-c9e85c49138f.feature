Feature: scenario:36412e35-61ae-4921-864b-c9e85c49138f

  Scenario: scenario:36412e35-61ae-4921-864b-c9e85c49138f
    Given workflow "36412e35-61ae-4921-864b-c9e85c49138f" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
