Feature: scenario:3fcc570a-f07e-463d-9f67-3d90ac974e3f

  Scenario: scenario:3fcc570a-f07e-463d-9f67-3d90ac974e3f
    Given workflow "3fcc570a-f07e-463d-9f67-3d90ac974e3f" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
