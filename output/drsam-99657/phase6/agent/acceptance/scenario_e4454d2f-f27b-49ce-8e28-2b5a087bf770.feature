Feature: scenario:e4454d2f-f27b-49ce-8e28-2b5a087bf770

  Scenario: scenario:e4454d2f-f27b-49ce-8e28-2b5a087bf770
    Given workflow "e4454d2f-f27b-49ce-8e28-2b5a087bf770" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
