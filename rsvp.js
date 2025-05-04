/*
Insert this into the JS field for a blank text/graphic question on qualtrics
*/


Qualtrics.SurveyEngine.addOnload(function() {
  var qthis = this;  

  var sentence = "Health inspection that found rat infestation forces busy supermarket in Surrey to shut";
  
  // digits for the distractor task
  var digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  var spelledDigits = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  
  // timing stuff (all in ms)
  var presentationRate = 167;  // how long each word shows up
  var asterisksDuration = 200; // fixation at the start
  var blankDuration = 100;     // blank screen before words
  var maskDuration = 100;      // #### mask after words
  var digitDuration = 533;     // how long to show the digit
  var percentDuration = 100;   // %%% signs duration
  var spelledDuration = 500;   // how long to show spelled digit
  
  // display stuff
  var containerHeight = "300px";
  var fontSize = "48px";
  var fixationSymbol = "***";     // what shows before words
  var maskSymbol = "####";        // mask after words
  var percentSymbol = "%%%%%";    // symbol before spelled digit
  var debugOn = false;            // set to true to see debug by default
  
  // break the sentence into words
  var words = sentence.split(" ");
  
  // keep track of stuff
  var state = "instructions";
  var currentWordIndex = 0;
  var rsvpTimer = null;
  var currentDigit = null;
  var currentDigitIndex = null;
  
  // setup the ui stuff
  
  // make a container
  var container = document.createElement("div");
  container.id = "rsvp-container";
  container.style.width = "100%";
  container.style.height = containerHeight;
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.fontSize = fontSize;
  container.style.fontWeight = "bold";
  container.style.margin = "40px 0";
  qthis.getQuestionContainer().appendChild(container);
  
  // kill the default text
  qthis.getQuestionTextContainer().innerHTML = "";
  
  // debug stuff (ctrl+d to toggle)
  var debug = document.createElement("div");
  debug.id = "debug-area";
  debug.style.width = "80%";
  debug.style.margin = "20px auto";
  debug.style.padding = "10px";
  debug.style.border = "1px solid #ccc";
  debug.style.fontSize = "14px";
  debug.style.display = debugOn ? "block" : "none"; // hidden by default
  qthis.getQuestionContainer().appendChild(debug);
  
  // hide buttons
  qthis.hideNextButton();
  
  // log stuff
  function log(msg) {
    console.log(msg);
    if (debug.style.display !== "none") {
      debug.innerHTML += "<div>" + msg + "</div>";
    }
  }
  
  // toggle debug w/ ctrl+d
  document.addEventListener("keydown", function(e) {
    if (e.ctrlKey && e.key === "d") {
      e.preventDefault();
      debug.style.display = debug.style.display === "none" ? "block" : "none";
    }
  });
  
  // show instructions screen
  function showInstructions() {
    log("showing instructions");
    container.innerHTML = 
      '<div style="text-align: center; max-width: 600px;">' +
      '<h1 style="font-size: 60px; color: #666; margin-bottom: 40px;">RSVP Test</h1>' +
      '<p style="font-size: 28px; margin-bottom: 20px;">words gonna show up one at a time. try to remember!</p>' +
      '<button id="start-button" style="margin-top: 20px; padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 20px;">click to start</button>' +
      '</div>';
    
    state = "instructions";
    
    // handle button click
    document.getElementById('start-button').onclick = function() {
      log("button clicked");
      startRSVP();
    };
  }
  
  // show asterisks
  function showAsterisks() {
    log("showing asterisks");
    container.innerHTML = '<div style="font-size: 60px;">' + fixationSymbol + '</div>';
    state = "asterisks";
    
    setTimeout(function() {
      showBlankBeforeWords();
    }, asterisksDuration);
  }
  
  // blank screen before words
  function showBlankBeforeWords() {
    log("showing blank");
    container.innerHTML = '';
    state = "blank";
    
    setTimeout(function() {
      showWords();
    }, blankDuration);
  }
  
  // show words one by one
  function showWords() {
    log("starting words");
    state = "words";
    currentWordIndex = 0;
    
    // first word
    container.textContent = words[currentWordIndex];
    log("word: " + words[currentWordIndex]);
    
    // rest of the words
    rsvpTimer = setInterval(function() {
      currentWordIndex++;
      
      if (currentWordIndex < words.length) {
        container.textContent = words[currentWordIndex];
        log("word: " + words[currentWordIndex]);
      } else {
        clearInterval(rsvpTimer);
        showMask();
      }
    }, presentationRate);
  }
  
  // mask after words
  function showMask() {
    log("showing mask");
    container.innerHTML = '<div style="font-size: 60px;">' + maskSymbol + '</div>';
    state = "mask";
    
    setTimeout(function() {
      showDistractorDigit();
    }, maskDuration);
  }
  
  // show a random digit
  function showDistractorDigit() {
    log("showing digit");
    state = "distractor_digit";
    
    // pick a random one
    currentDigitIndex = Math.floor(Math.random() * digits.length);
    currentDigit = digits[currentDigitIndex];
    
    container.textContent = currentDigit;
    log("digit: " + currentDigit);
    
    setTimeout(function() {
      showPercentSigns();
    }, digitDuration);
  }
  
  // percent signs
  function showPercentSigns() {
    log("showing percent signs");
    container.innerHTML = '<div style="font-size: 60px;">' + percentSymbol + '</div>';
    state = "percent_signs";
    
    setTimeout(function() {
      showSpelledDigit();
    }, percentDuration);
  }
  
  // spelled out digit
  function showSpelledDigit() {
    log("showing spelled digit");
    state = "spelled_digit";
    
    var spelledDigit = spelledDigits[currentDigitIndex];
    container.textContent = spelledDigit;
    log("spelled digit: " + spelledDigit);
    
    setTimeout(function() {
      showEnd();  // skip to end
    }, spelledDuration);
  }
  
  // all done screen
  function showEnd() {
    log("showing end");
    state = "end";
    
    // params summary
    var paramSummary = 
      '<div style="text-align: left; border: 1px solid #ccc; padding: 10px; margin-top: 15px; background-color: #f9f9f9; font-size: 14px;">' +
      '<h3 style="margin-top: 0; margin-bottom: 5px; font-size: 16px;">parameters (ty potter & lombardi!!):</h3>' +
      '<ul style="margin: 0; padding-left: 20px;">' +
      '<li>sentence: active voice</li>' +
      '<li>presentation: asterisks (' + asterisksDuration + 'ms) → blank (' + blankDuration + 'ms) → words (' + presentationRate + 'ms each) → mask (' + maskDuration + 'ms)</li>' +
      '<li>distractor: digits (' + digitDuration + 'ms) → percent signs (' + percentDuration + 'ms) → spelled digit (' + spelledDuration + 'ms)</li>' +
      '<li># of words: ' + words.length + '</li>' +
      '</ul>' +
      '</div>';
    
    container.innerHTML = 
      '<div style="text-align: center; max-width: 600px;">' +
      '<h2 style="font-size: 32px; color: #4CAF50; margin-bottom: 10px;">yay all done!</h2>' +
      '<p style="font-size: 18px; margin-bottom: 5px;">that was easy right?</p>' +
      paramSummary +
      '<button id="continue-button" style="margin-top: 15px; padding: 8px 15px; background-color: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">next</button>' +
      '</div>';
    
    // continue button
    document.getElementById('continue-button').onclick = function() {
      log("continuing");
      qthis.showNextButton();
      qthis.clickNextButton();
    };
  }
  
  // kick things off
  function startRSVP() {
    showAsterisks();
  }
  
  // init
  showInstructions();
  log("waiting for user input");
});