Feature: scenario:66a20a90-0235-4913-a98c-156a742ae3b2

  Scenario: scenario:66a20a90-0235-4913-a98c-156a742ae3b2
    Given workflow "66a20a90-0235-4913-a98c-156a742ae3b2" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
