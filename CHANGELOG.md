# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.8] - 2019-05-20
### Added
- Remove contract function on CMC contract
- Add on deploy contract script in migrations, the contract.name = cmc

### Fixed
- Deploy and verified v4 users contract
- Deploy and verified v2 reputation contract
- Deploy and verified v4 cmc contract

## [0.1.7] - 2019-05-14
### Added
- Verified contract of user v4
- Verified contract of cmc v2 and v3
- Verified contract of lending v5 and v6
- Verified contract of reputation v2
- CHANGELOG

### Fixed
- Now the ethers that are left over when the cap is reached and the contribution
has been made by the gateway, are sent to the investor and not to the gateway
- Now the calculation of interest, when lending days are zero, is equal to 0%
and not variable depending on the days that have passed since the end of the
project and the day that is claimed
- CMC version is 3

### Removed
- In lending contract unused global variable borrowerReturnDate
- In lending contract unused modifier onlyInvestorOrPaymentGateway

[Unreleased]: https://gitlab.com/ShariaHub/platform-contracts/compare/v0.1.8...master
[0.1.7]: https://gitlab.com/ShariaHub/platform-contracts/compare/v0.1.6...v0.1.7
[0.1.8]: https://gitlab.com/ShariaHub/platform-contracts/compare/v0.1.7...v0.1.8
