module.exports = (function(){
    var statementGrammar = require("./statementGrammar.js")
    const { SwiftParser } = require("."); 
    function parse(input)
    {
        const parsedStatements = statementGrammar.parse(input);
        return parsedStatements.map(blocks => blocks.reduce((prev, block) => prev + `{${block.name}:${block.content}}`, "")).map(st => {
            return new Promise((resolve, reject) => {
                new SwiftParser().parse(st, (err, result) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(result);
                })
            })
        });
    }

    return {
        parse: parse
    }

})();