Feature: scenario:8d1c5868-969b-454c-98a4-df7ab92f7155

  Scenario: scenario:8d1c5868-969b-454c-98a4-df7ab92f7155
    Given workflow "8d1c5868-969b-454c-98a4-df7ab92f7155" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
