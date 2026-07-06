Feature: scenario:bea28d92-b569-4dd0-b452-783894e2b903

  Scenario: scenario:bea28d92-b569-4dd0-b452-783894e2b903
    Given workflow "bea28d92-b569-4dd0-b452-783894e2b903" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
