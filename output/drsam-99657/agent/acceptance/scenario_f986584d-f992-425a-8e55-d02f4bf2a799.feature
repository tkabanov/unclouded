Feature: scenario:f986584d-f992-425a-8e55-d02f4bf2a799

  Scenario: scenario:f986584d-f992-425a-8e55-d02f4bf2a799
    Given workflow "f986584d-f992-425a-8e55-d02f4bf2a799" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
