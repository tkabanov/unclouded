Feature: scenario:74e01d84-6295-410e-9ee0-bf846bbb26b8

  Scenario: scenario:74e01d84-6295-410e-9ee0-bf846bbb26b8
    Given workflow "74e01d84-6295-410e-9ee0-bf846bbb26b8" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
