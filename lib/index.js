'use strict';
var Filter = require('broccoli-filter'),
    eslint = require('eslint'),
    rules = require('eslint/lib/rules'),
    Config = require('eslint/lib/config');

/**
 * Calculates the severity of a eslint.linter.verify result
 * @param {Array} result Eslint verify result array
 * @param {Object} config Eslint eslint/lib/config
 * @return {Number} If the returned number is greater than 0 the result contains errors.
 */
function getResultSeverity(result, config) {
    // count all errors
    return result.reduce(function (previous, message) {
        var severity;

        if (message.fatal) {
            return previous + 1;
        }

        severity = config.rules[message.ruleId][0] || config.rules[message.ruleId];

        if (severity === 2) {
            return previous + 1;
        }

        return previous;
    }, 0);
}

/**
 * Uses the content of each file in a given tree and runs eslint validation on it.
 * @param {Object} inputTree Tree from broccoli.makeTree
 * @param {{config: String, rulesdir: String, format: String}} options Filter options
 * @returns {EslintValidationFilter} Filter object
 * @constructor
 */
var EslintValidationFilter = function(inputTree, options) {
    if (!(this instanceof EslintValidationFilter)) {
        return new EslintValidationFilter(inputTree, options);
    }
    // set inputTree
    this.inputTree = inputTree;

    // set options defaults
    this.options = {
        format: options.format ? options.format : undefined,
        rulesdir: options.rulesdir ? options.rulesdir : undefined,
        config: options.config ? options.config : './node_modules/eslint/conf/eslint.json'
    };

    // set formatter
    this.formatter = require(this.options.format ? this.options.format : 'eslint/lib/formatters/stylish');
};

module.exports = EslintValidationFilter;
EslintValidationFilter.prototype = Object.create(Filter.prototype);
EslintValidationFilter.prototype.constructor = EslintValidationFilter;
EslintValidationFilter.prototype.extensions = ['js'];
EslintValidationFilter.prototype.targetExtension = 'js';
EslintValidationFilter.prototype.processString = function (content, relativePath) {
    var configHelper = new Config({
            configFile: this.options.config
        }),
        config,
        result,
        messages = [];

    // set rulesdir if given
    if (this.options.rulesdir) {
        rules.load(this.options.rulesdir);
    }

    config = configHelper.getConfig();

    // verify file content
    result = eslint.linter.verify(content, config);

    // if verification has result
    if (result.length) {
        // prepare message format
        messages.push({
            filePath: relativePath,
            messages: result
        });

        // log formatter output
        console.log(this.formatter(messages, config));

        if (getResultSeverity(result, config) > 0) {
            // throw error if severe messages exist
            throw new Error('severe rule errors');
        }
    }

    // return unmodified string
    return content;
};
