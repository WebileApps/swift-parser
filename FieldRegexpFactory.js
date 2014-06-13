// Generated by CoffeeScript 1.7.1
(function() {
  var FieldContentParser, FieldFinder, FieldNames, FieldNamesParser, FieldParser, FieldRegexpFactory, MandatoryFieldDetector, PatternNameInjector, XRegExp, parsePattern,
    __slice = [].slice;

  XRegExp = require('xregexp').XRegExp;

  parsePattern = require('./FieldPeg').parse;

  FieldParser = (function() {
    function FieldParser(fieldPatterns) {
      this.fieldPatterns = fieldPatterns;
      this.fieldParsers = {};
      this.regexpFactory = new FieldRegexpFactory();
    }

    FieldParser.prototype.parse = function(fieldHeader, fieldContent) {
      var fieldMetadata, parser, regexpSt, result;
      if (this.fieldParsers[fieldHeader] == null) {
        fieldMetadata = this.fieldPatterns[fieldHeader];
        if (!(fieldMetadata != null)) {
          throw new Error("Metadata not found for field " + fieldHeader + ".");
        }
        if (fieldHeader === "77E") {
          throw new Error("Parsing of field 77E is not supported.");
        }
        if (fieldHeader === "98E" && fieldMetadata.fieldNames === "(Qualifier)(Date)(Time)(Decimals)(UTC Indicator)") {
          fieldMetadata.fieldNames = "(Qualifier)(Date)(Time)(Decimals)(UTC Sign)(UTC Indicator)";
        }
        regexpSt = this.regexpFactory.createRegexp(fieldMetadata.pattern, fieldMetadata.fieldNames);
        this.fieldParsers[fieldHeader] = new FieldContentParser(regexpSt, new FieldNames(fieldMetadata.fieldNames));
      }
      parser = this.fieldParsers[fieldHeader];
      result = parser.parse(fieldContent);
      return result;
    };

    return FieldParser;

  })();

  FieldContentParser = (function() {
    function FieldContentParser(regexpSt, fieldNames) {
      this.regexpSt = regexpSt;
      this.fieldNames = fieldNames;
      this.regexp = new XRegExp(this.regexpSt);
    }

    FieldContentParser.prototype.parse = function(fieldValue) {
      var fieldName, match, result, _i, _len, _ref;
      match = this.regexp.xexec(fieldValue);
      if (match == null) {
        throw new Error("Unable to parse '" + fieldValue + "' with regexp '" + this.regexpSt + "'.");
      }
      result = {};
      _ref = this.fieldNames.flatNames;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        fieldName = _ref[_i];
        if ((match[fieldName] != null)) {
          result[FieldNamesParser.unescape(fieldName)] = match[fieldName];
        }
      }
      return result;
    };

    return FieldContentParser;

  })();

  FieldRegexpFactory = (function() {
    function FieldRegexpFactory() {}

    FieldRegexpFactory.prototype.createRegexp = function(pattern, fieldNamesString) {
      var fieldNames, fieldNamesSection, head, i, leftMandatory, mandatoryFieldDetector, patternPart, patternParts, regexpPart, regexps, result, rightMandatory, _i, _j, _len, _len1, _ref;
      patternParts = pattern.split('$');
      fieldNames = new FieldNames(fieldNamesString);
      if (patternParts.length !== fieldNames.names.length) {
        throw new Error('Different count of lines in pattern and field names.');
      }
      regexps = [];
      for (i = _i = 0, _len = patternParts.length; _i < _len; i = ++_i) {
        patternPart = patternParts[i];
        fieldNamesSection = fieldNames.names[i];
        regexps.push(this._createRegexpCore(patternPart, fieldNamesSection));
      }
      mandatoryFieldDetector = new MandatoryFieldDetector();
      _ref = regexps, head = _ref[0], regexps = 2 <= _ref.length ? __slice.call(_ref, 1) : [];
      result = head.regexp;
      leftMandatory = mandatoryFieldDetector.containsMandatory(head.tree);
      for (_j = 0, _len1 = regexps.length; _j < _len1; _j++) {
        regexpPart = regexps[_j];
        rightMandatory = mandatoryFieldDetector.containsMandatory(regexpPart.tree);
        if (leftMandatory && rightMandatory) {
          result = result + "\r\n" + regexpPart.regexp;
        } else {
          result = result + ("(\r\n)?" + regexpPart.regexp);
        }
      }
      result = "^" + result + "$";
      return result;
    };

    FieldRegexpFactory.prototype._createRegexpCore = function(pattern, fieldNames) {
      var injector, parsedPattern, prefix, regexp;
      if (pattern[0] === ':') {
        prefix = ":?";
        pattern = pattern.substring(1);
      }
      parsedPattern = parsePattern(pattern);
      injector = new PatternNameInjector();
      injector.injectNames(fieldNames, parsedPattern);
      regexp = this._visitNode(parsedPattern);
      if ((prefix != null)) {
        regexp = prefix + regexp;
      }
      return {
        tree: parsedPattern,
        regexp: regexp
      };
    };

    FieldRegexpFactory.prototype._visitNodes = function(array) {
      var node, result;
      result = ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = array.length; _i < _len; _i++) {
          node = array[_i];
          _results.push(this._visitNode(node));
        }
        return _results;
      }).call(this)).join("");
      return result;
    };

    FieldRegexpFactory.prototype._visitNode = function(node) {
      var rxName, rxOptional, value;
      switch (node.type) {
        case 'literal':
          return this._visitLiteral(node);
        case 'sequence':
          rxOptional = node.optional ? "?" : "";
          rxName = (node.name != null) ? "?<" + node.name + ">" : "";
          value = this._visitNodes(node.parts);
          if (!node.optional && (node.name == null)) {
            return value;
          }
          if (node.parts.length === 1 && (node.name == null)) {
            if (node.optional && /^\(.*\)$/.test(value)) {
              return value + "?";
            }
          }
          return "(" + rxName + value + ")" + rxOptional;
        case 'field':
          return this._visitField(node);
        default:
          throw new Error(("Unknown node type " + node.type + ": ") + node);
      }
    };

    FieldRegexpFactory.prototype._visitField = function(field) {
      var count, exact, lines, result, rxCount, rxLines, rxName, rxSet, set, _ref, _ref1;
      count = field.count;
      set = field.set;
      lines = (_ref = field.lines) != null ? _ref : 1;
      exact = (_ref1 = field.exact) != null ? _ref1 : false;
      rxSet = (function() {
        switch (set) {
          case 'e':
            return ' ';
          case 'z':
            return '[\\s\\S]';
          default:
            return '.';
        }
      })();
      rxCount = exact ? "{" + count + "}" : "{1," + count + "}";
      rxName = (field.name != null) ? "?<" + field.name + ">" : "";
      rxLines = lines > 1 ? "(\r\n" + rxSet + rxCount + "){0," + (lines - 1) + "}" : "";
      if (rxName !== "") {
        result = "(" + rxName + rxSet + rxCount + rxLines + ")";
      } else {
        result = "" + rxSet + rxCount + rxLines;
      }
      return result;
    };

    FieldRegexpFactory.prototype._visitLiteral = function(node) {
      if ((node.name != null)) {
        return "(?<" + node.name + ">" + node.value + ")";
      }
      return node.value;
    };

    return FieldRegexpFactory;

  })();

  FieldNames = (function() {
    function FieldNames(fieldNamesString) {
      var fieldNamesPart, fieldNamesParts, name, names, section, _i, _j, _k, _len, _len1, _len2, _ref;
      this.fieldNamesString = fieldNamesString;
      fieldNamesParts = this.fieldNamesString.split('$');
      this.names = [];
      for (_i = 0, _len = fieldNamesParts.length; _i < _len; _i++) {
        fieldNamesPart = fieldNamesParts[_i];
        if (fieldNamesPart === "") {
          fieldNamesPart = "(Value)";
        }
        names = FieldNamesParser.parseFieldNames(fieldNamesPart);
        this.names.push(names);
      }
      this.flatNames = [];
      _ref = this.names;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        section = _ref[_j];
        for (_k = 0, _len2 = section.length; _k < _len2; _k++) {
          name = section[_k];
          this.flatNames.push(name);
        }
      }
    }

    return FieldNames;

  })();

  FieldNamesParser = (function() {
    function FieldNamesParser() {}

    FieldNamesParser._fieldNamesRegExp = new XRegExp("\\((.*?)\\)");

    FieldNamesParser.parseFieldNames = function(fieldNamesString) {
      var names;
      if (fieldNamesString === "") {
        return [];
      }
      names = [];
      this._fieldNamesRegExp.forEach(fieldNamesString, (function(_this) {
        return function(match) {
          var escaped;
          escaped = _this.escape(match[1]);
          return names.push(escaped);
        };
      })(this));
      if (names.length === 0) {
        throw new Error("Strange field names: " + fieldNamesString);
      }
      return names;
    };

    FieldNamesParser.escape = function(name) {
      return name.replace(new XRegExp(" ", "g"), "_");
    };

    FieldNamesParser.unescape = function(name) {
      return name.replace(new XRegExp("_", "g"), " ");
    };

    return FieldNamesParser;

  })();

  PatternNameInjector = (function() {
    function PatternNameInjector() {}

    PatternNameInjector.prototype.injectNames = function(names, parsedPattern) {
      var result;
      this.remainingNames = names;
      this.pattern = parsedPattern;
      result = this._visitNode(parsedPattern);
      if (this.remainingNames.length > 0) {
        throw new Error("Remaining names after name injection: " + this.remainingNames.toString());
      }
      return result;
    };

    PatternNameInjector.prototype._visitNode = function(node) {
      var child, _i, _len, _ref;
      switch (node.type) {
        case 'literal':
          return this._visitLiteral(node);
        case 'sequence':
          _ref = node.parts;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            child = _ref[_i];
            this._visitNode(child);
          }
          return node;
        case 'field':
          return this._visitField(node);
        default:
          throw new Error(("Unknown node type " + node.type + ": ") + node);
      }
    };

    PatternNameInjector.prototype._visitLiteral = function(node) {
      var name, _ref;
      if (node.value === 'N' && (this.remainingNames[0] != null) && /(_|\b)sign(_|\b)/i.test(this.remainingNames[0])) {
        _ref = this.remainingNames, name = _ref[0], this.remainingNames = 2 <= _ref.length ? __slice.call(_ref, 1) : [];
        node.name = name;
      }
      return node;
    };

    PatternNameInjector.prototype._visitField = function(node) {
      if (node.set === 'e') {
        return node;
      }
      this._attachNameToField(node);
      return node;
    };

    PatternNameInjector.prototype._attachNameToField = function(node) {
      var commonAncestor, currentFieldPath, i, left, length, name, newNode, righmostFieldPath, right, _ref;
      if (this.remainingNames.length === 0) {
        return;
      }
      if (this.remainingNames.length === 1) {
        righmostFieldPath = new FieldFinder(function(field) {
          return true;
        }).findPath(this.pattern);
        currentFieldPath = new FieldFinder(function(field) {
          return field === node;
        }).findPath(this.pattern);
        length = Math.min(righmostFieldPath.length, currentFieldPath.length);
        i = 0;
        commonAncestor = null;
        while (i < length && righmostFieldPath[i] === currentFieldPath[i]) {
          commonAncestor = righmostFieldPath[i];
          i = i + 1;
        }
        if (i < length) {
          if (commonAncestor.type !== 'sequence') {
            throw new Error('Common ancestor should be a sequence: ' + JSON.stringify(commonAncestor));
          }
          left = commonAncestor.parts.indexOf(currentFieldPath[i]);
          right = commonAncestor.parts.indexOf(righmostFieldPath[i]);
          if (left === -1 || right === -1) {
            throw new Error("Left: " + left + " Right: " + right);
          }
          newNode = {
            type: 'sequence',
            optional: false,
            parts: commonAncestor.parts.slice(left, +right + 1 || 9e9)
          };
          commonAncestor.parts = commonAncestor.parts.slice(0, left).concat([newNode]).concat(commonAncestor.parts.slice(right + 1));
          node = newNode;
        }
      }
      _ref = this.remainingNames, name = _ref[0], this.remainingNames = 2 <= _ref.length ? __slice.call(_ref, 1) : [];
      return node.name = name;
    };

    return PatternNameInjector;

  })();

  FieldFinder = (function() {
    function FieldFinder(predicate) {
      this.predicate = predicate;
    }

    FieldFinder.prototype.findPath = function(tree) {
      var path;
      path = [];
      this._visitNode(tree, path);
      return path;
    };

    FieldFinder.prototype._visitNode = function(node, path) {
      var child, _i, _ref;
      switch (node.type) {
        case 'literal':
          return false;
        case 'field':
          if (this.predicate(node)) {
            path.push(node);
            return true;
          } else {
            return false;
          }
          break;
        case 'sequence':
          path.push(node);
          _ref = node.parts;
          for (_i = _ref.length - 1; _i >= 0; _i += -1) {
            child = _ref[_i];
            if (this._visitNode(child, path)) {
              return true;
            }
          }
          path.pop();
          return false;
        default:
          throw new Error(("Unknown node type " + node.type + ": ") + node);
      }
    };

    return FieldFinder;

  })();

  MandatoryFieldDetector = (function() {
    function MandatoryFieldDetector() {}

    MandatoryFieldDetector.prototype.containsMandatory = function(tree) {
      return this._visitNode(tree);
    };

    MandatoryFieldDetector.prototype._visitNode = function(node) {
      var child, _i, _len, _ref;
      switch (node.type) {
        case 'literal':
          return false;
        case 'sequence':
          if (!node.optional) {
            _ref = node.parts;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              child = _ref[_i];
              if (this._visitNode(child)) {
                return true;
              }
            }
          }
          return false;
        case 'field':
          return true;
        default:
          throw new Error(("Unknown node type " + node.type + ": ") + node);
      }
    };

    return MandatoryFieldDetector;

  })();

  "n  - [0-9] -   Digits\nd   - [0-9]+,[0-9]* problem with total length   -   Digits with decimal comma\na   - [A-Z]  -   Uppercase letters\nc   - [0-9A-Z] -   Uppercase alphanumeric\ne   - [ ]   -   Space\nx   - [0-9a-zA-Z/\-\?:\(\)\.,&apos;\+ ]   -   SWIFT character set\nz   -  [0-9a-zA-Z!&quot;%&amp;\*;&lt;&gt; \.,\(\)/=&apos;\+:\?@#&#x0d;&#x0a;\{\-_]  -   SWIFT extended character set\n//h      -   Uppercase hexadecimal\n//y      -   Upper case level A ISO 9735 characters\n\n\nspecials:\nISIN\nN\n//\n,\n/\n\nnew line:\n$\n";

  module.exports.FieldRegexpFactory = FieldRegexpFactory;

  module.exports.FieldFinder = FieldFinder;

  module.exports.FieldNamesParser = FieldNamesParser;

  module.exports.FieldContentParser = FieldContentParser;

  module.exports.FieldParser = FieldParser;

  module.exports.FieldNames = FieldNames;

}).call(this);

//# sourceMappingURL=FieldRegexpFactory.map