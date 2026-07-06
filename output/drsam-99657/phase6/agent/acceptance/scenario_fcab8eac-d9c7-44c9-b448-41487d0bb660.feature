Feature: scenario:fcab8eac-d9c7-44c9-b448-41487d0bb660

  Scenario: scenario:fcab8eac-d9c7-44c9-b448-41487d0bb660
    Given workflow "fcab8eac-d9c7-44c9-b448-41487d0bb660" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
