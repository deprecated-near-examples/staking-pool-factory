import "./App.css";
import React from 'react';
import * as nearAPI from 'near-api-js';
import BN from 'bn.js';
import {PublicKey} from "near-api-js/lib/utils";

const YourStakingPoolIdKey = "your_staking_pool_id";
const OneNear = new BN("1000000000000000000000000");
const ContractName = 'stakehouse.betanet';
const MinAccountIdLen = 2;
const MaxAccountIdLen = 64;
const ValidAccountRe = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;
const ValidFactoryIdRe = /^([a-z\d]+[-_])*[a-z\d]+$/
const GAS = new BN("200000000000000")

const fromYocto = (a) => Math.floor(a / OneNear * 1000) / 1000;

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      connected: false,
      signedIn: false,
      creating: false,
      accountId: null,
      stakingPoolAccountLoading: false,
      stakingPoolAlreadyExists: false,

      ownerId: "",
      stakingPoolId: "",
      stakePublicKey: "",
      rewardFeeFraction: {
        numerator: 10,
        denominator: 100,
      },

      yourStakingPoolAccountId: null,
      poolSuccess: false,
    };

    this._initNear().then(() => {
      this.setState({
        connected: true,
        signedIn: !!this._accountId,
        accountId: this._accountId,
        ownerId: this._accountId,
      })
    })
  }

  async _initYourStakingPool() {
    const stakingPoolId = window.localStorage.getItem(YourStakingPoolIdKey);
    if (!stakingPoolId) {
      return;
    }

    const yourStakingPoolAccountId = `${stakingPoolId}.${ContractName}`;
    try {
      await this._near.connection.provider.query(`account/${yourStakingPoolAccountId}`, '');
      this.setState({
        yourStakingPoolAccountId,
        poolSuccess: true,
      });
    } catch (e) {
      window.localStorage.removeItem(YourStakingPoolIdKey);
      this.setState({
        yourStakingPoolAccountId,
        poolSuccess: false,
        stakingPoolId,
      });
    }
  }

  async _initNear() {
    const nearConfig = {
      networkId: 'betanet',
      nodeUrl: 'https://rpc.betanet.near.org',
      contractName: ContractName,
      walletUrl: 'https://wallet.betanet.near.org',
    };
    const keyStore = new nearAPI.keyStores.BrowserLocalStorageKeyStore();
    const near = await nearAPI.connect(Object.assign({ deps: { keyStore } }, nearConfig));
    this._keyStore = keyStore;
    this._nearConfig = nearConfig;
    this._near = near;

    this._walletConnection = new nearAPI.WalletConnection(near, ContractName);
    this._accountId = this._walletConnection.getAccountId();

    this._account = this._walletConnection.account();
    this._contract = new nearAPI.Contract(this._account, ContractName, {
      viewMethods: ['get_min_attached_balance', 'get_number_of_staking_pools_created'],
      changeMethods: ['create_staking_pool'],
    });
    this._minAttachedBalance = await this._contract.get_min_attached_balance();
    await this._initYourStakingPool();

  }

  handleChange(key, value) {
    const stateChange = {
      [key]: value,
    };
    if (key === 'numerator') {
      value = value.replace(/[^\d]/, '') || 0;
      stateChange.rewardFeeFraction = {
        numerator: parseInt(value),
        denominator: this.state.rewardFeeFraction.denominator
      };
    } else if (key === 'denominator') {
      value = value.replace(/[^\d]/, '') || 0;
      stateChange.rewardFeeFraction = {
        numerator: this.state.rewardFeeFraction.numerator,
        denominator: parseInt(value),
      };
    } else if (key === 'stakingPoolId') {
      value = value.toLowerCase().replace(/[^a-z\d\-_]/, '');
      stateChange[key] = value;
      stateChange.stakingPoolAlreadyExists = false;
      if (this.isValidStakingPoolId(value)) {
        stateChange.stakingPoolAccountLoading = true;
        this._near.connection.provider.query(`account/${value}.${ContractName}`, '').then((_a) => {
          if (this.state.stakingPoolId === value) {
            this.setState({
              stakingPoolAccountLoading: false,
              stakingPoolAlreadyExists: true,
            })
          }
        }).catch((e) => {
          if (this.state.stakingPoolId === value) {
            this.setState({
              stakingPoolAccountLoading: false,
              stakingPoolAlreadyExists: false,
            })
          }
        })
      }
    }
    this.setState(stateChange);
  }

  isValidAccountId(stakingPoolId) {
    return stakingPoolId.length >= MinAccountIdLen &&
        stakingPoolId.length <= MaxAccountIdLen &&
        stakingPoolId.match(ValidAccountRe);
  }

  isValidStakingPoolId(stakingPoolId) {
    return stakingPoolId.match(ValidFactoryIdRe) && this.isValidAccountId(stakingPoolId + '.' + ContractName);
  }

  stakingPoolIdClass() {
    if (!this.state.stakingPoolId || (this.isValidStakingPoolId(this.state.stakingPoolId) && this.state.stakingPoolAccountLoading)) {
      return "form-control form-control-large";
    } else if (this.isValidStakingPoolId(this.state.stakingPoolId)) {
      return "form-control form-control-large is-valid";
    } else {
      return "form-control form-control-large is-invalid";
    }
  }

  ownerIdClass() {
    if (!this.state.ownerId) {
      return "form-control form-control-large";
    } else if (this.isValidAccountId(this.state.ownerId)) {
      return "form-control form-control-large is-valid";
    } else {
      return "form-control form-control-large is-invalid";
    }
  }

  rewardFeeFractionValid() {
    return this.state.rewardFeeFraction.numerator <= 1000000 && this.state.rewardFeeFraction.numerator >= 0 &&
      this.state.rewardFeeFraction.denominator <= 1000000000 && this.state.rewardFeeFraction.denominator > 0 &&
      this.state.rewardFeeFraction.numerator <= this.state.rewardFeeFraction.denominator;
  }

  rewardFeeFractionClass() {
    if (this.rewardFeeFractionValid()) {
      return "form-control form-control-large is-valid";
    } else {
      return "form-control form-control-large is-invalid";
    }
  }

  stakingPublicKeyValid() {
    try {
      let key = PublicKey.fromString(this.state.stakePublicKey);
      return key.data.length === 32;
    } catch (e) {
      return false;
    }
  }

  stakingPublicKeyClass() {
    if (!this.state.stakePublicKey) {
      return "form-control form-control-large";
    } else if (this.stakingPublicKeyValid()) {
      return "form-control form-control-large is-valid";
    } else {
      return "form-control form-control-large is-invalid";
    }
  }

  async requestSignIn() {
    const appTitle = 'Token Factory';
    await this._walletConnection.requestSignIn(
        ContractName,
        appTitle
    )
  }

  async logOut() {
    this._walletConnection.signOut();
    this._accountId = null;
    this.setState({
      signedIn: !!this._accountId,
      accountId: this._accountId,
    })
  }

  async createStakingPool() {
    this.setState({
      creating: true,
    });
    window.localStorage.setItem(YourStakingPoolIdKey, this.state.stakingPoolId);
    await this._contract.create_staking_pool({
      staking_pool_id: this.state.stakingPoolId,
      owner_id: this.state.accountId,
      stake_public_key: this.state.stakePublicKey,
      reward_fee_fraction: this.state.rewardFeeFraction,
    }, GAS, this._minAttachedBalance)
  }

  render() {
    const content = !this.state.connected ? (
        <div>Connecting... <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span></div>
    ) : (this.state.signedIn ? (
        <div>
          <div className="float-right">
            <button
                className="btn btn-outline-secondary"
                onClick={() => this.logOut()}>Log out</button>
          </div>
          <h4>Hello, <span className="font-weight-bold">{this.state.accountId}</span>!</h4>
          <p>
            Create and deploy a new staking pool. It'll cost you <span className="font-weight-bold">{fromYocto(this._minAttachedBalance)} Ⓝ</span> to cover storage fees on the new staking pool.
          </p>
          <p>
            Staking Pool allows users to delegate tokens in a secure way. Once the staking pool is created, the owner of the staking pool
            should run the validation node on the behalf of the staking pool account. If the staking pool accumulates enough stake to
            qualify for a validator seat, then all participants of this staking pool will split the staking rewards from the pool.
          </p>
          <div className="form-group">
            <label forhtml="stakingPoolId">Staking Pool ID</label>
            <div className="input-group">
              <div className="input-group-prepend">
                <div className="input-group-text">@</div>
              </div>
              <input type="text"
                     className={this.stakingPoolIdClass()}
                     id="stakingPoolId"
                     placeholder="well-done-pool"
                     disabled={this.state.creating}
                     value={this.state.stakingPoolId}
                     onChange={(e) => this.handleChange('stakingPoolId', e.target.value)}
              />
              <div className="input-group-append">
                <div className="input-group-text">.{ContractName}</div>
              </div>
            </div>
            <small>It'll be used to uniquely identify the staking pool and to create an Account ID for the staking pool</small>
          </div>

          <div className="form-group">
            <label forhtml="ownerId">Owner ID</label>
            <div className="input-group">
              <div className="input-group-prepend">
                <div className="input-group-text">@</div>
              </div>
              <input type="text"
                     className={this.ownerIdClass()}
                     id="ownerId"
                     placeholder={this.state.accountId}
                     disabled={this.state.creating}
                     value={this.state.ownerId}
                     onChange={(e) => this.handleChange('ownerId', e.target.value)}
              />
            </div>
            <small>The account ID of the pool owner. Usually, it's just your account ID and you don't need to change it.</small>
          </div>

          <div className="form-group">
            <label forhtml="stakePublicKey">Initial Staking Public Key</label>
            <div className="input-group">
              <div className="input-group-prepend">
                <div className="input-group-text">ed25519:</div>
              </div>
              <input type="text"
                     className={this.stakingPublicKeyClass()}
                     id="stakePublicKey"
                     placeholder="A74xPSNpgQhqHtoidA3Q7oKTXZ9G12cRRt3DjeWsF7vf"
                     disabled={this.state.creating}
                     value={this.state.stakePublicKey}
                     onChange={(e) => this.handleChange('stakePublicKey', e.target.value)}
              />
            </div>
            <small>The initial staking public key that the staking pool will use to issue staking transaction.<br/>
              As a owner you should get your staking public key from the <code>validator_key.json</code> file.
            </small>
          </div>

          <div className="form-group">
            <label forhtml="rewardFeeFractionNumerator">Initial Reward Fee Fraction</label>
            <div className="input-group">
              <input type="text"
                     className={this.rewardFeeFractionClass()}
                     id="rewardFeeFractionNumerator"
                     placeholder={10}
                     disabled={this.state.creating}
                     value={this.state.rewardFeeFraction.numerator}
                     onChange={(e) => this.handleChange('numerator', e.target.value)}
              />
              <div className="input-group-prepend">
                <div className="input-group-text">/</div>
              </div>
              <input type="text"
                     className={this.rewardFeeFractionClass()}
                     id="rewardFeeFractionDenominator"
                     placeholder={100}
                     disabled={this.state.creating}
                     value={this.state.rewardFeeFraction.denominator}
                     onChange={(e) => this.handleChange('denominator', e.target.value)}
              />
            </div>
            <small>The initial staking public key that the staking pool will use to issue staking transaction.</small>
          </div>


          <div className="form-group">
            <div>
              <button
                  className="btn btn-success"
                  disabled={this.state.creating ||
                    !this.isValidStakingPoolId(this.state.stakingPoolId) ||
                    this.state.stakingPoolAccountLoading ||
                    this.state.stakingPoolAlreadyExists ||
                    !this.isValidAccountId(this.state.ownerId) ||
                    !this.stakingPublicKeyValid() ||
                    !this.rewardFeeFractionValid()
                  }
                  onClick={() => this.createStakingPool()}>Create Staking Pool {this.isValidStakingPoolId(this.state.stakingPoolId) && `@${this.state.stakingPoolId}.${ContractName}`} ({fromYocto(this._minAttachedBalance)} Ⓝ)</button>
            </div>
          </div>
          <hr/>
        </div>
    ) : (
        <div>
          <button
              className="btn btn-primary"
              onClick={() => this.requestSignIn()}>Log in with NEAR Wallet to create a new staking pool</button>
        </div>
    ));
    return (
        <div>
          <h1>Staking Pool Factory (betanet)</h1>
          {
            this.state.yourStakingPoolAccountId && (
              this.state.poolSuccess ? (
                <div className="alert alert-success" role="alert">
                  Successfully created your staking pool <a
                  href={`https://explorer.betanet.near.org/accounts/${this.state.yourStakingPoolAccountId}`}>@{this.state.yourStakingPoolAccountId}</a>
                </div>
              ) : (
                <div className="alert alert-danger" role="alert">
                  Failed to create your staking pool. Take a look at the factory contract on explorer: <a
                  rel="noopener noreferrer" target="_blank" href={`https://explorer.betanet.near.org/accounts/${ContractName}`}>@{ContractName}</a>
                </div>
              )
            )
          }

            <div style={{minHeight: "10em"}}>
              {content}
            </div>
        </div>
    );
  }
}


export default App;
