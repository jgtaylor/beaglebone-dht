var dht = require('bindings')('beaglebone-dht'),
    data = require('./data'),
    _ = require('lodash');


module.exports = {
    sensor: function(model) {
        this.sensorNumber = _.result(_.find(data.sensors, {model: model}), 'number');
        
        return this.sensorNumber;
    },

    read: function(gpio) {
        if (_.isNull(gpio) || _.isUndefined(gpio)) {
            throw new Error('No GPIO pin provided!');
        }
        else {
            if (!_.some(data.pinToGpio, {gpio: gpio})) {
                throw new Error('Pin must be a valid GPIO identifier!');
            }
            else {
                return getReading(gpio, this.sensorNumber);
            }
        }

        function getReading(gpio, sensorNumber) {
            var convert = _.pick(_.find(data.pinToGpio, {gpio: gpio}), ['base', 'number']);
            var retryCount = 0;

            if (!_.isUndefined(sensorNumber)) {
                while (retryCount !== 5) {
                    var current = dht.read(sensorNumber, convert.base, convert.number),
                        fahrenheit = (current.temperature * 1.8) + 32,
                        hasErrors = module.exports.checkErrors(current.result);

                    if (hasErrors === false) {
                        return {
                            celsius: current.temperature,
                            fahrenheit: fahrenheit,
                            humidity: current.humidity
                        };
                    } else {
                        if ( retryCount === 5 ) {
                            for ( var x = 0; x < data.sensorErrors.length; x++ ) {
                                if ( data.sensorErrors[x].value === current.result ) {
                                    return { error: data.sensorErrors[x].name };
                                }
                            }
                        }
                    }
                    retryCount++;
                }
            } else {
                throw new Error('Expected DHT11, DHT22, or AM2302 sensor value.');
            }
        }
    },
    
    checkErrors: function (current) {
            var hasErrors;

            if (current === _.result(_.find(data.sensorErrors, {name: 'timeout'}), 'value') ||
                current === _.result(_.find(data.sensorErrors, {name: 'checksum'}), 'value')) {
                hasErrors = true;
            }
            else if (current === _.result(_.find(data.sensorErrors, {name: 'gpio'}), 'value')) {
                hasErrors = true;
                throw new Error('Error accessing GPIO. Make sure program is run as root with sudo!');
            }
            else if (current < _.result(_.find(data.sensorErrors, {name: 'success'}), 'value')) {
                hasErrors = true;
                throw new Error('Error calling DHT test driver read: ' + current);
            }
            else if (current >= _.result(_.find(data.sensorErrors, {name: 'success'}), 'value')) {
                hasErrors = false;
            }

            return hasErrors;
        }
};
