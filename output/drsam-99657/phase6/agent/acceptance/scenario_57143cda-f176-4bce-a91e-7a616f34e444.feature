Feature: scenario:57143cda-f176-4bce-a91e-7a616f34e444

  Scenario: scenario:57143cda-f176-4bce-a91e-7a616f34e444
    Given workflow "57143cda-f176-4bce-a91e-7a616f34e444" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
