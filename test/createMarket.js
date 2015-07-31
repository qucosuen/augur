/**
 * augur.js unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var assert = require("chai").assert;
var constants = require("../src/constants");
var utils = require("../src/utilities");
var Augur = utils.setup(require("../src"), process.argv.slice(2));
var log = console.log;

require('it-each')({ testPerIteration: true });

var EXPIRING = false;
var events = [
    ["Will the Sun turn into a red giant and engulf the Earth by the end of 2015?", utils.date_to_block(Augur, "1-1-2016")],
    ["Will Rand Paul win the 2016 U.S. Presidential Election?", utils.date_to_block(Augur, "1-2-2017")],
    ["Will it rain in New York City on November 12, 2015?", utils.date_to_block(Augur, "11-13-2015")],
    ["Will the Larsen B ice shelf collapse by November 1, 2015?", utils.date_to_block(Augur, "11-2-2015")]
];

describe("functions/createMarket", function () {
    it.each(events, "single-event market: %s", ['element'], function (element, next) {
        this.timeout(constants.TIMEOUT*4);

        // first create a single event
        var description = element[0];
        var blockNumber = Augur.blockNumber();
        var expDate = (EXPIRING) ? blockNumber + Math.round(Math.random() * 1000) : element[1];
        var minValue = 0;
        var maxValue = 1;
        var numOutcomes = 2;
        var eventObj = {
            branchId: Augur.branches.dev,
            description: description,
            expDate: expDate,
            minValue: minValue,
            maxValue: maxValue,
            numOutcomes: numOutcomes,
            onSent: function (r) {
                // log("createEvent sent: " + JSON.stringify(r, null, 2));
                assert(r.txHash);
                assert(r.callReturn);
            },
            onSuccess: function (r) {
                log("createEvent success: " + JSON.stringify(r, null, 2));
                log("txReceipt:", Augur.receipt(r.txHash));
                log("getEventInfo:", Augur.getEventInfo(r.callReturn));
                // assert.equal(Augur.getDescription(r.callReturn), description);
                // assert.equal(Augur.getCreator(r.callReturn), Augur.coinbase);

                // incorporate the new event into a market
                var alpha = "0.0079";
                var initialLiquidity = 1000 + Math.round(Math.random() * 1000);
                var tradingFee = "0.02";
                var events = [ r.callReturn ];
                var numOutcomes = 2;
                var marketObj = {
                    branchId: Augur.branches.dev,
                    description: description,
                    alpha: alpha,
                    initialLiquidity: initialLiquidity,
                    tradingFee: tradingFee,
                    events: events,
                    onSent: function (res) {
                        log("createMarket sent: " + JSON.stringify(res, null, 2));
                        assert(res.txHash);
                        assert(res.callReturn);
                        Augur.setInfo(
                            res.callReturn,
                            description,
                            Augur.coinbase,
                            initialLiquidity,
                            function (s) {
                                // sent
                                log("sent setInfo:", s);
                            },
                            function (s) {
                                // success
                                log("success setInfo:", s);
                                log("setInfo description:", Augur.getDescription(res.callReturn));
                                // next();
                            },
                            function (s) {
                                // failed
                                log("failed setInfo:", s);
                                // next();
                            }
                        );
                        Augur.initializeMarket(
                            res.callReturn,
                            events,
                            tradingPeriod,
                            initialLiquidity,
                            function (s) {
                                // sent
                                log("sent initializeMarket:", s);
                            },
                            function (s) {
                                // success
                                log("success initializeMarket:", s);
                                // next();
                            },
                            function (s) {
                                // failed
                                log("failed initializeMarket:", s);
                                // next();
                            }
                        );
                        Augur.addMarket(
                            branch,
                            res.callReturn,
                            function (s) {
                                // sent
                                log("sent addMarket:", s);
                            },
                            function (s) {
                                // success
                                log("success addMarket:", s);
                                // next();
                            },
                            function (s) {
                                // failed
                                log("failed addMarket:", s);
                                // next();
                            }
                        );
                    },
                    onSuccess: function (res) {
                        log("createMarket success: " + JSON.stringify(res, null, 2));
                        log("txReceipt:", Augur.receipt(res.txHash));
                        log("getMarketInfo:", Augur.getMarketInfo(res.callReturn));
                        // assert.equal(Augur.getDescription(res.callReturn), description);
                        // assert.equal(Augur.getCreator(res.callReturn), Augur.coinbase);
                        // var event_list = Augur.getMarketEvents(res.callReturn);
                        // assert(event_list);
                        // assert.equal(event_list.length, 1);
                        // assert.equal(Object.prototype.toString.call(event_list), "[object Array]");
                        // assert.equal(event_list[0], r.callReturn);
                        // next();
                    },
                    onFailed: function (r) {
                        r.name = r.error; throw r;
                        next();
                    }
                };
                Augur.createMarket(marketObj);
            },
            onFailed: function (r) {
                r.name = r.error; throw r;
                next();
            }
        };
        Augur.createEvent(eventObj);
    });
});
