Feature: scenario:8926ba83-20a7-4381-9b3f-caff75912d74

  Scenario: scenario:8926ba83-20a7-4381-9b3f-caff75912d74
    Given workflow "8926ba83-20a7-4381-9b3f-caff75912d74" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
