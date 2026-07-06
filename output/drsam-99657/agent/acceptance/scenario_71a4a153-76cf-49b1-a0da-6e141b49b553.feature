Feature: scenario:71a4a153-76cf-49b1-a0da-6e141b49b553

  Scenario: scenario:71a4a153-76cf-49b1-a0da-6e141b49b553
    Given workflow "71a4a153-76cf-49b1-a0da-6e141b49b553" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
