const { parse } = require("../statementParser");

const fs = require("fs");
const path = require("path");
fs.readFile(path.join(__dirname,"./example1.rpt"), "utf8", (fileError, data) => {
    parse(data).then(blocks => {
        console.log(blocks)
    }).catch(error => {
        console.error(error);
    });
})