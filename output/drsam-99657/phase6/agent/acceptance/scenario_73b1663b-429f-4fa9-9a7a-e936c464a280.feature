Feature: scenario:73b1663b-429f-4fa9-9a7a-e936c464a280

  Scenario: scenario:73b1663b-429f-4fa9-9a7a-e936c464a280
    Given workflow "73b1663b-429f-4fa9-9a7a-e936c464a280" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
