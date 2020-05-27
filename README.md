# [Staking Pool Factory Frontend](https://near-examples.github.io/staking-pool-factory/)

Frontend for the staking pool factory deployed on the NEAR betanet.

It allows anyone to create and deploy their own staking pool by using NEAR Wallet.

Once the staking pool is created the owner of the staking pool can immediately delegate tokens and start staking.

## Contracts background

The current frontend is deployed on the `betanet` and uses the account `stakehouse.betanet`
Requires an account deployed on the network with the contract binary located at https://github.com/near/initial-contracts/raw/master/staking-pool-factory/res/staking_pool_factory.wasm

The factory is initialized with the whitelist contract at account `whitelist-beta` with binary https://github.com/near/initial-contracts/raw/master/whitelist/res/whitelist.wasm


### Install dependencies

```bash
yarn
```

### Run locally

```bash
yarn start
```

### Deploy to github pages

```bash
yarn deploy
```
