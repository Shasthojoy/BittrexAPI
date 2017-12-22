'use strict';
const EventEmitter = require('events'); // https://nodejs.org/api/util.html#util_util_inherits_constructor_superconstructor
const fs = require('fs');

if (fs.existsSync('./node_env_private.json'))
  var config = require('./node_env_private.json')[process.env.NODE_ENV || 'development'];
else
  var config = require('./node_env.json')[process.env.NODE_ENV || 'development'];

const bittrex = require('node-bittrex-api'); // https://github.com/dparlevliet/node.bittrex.api
bittrex.options({
  'apikey': config.bittrex.api.key,
  'apisecret': config.bittrex.api.secret
});

class SDKCentral extends EventEmitter {
  constructor() {
    super();
    console.log(`SDKCentral constructed with Bittrex API key ${config.bittrex.api.key} and secret ${config.bittrex.api.secret}`);
  }

  getmarketsummaries(marketNames) {
    bittrex.getmarketsummaries(function (data, err) {
      if (err) {
        return console.error(err);
      }
      let filteredMarkets = data.result.filter(filterMarketName);
      for (var i in filteredMarkets) {
        let market = filteredMarkets[i].MarketName;
        bittrex.getticker({
          market: market
        }, function (ticker) {
          console.log(`${market} : ${JSON.stringify(ticker.result)}`);
        });
      }
    });

    function filterMarketName(market) {
      return marketNames.includes(market.MarketName);
    }
  }

  subscribe(marketNames) {
    bittrex.websockets.subscribe(marketNames, function (data, client) {
      if (data.M === 'updateExchangeState') {
        data.A.forEach(function (data_for) {
          console.log('Market Update for ' + data_for.MarketName, data_for);
        });
      }
    });
  }

  myMarkets() {
    return new Promise((resolve, reject) => {
      let _myMarkets = [];
      this.myCurrencies().then((_myCurrencies) => {
        bittrex.getmarketsummaries(function (data, err) {
          if (err) {
            return console.error(err);
          }
          // gets all market objects related to my currencies
          let filteredMarkets = data.result.filter((market) => {
            let currency = market.MarketName.split('-')[1];
            return _myCurrencies.includes(currency);
          });
          // get all market names off market objects array
          _myMarkets = filteredMarkets.reduce((accumulator, current) => {
            accumulator.push(current.MarketName);
            return accumulator;
          }, []);
          // remove market duplications with USDT- then BTC- then ETH- precedence
          _myMarkets = _myCurrencies.reduce((accumulator, currency) => {
            if( _myMarkets.includes('USDT-'+currency) )
              accumulator.push('USDT-'+currency);
            else if ( _myMarkets.includes('BTC-'+currency) )
              accumulator.push('BTC-'+currency);
            else if ( _myMarkets.includes('ETH-'+currency) )
              accumulator.push('BTC-'+currency);
            return accumulator;
          }, []);
          console.log("My Markets are " + _myMarkets);
          resolve(_myMarkets);
        });
      });
    });
  }

  myCurrencies() {
    return new Promise((resolve, reject) => {
      let _myCurrencies = [];
      bittrex.getbalances(function (data, err) {
        if (data) {
          for (var i in data.result) {
            let hasBalance = data.result[i].Balance > 0;
            if (hasBalance && data.result[i].Currency != 'USDT') {
              _myCurrencies.push(data.result[i].Currency);
            }
          }
          resolve(_myCurrencies);
        }
      });
    });
  }

  // write to SDKCentral Stream
  write(data) {
    this.emit('data', data);
  }

}

module.exports = new SDKCentral();