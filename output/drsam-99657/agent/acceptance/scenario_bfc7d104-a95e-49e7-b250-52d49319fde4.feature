Feature: scenario:bfc7d104-a95e-49e7-b250-52d49319fde4

  Scenario: scenario:bfc7d104-a95e-49e7-b250-52d49319fde4
    Given workflow "bfc7d104-a95e-49e7-b250-52d49319fde4" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
