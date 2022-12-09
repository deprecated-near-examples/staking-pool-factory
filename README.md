# ⚠️⛔ DEPRECATED

> This project is not being actively supported, the code is not expected to work nor reflects the latests improvements in our tooling stack

Frontend for the staking pool factory deployed on the NEAR betanet.

It allows anyone to create and deploy their own staking pool by using NEAR Wallet.

Once the staking pool is created the owner of the staking pool can immediately delegate tokens and start staking.

## Contracts background

The current frontend is deployed on NEAR `betanet` network and uses the account `stakehouse.betanet`.

The factory uses contract from https://github.com/near/initial-contracts/tree/master/staking-pool-factory

The factory is initialized to use the whitelist contract deployed at the account `whitelist-beta`

Whitelist contract is https://github.com/near/initial-contracts/tree/master/whitelist

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
