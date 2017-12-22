let app = require('./app');

//app.getmarketsummaries(['USDT-BTC', 'USDT-ETH']);
let myMarkets = app.myMarkets().then( (myMarkets) => {
    app.subscribe(myMarkets);
});