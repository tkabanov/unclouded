Feature: scenario:9f1931cd-c17f-4ab6-9a04-ef6ba51f8076

  Scenario: scenario:9f1931cd-c17f-4ab6-9a04-ef6ba51f8076
    Given workflow "9f1931cd-c17f-4ab6-9a04-ef6ba51f8076" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
