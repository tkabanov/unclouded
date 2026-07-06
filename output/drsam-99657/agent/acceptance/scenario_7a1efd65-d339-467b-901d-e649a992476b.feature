Feature: scenario:7a1efd65-d339-467b-901d-e649a992476b

  Scenario: scenario:7a1efd65-d339-467b-901d-e649a992476b
    Given workflow "7a1efd65-d339-467b-901d-e649a992476b" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
