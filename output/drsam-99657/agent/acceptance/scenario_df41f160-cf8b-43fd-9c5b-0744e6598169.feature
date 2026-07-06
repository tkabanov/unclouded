Feature: scenario:df41f160-cf8b-43fd-9c5b-0744e6598169

  Scenario: scenario:df41f160-cf8b-43fd-9c5b-0744e6598169
    Given workflow "df41f160-cf8b-43fd-9c5b-0744e6598169" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
