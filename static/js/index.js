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

  var SYMBOLS = {
    play: '&#9658;',
    pause: '&#10073;&nbsp;&#10073',
    stop: '&#9724;',
    prev: '&laquo;',
    next: '&raquo;'
  }

  var appState = {
    paused: 'Paused',
    playing: 'Playing',
    stopped: 'Stopped'
  };


  redux = {
    pageQueue: [],
    auth: {},
    action: appState.stopped,
    ocaid: 'adventuresofbobw00burg', // sample: don't show visitor a blank page
    page: 0,
    pageText: '',
    pitch: 10, // divide by 10 for utterance pitch 0-2
    rate: '1', // parseFloat() for utterance rate 0.1-10
    textIndex: 0,
    textQueue: [],
    voice: 'Google UK English Male',
    volume: 10 // divide by 10 for utterance volume 0-1
  };

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
      options += '>' + voice.name + '</option>';
    });
    $('.voice').html(options);
  };

  var getVoice = function(str) {
    return synth.getVoices()
      .filter(function(voice) {
        return voice.name === str;
      })[0];
  };

  // Chrome requires async call
  synth.onvoiceschanged = function(e) { getVoices(); };

  var browserSupportsPitchModulation = function() {
    var utterance = new SpeechSynthesisUtterance('text');
    utterance.pitch = 0.1;
    if (utterance.pitch === 1) {
      return false;
    } else {
      return true;
    }
  };


  $('.tools').append('<button class="flip previous">' + SYMBOLS.prev + '</button>');
  $('.tools').append('<button class="switch">' + SYMBOLS.play + '</button>');
  $('.tools').append('<button class="stop" disabled>' + SYMBOLS.stop + '</button>');
  $('.tools').append('<button class="flip next">' + SYMBOLS.next + '</button>');
  $('.tools').append('<button class="about right" onclick="window.location.href=\'https://github.com/ArchiveLabs/audiobooks\'">About</select>');
  $('.controls').prepend('<select class="voice control"></select>');

  var getPage = function() {
    while (redux.pageQueue.length > 0) {
      console.log('pageQueue.length', redux.pageQueue.length)
      redux.page = redux.pageQueue.pop();
    }

    redux.pageText = '';
    Book.getPage(redux.ocaid, redux.page, function(text) {

      $('.text').html(text.replace(/- /g, ''));
      $('.text').scrollTop(0);

      if (text === '') {
        if (redux.action === appState.playing) {
          nextPage();
          // Chrome needs this every other page
          synth.resume();
        }
        return;
      }

      // more page changes while API call
      if (redux.pageQueue.length > 0) {
        getPage();
      } else {
        getText();
      }

      if (redux.action === appState.playing) {
        speak();
      }
    });
  };

  var getText = function() {
    redux.pageText = $('.text').val().replace(/- /g, '');
    // many voices will only read 300 characters per utterance
    // so chop text up and enque utterances
    redux.textIndex = 0;
    redux.textQueue = $().chopText(redux.pageText);
    $('.switch').prop('disabled', false);
    $('.stop').prop('disabled', true);
    $('.text').prop('contenteditable', true);
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

    // fired in 3 ways
    // speechSynthesis.cancel() - "Previous","Next" page change
    // end of utterance text reached
    // speechSynthesis.cancel() - "Stop"
    utterance.onend = function(event) {
      if (redux.action === appState.playing) {
        // utterance played to end
        // advance index
        //   note: useful if in future want to cancel pending on 
        //   class="control" changes and restart utterances
        // if no utterances pending, stop
        if (redux.textIndex + 1 < redux.textQueue.length) {
          redux.textIndex += 1;
        } else {
          if (!synth.pending) {
            nextPage();
            // Chrome needs this every other page
            synth.resume();
          }
        }
      }
    }

    utterance.onpause = function(event) {
      redux.action = appState.paused;
    };

    utterance.onresume = function(event) {        
      synth.resume();
      redux.action = appState.playing;
    };

    utterance.onstart = function(event) {
      redux.action = appState.playing;
      $('.stop').prop('disabled', false);
      $('.text').prop('contenteditable', false);
    };

    return utterance;
  };

  // Previous, Next
  $('.flip').on('click', function() {

    $('.switch').prop('disabled', true);
    $('.stop').prop('disabled', true);
    $('.stop').prop('disabled', false);
    synth.cancel();
    // Chrome needs this every other page

    if (redux.action === appState.playing) {
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
    redux.pageQueue.push(page);
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
    redux.pageQueue.push(page);
    getPage();
  }

  // pushstate
  var setPage = function(page) {
    var stateObj = {
      ocaid: redux.ocaid,
      page: page
    };
    var url = window.location.href.split('?')[0];
    var urlPart = url + '?ocaid=' + redux.ocaid;
    urlPart += '&page=' + page;
    history.pushState(stateObj, '', urlPart);
  }

  // Stop
  $('.stop').on('click', function() {
    redux.action = appState.stopped;
 
    redux.textIndex = 0;
    $('.stop').prop('disabled', true);
    $('.text').prop('contenteditable', true);

    synth.cancel();
    redux.action = appState.stopped;
    $('.switch').html(SYMBOLS.play);
    console.log(redux.action);
  })

  // Play, Pause, Resume
  $('.switch').on('click', function() {
    switch (redux.action) {
      // If we're stopped... Play
      case appState.stopped:
        speak();
        redux.action = appState.paused;
        // we're playing, show pause
        $('.switch').html(SYMBOLS.pause);
        break;
      // If we're playing... Pause
      case appState.playing:
        synth.pause();
        redux.action = appState.paused;
        $('.switch').html(SYMBOLS.play);
        break;
      // If we're paused... Resume (Play)
      case appState.paused:
        synth.resume();
        redux.action = appState.playing;
        // play, show the pause button
        $('.switch').html(SYMBOLS.pause);
        break;
    }
    console.log(redux.action);
  });

  // respond to settings changes
  var settings = ['voice', 'volume', 'pitch', 'rate'];
  $.each(settings, function(index) {
    var setting = settings[index];
    $('.' + setting).on('change', function() {
      console.log('changing ' + setting);
      redux[setting] = $('.' + setting).val();
    });
  });

  var start = function() {
    // for browsers other than Chrome
    getVoices();

    if(!browserSupportsPitchModulation) {
      // for browsers other than Edge +?
      $('.rate').prop( "disabled", true);
    }

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

  Browser.getS3Keys(function(s3access, s3secret) { 
    redux.auth.s3access = s3access;
    redux.auth.s3secret = s3secret;
    start();
  });

  $(window).on("popstate", function(e) {
    var state = e.originalEvent.state;
    if (state !== null) {
      console.log("popstate", state.page);
      redux.page = state.page
      synth.cancel();
      if (redux.action === appState.playing) {
        // Chrome needs this every other page
        synth.resume();
      }
      getPage();
    }
  });
});
