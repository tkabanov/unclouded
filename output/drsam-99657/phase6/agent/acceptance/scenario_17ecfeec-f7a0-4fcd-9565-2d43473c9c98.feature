Feature: scenario:17ecfeec-f7a0-4fcd-9565-2d43473c9c98

  Scenario: scenario:17ecfeec-f7a0-4fcd-9565-2d43473c9c98
    Given workflow "17ecfeec-f7a0-4fcd-9565-2d43473c9c98" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
