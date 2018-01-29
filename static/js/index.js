/*
  design constraints:

  Can't alter utterance properties 
  - lang
  - pitch
  - rate
  - text
  - voice
  - volume
  once added to utterance queue by speechSynthesis.speak()

  Some non-local voices end after utterances of 300 or so characters
  (or speaking for more then n seconds)
  todo: test changing text parsing to fewer characters when slower, 
    more characters when faster

  Some non-local voices don't fire SpeechSynthesisUtterance.onboundary
*/

var redux;

$().ready(function() {
  "use strict";

  // state of UI buttons
  // possibly not necessary with a little more thinking,
  // but prefer not to store state in DOM
  // mainly used to resume state on page changes
  var appState = {
    // on page change play controls set to:
    paused: 'Paused', // "Resume"
    playing: 'Playing', // "Pause", synth continues speaking
    stopped: 'Stopped' // "Play"
  };

  var pageQueue = [];

  // Combined state of speechSynthesis and utterance objects
  // These reflect both synth and user events
  var synthState = {
    cancelled: 'Cancelled', // page change cancels synth
    ended: 'Ended', // end of utterance reached
    notLoaded: 'Not Loaded', // nothing loaded
    notStarted: 'Not Started', // loaded, not started
    paused: 'Paused',
    playing: 'Playing',
    stopped: 'Stopped',
  };

  redux = {
    appState: appState.stopped,
    action: 'Play',
    ocaid: 'adventuresofbobw00burg', // sample: don't show visitor a blank page
    page: 0,
    pageText: '',
    pitch: 10, // divide by 10 for utterance pitch 0-2
    rate: '1', // parseFloat() for utterance rate 0.1-10
    textIndex: 0,
    textQueue: [],
    synthState: synthState.notLoaded,
    voice: '',
    volume: 10 // divide by 10 for utterance volume 0-1
  };

  /* remove if not used
    var reset = function() {
      redux.pageText = undefined;
      redux.utterance = undefined;
      redux.state = undefined;
      redux.action = 'Play';
    };
  */

  // test for browser support
  if (!window.speechSynthesis) {
    $('.details').append('<h3>Your browser does not support speechSynthesis</h3>');
    $('.details').append('<p>Please try the latest Chrome, Firefox, or Edge.</p>');
    return;
  }

  var synth = window.speechSynthesis;

  var getVoices = function() {
    var options = "";
    var voices = synth.getVoices();
    voices.forEach(function(voice, i) {
      options += '<option value="' + voice.name + '"';
      if (voice.name === redux.voice) {
        options += ' selected';
      }
      options += '>';
      options += voice.name + '</option>';
    });
    $('.voices').html(options);
  };

  var getVoice = function(str) {
    return synth.getVoices()
      .filter(function(voice) {
        return voice.name === str;
      })[0];
  };

  // Chrome requires async call
  synth.onvoiceschanged = function(e) {
    console.log('speechSynthesis.onvoiceschanged fired');
    getVoices();
  };

  var testPitch = function() {
    var utterance = new SpeechSynthesisUtterance('text');
    utterance.pitch = 0.1;
    if (utterance.pitch === 1) {
      return false;
    } else {
      return true;
    }
  };

  var isPitchVariable = testPitch();

  $('.tools').append('<button class="flip previous">Previous</button>');
  $('.tools').append('<button class="switch">Play</button>');
  $('.tools').append('<button class="stop">Stop</button>');
  $('.tools').append('<button class="flip next">Next</button>');
  $('.tools').append('<button class="books right" onclick="window.location.href=\'books.html\'">Books</select>');
  $('.tools').append('<button class="about right" onclick="window.location.href=\'https://github.com/ArchiveLabs/audiobooks\'">About</select>');
  $('.controls').append('<select class="voices control"></select>');
  $('.controls').append('<select class="volume control"></select>');
  if (isPitchVariable) {
    $('.controls').append('<select class="pitch control"></select>');
  }
  $('.controls').append('<select class="rate control"></select>');
  var getVolume = function() {
    var options = '';
    for (var i = 0; i < 11; i++) {
      options += '<option value=' + i.toString();
      if (i === redux.volume) {
        options += ' selected';
      }
      options += '>';
      options += 'volume ' + formatVolume(i) + '</option>';
    }
    $('.volume').html(options);
  };

  var formatVolume = function(i) {
    if (i < 10) {
      return '0.' + i.toString();
    } else {
      return '1';
    }
  };

  var getPitch = function() {
    var options = '';
    for (var i = 0; i < 21; i++) {
      options += '<option value=' + i.toString();
      if (i === redux.pitch) {
        options += ' selected';
      }
      options += '>';
      options += 'pitch ' + formatPitch(i) + '</option>';
    }
    $('.pitch').html(options);
  };

  var formatPitch = function(i) {
    switch (i) {
      case 10:
        return '1';
        break;
      case 20:
        return '2';
        break;
      default:
        if (i < 10) {
          return '0.' + i.toString();
        } else {
          return '1.' + (i - 10).toString();
        }
        break;
    }
  };

  var getRate = function() {
    var rates = ['0.1', '0.3', '0.5', '0.7', '0.8', '0.9', '1', '1.1', '1.2', '1.5', '1.7', '2', '5', '10'];
    var options = '';
    for (var i = 0; i < rates.length; i++) {
      options += '<option value="' + rates[i] + '"';
      if (rates[i] === redux.rate) {
        options += ' selected';
      }
      options += '>';
      options += 'rate ' + formatRate(rates[i]) + '</option>';
    }
    $('.rate').html(options);
  };

  var formatRate = function(str) {
    switch (str) {
      case '0.1':
        return str + ' slowest';
        break;
      case '0.5':
        return str + ' half';
        break;
      case '0.5':
        return str + ' half';
        break;
      case '1':
        return str + ' normal';
        break;
      case '2':
        return str + ' twice';
        break;
      case '10':
        return str + ' fastest';
        break;
      default:
        return str;
        break;
    }
  };

  $('.text').on('change', function() {
    getText();
  });

  var getPage = function() {
    while (pageQueue.length > 0) {
      console.log('pageQueue.length', pageQueue.length)
      redux.page = pageQueue.pop();
    }

    redux.pageText = '';
    Book.getPage(redux.ocaid, redux.page, function(text) {
      // experiment try to show paragraphs
      // text = text.replace(/\n/g, "\n\n");

      $('.text').html(text);

      if (text === '') {
        if (redux.appState === appState.playing) {
          nextPage();
          // Chrome needs this every other page
          synth.resume();
        } else {
          setSynthState(synthState.notLoaded);
        }

        return;
      }

      // more page changes while API call
      if (pageQueue.length > 0) {
        getPage();
      } else {
        getText();
      }

      if (redux.appState === appState.playing) {
        speak();
      }
    });
  };

  var getText = function() {
    redux.pageText = $('.text').val();
    // many voices will only read 300 characters per utterance      
    // so chop text up and enque utterances
    redux.textIndex = 0;
    redux.textQueue = $().chopText(redux.pageText);
    setSynthState(synthState.notStarted);
  };

  var speak = function() {
    if (redux.textQueue.length === 0) {
      return;
    }
    if (redux.textIndex >= redux.textQueue.length) {
      return;
    }

    // queue remaining utterances
    var index = redux.textIndex;
    while (index < redux.textQueue.length) {
      var utterance = getUtterance(index);
      synth.speak(utterance);
      index += 1;
    }
  };

  var getUtterance = function(index) {

    var text = redux.textQueue[index].text;
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = redux.pitch / 10;
    utterance.rate = parseFloat(redux.rate);
    utterance.volume = redux.volume / 10;
    if (redux.voice) {
      utterance.voice = getVoice(redux.voice)
    }

    utterance.onboundary = function(event) {
      console.log('utterance boundary at char: ' + event.charIndex);
    };

    // fired in 3 ways
    // speechSynthesis.cancel() - "Previous","Next" page change
    // end of utterance text reached
    // speechSynthesis.cancel() - "Stop"
    utterance.onend = function(event) {
      // console.log('utterance end event', redux.synthState);
      switch (redux.synthState) {
        case synthState.cancelled:
          break;
        case synthState.playing:
          setSynthState(synthState.ended);
          break;
        case synthState.stopped:
          break;
      }
    };

    utterance.onerror = function(event) {
      // todo: handle error
      console.log('speech synthesis error: ', event.error);
    };

    utterance.onpause = function(event) {
      setSynthState(synthState.paused);
      console.log('speech synthesis paused');
    };

    utterance.onresume = function(event) {
      setSynthState(synthState.playing);
      console.log('speech synthesis resumed');
    };

    utterance.onstart = function(event) {
      setSynthState(synthState.playing);
      console.log('speech synthesis start');
    };

    setSynthState(synthState.notStarted);

    // testing
    console.log('new utterance:', utterance);
    console.log('appState:', redux.appState);
    console.log('synthState:', redux.synthState);

    return utterance;
  };

  var setAppState = function(state) {
    redux.appState = state;
  }

  var setSynthState = function(state) {
    redux.synthState = state;

    switch (state) {
      case synthState.cancelled:
        $('.switch').prop('disabled', true);
        $('.stop').prop('disabled', true);
        $('.stop').prop('disabled', false);
        break;
      case synthState.ended:
        // utterance played to end
        // advance index
        //   note: useful if in future want to cancel pending on 
        //   class="control" changes and restart utterances
        // if no utterances pending
        // then synthState.stopped
        if (redux.textIndex + 1 < redux.textQueue.length) {
          redux.textIndex += 1;
        } else {
          if (!synth.pending) {
            setSynthState(synthState.stopped);
            if (redux.appState === appState.playing) {
              nextPage();
              // Chrome needs this every other page
              synth.resume();
            }
          }
        }
        break;
      case synthState.notLoaded:
        $('.switch').prop('disabled', true);
        $('.stop').prop('disabled', true);
        $('.text').prop('contenteditable', false);
        break;
      case synthState.notStarted:
        $('.switch').prop('disabled', false);
        $('.stop').prop('disabled', true);
        $('.control').prop('disabled', false);
        $('.text').prop('contenteditable', true);
        break;
      case synthState.paused:
        setAppState(appState.paused);
        break;
      case synthState.playing:
        setAppState(appState.playing);
        $('.stop').prop('disabled', false);
        $('.control').prop('disabled', true);
        $('.text').prop('contenteditable', false);
        break;
      case synthState.stopped:
        redux.textIndex = 0;
        $('.stop').prop('disabled', true);
        $('.control').prop('disabled', false);
        $('.text').prop('contenteditable', true);
        break;
    }
  };

  // Previous, Next
  $('.flip').on('click', function() {
    setSynthState(synthState.cancelled);
    synth.cancel();
    // Chrome needs this every other page
    if (redux.appState === appState.playing) {
      synth.resume();
    }    
    if ($(this).hasClass('next')) {
      nextPage();
    } else {
      previousPage();
    }
  });

  var nextPage = function() {
    var page = redux.page + 1
    // todo: handle last page
    setPage(page);
    pageQueue.push(page);
    getPage();
  }

  var previousPage = function() {
    if (redux.page === 1) {
      // handle first page
      $(this).prop('disabled', true);      
    } else {
      var page = redux.page - 1
      $(this).prop('disabled', false);
    }
    setPage(page);
    pageQueue.push(page);
    getPage();
  }

  // pushstate
  var setPage = function(page) {
    var stateObj = {
      ocaid: redux.ocaid,
      page: page
    };
    var urlPart = '/?ocaid=' + redux.ocaid;
    urlPart += '&page=' + page;
    history.pushState(stateObj, '', urlPart);
  }

  // Stop
  $('.stop').on('click', function() {
    setAppState(appState.stopped);
    setSynthState(synthState.stopped);
    synth.cancel();
    redux.action = 'Play';
    $('.switch').text(redux.action);
  })

  // Play, Pause, Resume
  $('.switch').on('click', function() {
    switch (redux.synthState) {
      case synthState.paused:
        synth.resume();
        redux.action = 'Pause';
        break;
      case synthState.playing:
        synth.pause();
        redux.action = 'Resume';
        break;
      case synthState.cancelled:
      case synthState.ended:
      case synthState.notStarted:
      case synthState.stopped:
        speak();
        redux.action = 'Pause';
        break;
    }
    $('.switch').text(redux.action);
  });

  $('.voices').on('change', function() {
    redux.voice = $('.voices').val();
    console.log('voice changed to: ', getVoice(redux.voice));
  });

  $('.volume').on('change', function() {
    redux.volume = $('.volume').val();
    console.log('volume changed to: ', formatVolume(redux.volume));
  });

  $('.pitch').on('change', function() {
    redux.pitch = $('.pitch').val();
    console.log('pitch changed to: ', formatPitch(redux.pitch));
  });

  $('.rate').on('change', function() {
    redux.rate = $('.rate').val();
    console.log('rate changed to: ', formatRate(redux.rate));
  });

  var start = function() {
    // for browsers other than Chrome
    getVoices();
    getVolume();
    if (isPitchVariable) {
      // for browsers other than Edge +?
      getPitch();
    }
    getRate();
    var options = Browser.getJsonFromUrl();
    if (options.ocaid) {
      redux.ocaid = options.ocaid;
    }
    if (options.page) {
      console.log('page found', options.page);
      redux.page = parseInt(options.page);
      getPage();
    } else {
      console.log('fetching first page');
      Book.getFirstPage(redux.ocaid, function(firstpage) {
        redux.page = parseInt(firstpage);
        console.log('first page: ', redux.page);
        setPage(redux.page);
        getPage()
      });
    }
  }

  start();

  $(window).on("popstate", function(e) {
    var state = e.originalEvent.state;
    if (state !== null) {
      console.log("popstate", state.page);
      redux.page = state.page
      synth.cancel();
      if (redux.appState === appState.playing) {
        // Chrome needs this every other page
        synth.resume();
      }
      getPage();
    }
  });
});