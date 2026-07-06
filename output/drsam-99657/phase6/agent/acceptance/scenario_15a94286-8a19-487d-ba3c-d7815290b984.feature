Feature: scenario:15a94286-8a19-487d-ba3c-d7815290b984

  Scenario: scenario:15a94286-8a19-487d-ba3c-d7815290b984
    Given workflow "15a94286-8a19-487d-ba3c-d7815290b984" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
