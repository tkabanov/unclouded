Feature: scenario:88cc85f8-2e68-43a6-a827-054a588d3773

  Scenario: scenario:88cc85f8-2e68-43a6-a827-054a588d3773
    Given workflow "88cc85f8-2e68-43a6-a827-054a588d3773" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
