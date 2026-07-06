Feature: scenario:9c07373c-4c78-48ff-bba9-5655d98d9f4c

  Scenario: scenario:9c07373c-4c78-48ff-bba9-5655d98d9f4c
    Given workflow "9c07373c-4c78-48ff-bba9-5655d98d9f4c" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
