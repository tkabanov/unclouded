Feature: scenario:c577e231-140a-4424-bdd6-169bb5c43f57

  Scenario: scenario:c577e231-140a-4424-bdd6-169bb5c43f57
    Given workflow "c577e231-140a-4424-bdd6-169bb5c43f57" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
