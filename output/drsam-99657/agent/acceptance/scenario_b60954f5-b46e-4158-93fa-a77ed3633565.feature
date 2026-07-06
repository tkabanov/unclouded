Feature: scenario:b60954f5-b46e-4158-93fa-a77ed3633565

  Scenario: scenario:b60954f5-b46e-4158-93fa-a77ed3633565
    Given workflow "b60954f5-b46e-4158-93fa-a77ed3633565" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
