Feature: scenario:e9892330-2717-437e-80b4-d28014cdf3b9

  Scenario: scenario:e9892330-2717-437e-80b4-d28014cdf3b9
    Given workflow "e9892330-2717-437e-80b4-d28014cdf3b9" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
