module.exports = (function(){
    var statementGrammar = require("./statementGrammar.js")
    const { SwiftParser } = require("."); 
    function blockToString(block) {
        if (Array.isArray(block)) {
            return block.reduce((prev, current) => prev + blockToString(current), "");
        }
        if (typeof block === "string") {
            return block;
        }
        return `{${block.name}:${blockToString(block.content)}}`;
    }
    function parse(input)
    {
        const parsedStatements = statementGrammar.parse(input);
        return Promise.all(parsedStatements.map(blocks => blockToString(blocks)).map(st => {
            return new Promise((resolve, reject) => {
                new SwiftParser().parse(st, (err, result) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(result);
                })
            })
        }));
    }

    return {
        parse: parse
    }

})();