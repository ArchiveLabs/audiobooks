(function($) {
  /*
    purpose: parse long text into array of objects of type:
      { text:  [length <= than maxChars],
        start: [start char position from original text],
        end:   [end char position from original text]
      }
    Allows SpeechSynthesis voices which cut off after about 300 characters
    https://bugs.chromium.org/p/chromium/issues/detail?id=335907

    examples: 
      var textarray = $.("#textarea").chopText()     // text of max 280 characters
      var textarray = $.("#textarea").chopText(150)  // text of max 150 characters
      var textarray = $.().chopText(myVar)           // pass in string 
      var textarray = $.().chopText(myVar, 150)      // combine
  */
  $.fn.chopText = function(text, _maxChars) {

    // sane limits
    var max = 180;
    var min = 60;
    var maxChars = max;

    // parse arguments
    switch (arguments.length) {
      case 0:
        text = $(this).text();
        maxChars = max;
        break;
      case 1:
        if (typeof(arguments[0]) === "number") {
          maxChars = arguments[0];
          text = $(this).text();
        } else if (typeof(arguments[0]) !== "string") {
          text = "";
        }
        break;
      default:
        maxChars = _maxChars;
    }

    maxChars = Math.min(maxChars, max);
    maxChars = Math.max(maxChars, min);

    var length = text.length;
    if (length < maxChars) {
      return [{ text: text, start: 0, end: length }];
    }

    var texts = [];
    var sentences = text.split('. ');
    var isDelimiterLast = (text.lastIndexOf('. ') === text.length - 2);
    var start = 0;
    var end = 0;

    for (var i = 0; i < sentences.length; i++) {
      var sentence = sentences[i];
      // reassemble sentence
      if (i < sentences.length - 1) {
        sentence += '. ';
      } else if (isDelimiterLast) {
        sentence += '. ';
      }

      length = sentence.length;
      if (length < maxChars) {
        end += length;
        texts.push({ text: sentence, start: start, end: end });
        start = end + 1;
      } else {
        var remaining = length;
        while (remaining > maxChars) {
          atSemicolon = sentence.lastIndexOf(';', maxChars);
          atComma = sentence.lastIndexOf(',', maxChars);
          atSpace = sentence.lastIndexOf(' ', maxChars);

          var chop = Math.max(atSemicolon, atComma);
          if (chop < 0) {
            if (atSpace < 0) {
              chop = maxChars - 1
            } else {
              chop = atSpace
            }
          }
          end += chop;
          texts.push({ text: sentence.substring(0, chop + 1), start: start, end: end });
          start = end + 1;

          sentence = sentence.substring(chop + 1);
          remaining = remaining - chop;

          if (remaining <= maxChars) {
            end += remaining;
            texts.push({ text: sentence, start: start, end: end });
            start = end + 1;
          }
        } // end while
      } // end if
    } // end for
    return texts;
  };

}(jQuery));