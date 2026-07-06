Feature: scenario:466654c5-af8a-4abb-9766-d31699a9f185

  Scenario: scenario:466654c5-af8a-4abb-9766-d31699a9f185
    Given workflow "466654c5-af8a-4abb-9766-d31699a9f185" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
