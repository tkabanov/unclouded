Feature: scenario:8715d0c7-2d87-4cbf-9cce-232c2d0b02fb

  Scenario: scenario:8715d0c7-2d87-4cbf-9cce-232c2d0b02fb
    Given workflow "8715d0c7-2d87-4cbf-9cce-232c2d0b02fb" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
