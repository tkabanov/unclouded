Feature: scenario:88444679-d31d-435e-af74-4512f61eb310

  Scenario: scenario:88444679-d31d-435e-af74-4512f61eb310
    Given workflow "88444679-d31d-435e-af74-4512f61eb310" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
