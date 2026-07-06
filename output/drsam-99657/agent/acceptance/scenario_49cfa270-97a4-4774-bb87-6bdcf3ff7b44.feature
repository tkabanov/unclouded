Feature: scenario:49cfa270-97a4-4774-bb87-6bdcf3ff7b44

  Scenario: scenario:49cfa270-97a4-4774-bb87-6bdcf3ff7b44
    Given workflow "49cfa270-97a4-4774-bb87-6bdcf3ff7b44" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
