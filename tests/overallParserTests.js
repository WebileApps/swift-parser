var assert = require('assert');
var SwiftParser = require('../').SwiftParser;

const EXAMPLE_1 = `{1:F01SCBLHKHHXXXX0047100003}{2:O9400800190524SCBLHKHHXXXX00471000031905240800N}{3:{108:00000000000188}}{4:
:20:19052403fr309537
:25:44700908725
:28C:12
:60F:C190523HKD0,00
:62F:C190523HKD0,00
:64:C190523HKD0,00
-}{5:{CHK:CHECKSUM DISABLED}{MAC:MACCING DISABLED}}`
describe('Example 1 Parser', function() {
    it('parses correct input', function() {
        new SwiftParser().parse(EXAMPLE_1, (err, result) => {
            console.log(err);
            assert.notEqual(undefined);
            console.log(result);
        });
    })
});
