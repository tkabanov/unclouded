Feature: scenario:878f540b-f371-4140-96c5-64f8408f7701

  Scenario: scenario:878f540b-f371-4140-96c5-64f8408f7701
    Given workflow "878f540b-f371-4140-96c5-64f8408f7701" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
