var redux;
$().ready(function() {
    var narator = window.speechSynthesis;
    redux = {
	ocaid: undefined,
	page: undefined,
	pagetext: undefined,
	utterance: undefined,
	state: undefined,
	voice: undefined,
	action: 'Play'
    }

    var reset = function() {
	redux.pagetext = undefined;
	redux.utterance = undefined;
	redux.state = undefined;
	redux.action = 'Play';
    }

    $('.tools').append('<button class="flip previous">Previous</button>')
    $('.tools').append('<button class="switch">Play</button>')
    $('.tools').append('<button class="stop">Stop</button>')
    $('.tools').append('<button class="flip next">Next</button>')
    $('.tools').append('<select class="set-voice"><opion value="voice-1">voice</option></select>')

    var getPage = function(callback) {
	redux.pageText = '';
	Book.getPage(redux.ocaid, redux.page, function(text) {
	    redux.pagetext = text;
	    $('.pageText').text(text);
	    narator.cancel();
	    redux.utterance = new SpeechSynthesisUtterance(text);
	    if(callback){callback()};
	});
    }


    $('.flip').on('click', function() {		
	var page = parseInt(redux.page)
	if ($(this).hasClass('next')) {
	    redux.page = (page + 1).toString();
	} else if (page < 1) {
	    return;
	} else {
	    redux.page = (page - 1).toString();
	}

	getPage(function() {
	    if (redux.state === 'playing') {
		narator.speak(redux.utterance);
	    }
	});
    });

    $('.stop').on('click', function() {
	narator.cancel();
	redux.utterance = new SpeechSynthesisUtterance(redux.pagetext);
	redux.state = undefined;
	redux.action = 'Play';
	$('.switch').text(redux.action);
    })

    $('.switch').on('click', function() {
	if (!redux.state) {
	    narator.speak(redux.utterance);
	    redux.state = 'playing';
	    redux.action = 'Pause';
	} else if (redux.state === 'playing') {
	    narator.pause(redux.utterance);
	    redux.state = 'paused';
	    redux.action = 'Play';
	} else {
	    narator.resume(redux.utterance);
	    redux.state = 'playing';
	    redux.action = 'Pause';
	}
	$('.switch').text(redux.action);
    });

    var options = Browser.getJsonFromUrl();
    if (options.ocaid) {
	redux.ocaid = options.ocaid;	
	if (options.page) {
	    console.log('page found');
	    redux.page = options.page.replace('/', '');;
	    getPage();
	} else {
	    console.log('fetching page');
	    Book.getFirstPage(redux.ocaid, function(firstpage) {
		console.log(firstpage);
		redux.page = parseInt(firstpage) - 1;
		console.log(redux.page)
		getPage()
	    });
	}
    }
})
