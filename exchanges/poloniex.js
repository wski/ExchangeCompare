const autobahn = require('autobahn')
const fetch = require('node-fetch')

const wsuri = "wss://api.poloniex.com"

/** Class representing Poloniex. */

class Poloniex {
    /**
     * Initalize exchange.
     * @param {array} currencies - String values of the currencies you'd like to know about
     * @param {string} seperator - Standardize the seperator between currency names
     */
    constructor(currencies, seperator) {
        this.currencies = currencies
        this.rates = {}
        this.open = false
        this.seperator = seperator
        this.supportedCurrencies = []

        
        this._populateSupportedCurrencies()
        this._connectToTicker()
    }

    _connectToTicker() {
        const connection = new autobahn.Connection({
            url: wsuri,
            realm: "realm1"
        })
        
        connection.onopen = (session) => {
            // Listen to all ticker events, if our class want's to know
            // about a given currency, add it to the rates.
            const tickerEvent = (args, kwargs) => {
                if (currencies.includes(args[0])) {
                    this.rates[args[0].replace('_', this.seperator)] = parseFloat(args[1])
                }
            }
            // Subscribe to ticker events
            session.subscribe('ticker', tickerEvent)

            // fetch the inital ticker values
            fetch('https://poloniex.com/public?command=returnTicker')
                .then(function(res) {
                    return res.text();
                }).then((body) => {
                    const response = JSON.parse(body)
                    this.currencies.map(currency => {
                        this.rates[currency] = parseFloat(response[currency].last)
                    })

                    this.open = true
                }).catch(function(err) {
                    console.log(err)
                })
        }
        
        connection.onclose = () => {
            this.open = false
        }
                            
        connection.open()
    }

    _populateSupportedCurrencies() {
        // Fetch supported currencies
        fetch('https://poloniex.com/public?command=returnCurrencies')
            .then((res) => {
                return res.text();
            }).then((body) => {
                const response = JSON.parse(body)
                Object.keys(response).map(currency => {
                    if (response[currency].delisted === 0) {
                        this.supportedCurrencies.push(currency)
                    }
                })
            }).catch(function(err) {
                console.log(err)
            })
    }

    /**
     * Get a list of currencies supported by this exchange
     * @return {array} currencies - Current (or last known) list of currencies.
     */
    fetchSupportedCurrencies() {
        return this.supportedCurrencies
    }

    /**
     * Get the last known rates for coins we listen to
     * @return {object} error - Error, if any.
     * @return {object} rates - Current (or last known) rates.
     */
    getCurrentRates() {
        if (this.open) {
            return {
                error: false,
                rates: this.rates
            }
        } else {
            return {
                error: 'Connection not yet, or no longer established.',
                rates: (this.rates) ? this.rates : null // Attempt to send last known rates
            }
        }
    }
}

module.exports = Poloniex;