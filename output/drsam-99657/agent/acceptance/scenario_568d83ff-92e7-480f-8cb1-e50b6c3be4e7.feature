Feature: scenario:568d83ff-92e7-480f-8cb1-e50b6c3be4e7

  Scenario: scenario:568d83ff-92e7-480f-8cb1-e50b6c3be4e7
    Given workflow "568d83ff-92e7-480f-8cb1-e50b6c3be4e7" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
