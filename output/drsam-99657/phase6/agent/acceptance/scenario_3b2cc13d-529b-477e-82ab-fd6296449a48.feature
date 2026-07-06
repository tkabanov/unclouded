Feature: scenario:3b2cc13d-529b-477e-82ab-fd6296449a48

  Scenario: scenario:3b2cc13d-529b-477e-82ab-fd6296449a48
    Given workflow "3b2cc13d-529b-477e-82ab-fd6296449a48" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
