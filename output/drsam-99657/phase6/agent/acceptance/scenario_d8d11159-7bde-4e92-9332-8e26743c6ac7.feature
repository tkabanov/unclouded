Feature: scenario:d8d11159-7bde-4e92-9332-8e26743c6ac7

  Scenario: scenario:d8d11159-7bde-4e92-9332-8e26743c6ac7
    Given workflow "d8d11159-7bde-4e92-9332-8e26743c6ac7" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
