Feature: scenario:1987e176-a5f2-4299-9419-8bbd62d92093

  Scenario: scenario:1987e176-a5f2-4299-9419-8bbd62d92093
    Given workflow "1987e176-a5f2-4299-9419-8bbd62d92093" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
