Feature: scenario:801d38a2-368e-4220-b880-11921cdf5919

  Scenario: scenario:801d38a2-368e-4220-b880-11921cdf5919
    Given workflow "801d38a2-368e-4220-b880-11921cdf5919" is materialized
    When the deterministic baseline runs
    Then the generated artifacts stay stable
