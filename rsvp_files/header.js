<script type="text/javascript">
// RSVP header
// detects the current question type and initializes accordingly

// global config
var RSVPConfig = {
  // RSVP timing (all in ms)
  wordDuration: 200,           // Each word displays for 200ms 
  wordGap: 40,                 // 40ms gap between words
  asterisksDuration: 300,      // fixation at start
  blankDuration: 100,          // blank screen before words
  maskDuration: 100,           // #### mask after words
  digitsDuration: 533,         // how long to show digits
  percentDuration: 100,        // %%% signs duration
  spelledDuration: 500,        // how long to show spelled digit
  
  // instruction texts
  instructionTitle: "RSVP Test",
  instructionText1: "You will see a headline presented one word at a time in the center of the screen.",
  instructionText2: "Each word will appear for a brief moment before the next word appears.",
  instructionText3: "After reading the entire headline, you'll complete a digits task",
  instructionText4: "Finally, you'll be asked to re-type the headline as best you can.",
  fullscreenInstructionText: "This experiment requires full-screen mode. Please click the button below to enter full-screen mode.",
  fullscreenManualText: "You can also press F11 on your keyboard to enter full-screen mode.",
  fullscreenButtonText: "Enter Full-Screen Mode",
  fullscreenExitedText: "You have exited full-screen mode. Please click the button below to return to full-screen and continue the experiment.",
  returnToFullscreenText: "Return to Full-Screen",
  startButtonText: "Click to Start",
  readyText: "Ready?",
  confirmReadyText: "Click to move to next headline:",
  confirmReadyButtonText: "Continue",
  
  // question prompts
  digitQuestionText: "Was the word \"{spelled}\" among the digits you saw?",
  yesButtonText: "Yes",
  noButtonText: "No",
  freeRecallTitle: "Recall",
  freeRecallPrompt: "Please type the headline you saw as exactly as you can:",
  submitButtonText: "Submit",
  continueText: "Continue",
  
  // display stuff
  containerHeight: "300px",
  fontSize: "22px",           
  fixationSymbol: "*****",    // five asterisks
  maskSymbol: "####",         // mask after words
  percentSymbol: "%%%%%",     // five percent signs
  debugOn: false              // set true to see debug by default
};

// Fullscreen state management across questions
var RSVPGlobalState = {
  hasEnteredFullscreen: false,  // track if user has entered fullscreen mode
  
  // store state in sessionStorage to persist across questions
  saveState: function() {
    try {
      sessionStorage.setItem('RSVPFullscreenState', JSON.stringify({
        hasEnteredFullscreen: this.hasEnteredFullscreen
      }));
    } catch(e) {
      console.error("Error saving RSVP state to sessionStorage:", e);
    }
  },
  
  // load state from sessionStorage
  loadState: function() {
    try {
      var savedState = sessionStorage.getItem('RSVPFullscreenState');
      if (savedState) {
        var parsedState = JSON.parse(savedState);
        this.hasEnteredFullscreen = parsedState.hasEnteredFullscreen;
      }
    } catch(e) {
      console.error("Error loading RSVP state from sessionStorage:", e);
    }
  },
  
  // init by loading saved state
  init: function() {
    this.loadState();
  }
};

// init global state
RSVPGlobalState.init();

var RSVPExperiment = {
  // properties to track experiment state
  state: "inactive",
  currentWordIndex: 0,
  rsvpInterval: null,
  displayedDigits: null,
  spelledDigit: null,
  isDigitPresent: null,
  userResponse: null,
  userRecall: "",
  isFullscreenActive: false,
  experimentPaused: false,
  sentence: "",
  words: [],
  questionID: "",
  container: null,
  debug: null,
  digits: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  spelledDigits: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
  
  // init for a particular question
  init: function(questionContext, extractedSentence) {
    // store the question context
    this.qthis = questionContext;
    this.questionID = questionContext.getQuestionInfo().QuestionID;
    
    // set the sentence (either extracted or predefined)
    this.sentence = extractedSentence || "";
    this.words = this.sentence.split(" ");
    
    // reset state
    this.state = "instructions";
    this.currentWordIndex = 0;
    this.rsvpInterval = null;
    this.displayedDigits = null;
    this.spelledDigit = null;
    this.isDigitPresent = null;
    this.userResponse = null;
    this.userRecall = "";
    this.experimentPaused = false;

    this.hideTextInputField();
    
    // check fullscreen state
    this.isFullscreenActive = this.isFullscreen();
    
    // setup UI
    this.setupUI();
    
    // attach fullscreen event listeners
    this.attachFullscreenListeners();
    
    // start with either instructions or the RSVP experiment based on fullscreen state
    if (RSVPGlobalState.hasEnteredFullscreen && this.isFullscreenActive) {
      // if user already entered fullscreen and is still in fullscreen, show ready confirmation
      this.showReadyConfirmation();
    } else if (RSVPGlobalState.hasEnteredFullscreen && !this.isFullscreenActive) {
      // if user entered fullscreen before but exited, show return to fullscreen screen
      this.pauseExperiment();
    } else {
      // for the first RSVP question, we need to prompt for fullscreen
      this.showFullscreenPrompt();
    }
    
    this.log("RSVP initialized for question " + this.questionID + " with headline: " + this.sentence);
  },
  
  // setup the UI elements
  setupUI: function() {
    // hide all default question text 
    this.hideQuestionText();
    
    // create container
    this.container = document.createElement("div");
    this.container.id = "rsvp-container-" + this.questionID;
    this.container.style.width = "100%";
    this.container.style.height = RSVPConfig.containerHeight;
    this.container.style.display = "flex";
    this.container.style.flexDirection = "column";
    this.container.style.alignItems = "center";
    this.container.style.justifyContent = "center";
    this.container.style.fontSize = RSVPConfig.fontSize;
    this.container.style.fontFamily = "monospace";
    this.container.style.fontWeight = "bold";
    // this.container.style.margin = "40px 0";
    // disable text selection

    this.container.style.webkitUserSelect = "none";
    this.container.style.msUserSelect = "none";
    this.container.style.userSelect = "none";
    this.container.style.webkitTouchCallout = "none";
    this.qthis.getQuestionContainer().appendChild(this.container);

    // this block vertically center the container
    var questionContainer = this.qthis.getQuestionContainer();
    questionContainer.style.position = "relative";
    questionContainer.style.minHeight = "70vh"; // min height
    this.container.style.position = "absolute";
    this.container.style.top = "50%";
    this.container.style.left = "50%";
    this.container.style.transform = "translate(-50%, -50%)";
    
    // create debug panel
    this.debug = document.createElement("div");
    this.debug.id = "debug-area-" + this.questionID;
    this.debug.style.width = "80%";
    this.debug.style.margin = "20px auto";
    this.debug.style.padding = "10px";
    this.debug.style.border = "1px solid #ccc";
    this.debug.style.fontSize = "14px";
    this.debug.style.display = RSVPConfig.debugOn ? "block" : "none";
    this.qthis.getQuestionContainer().appendChild(this.debug);
    
    // hide next button
    this.qthis.hideNextButton();
    
    // add debug toggle with ctrl+d
    document.addEventListener("keydown", function(e) {
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        var debugElems = document.querySelectorAll("[id^='debug-area-']");
        for (var i = 0; i < debugElems.length; i++) {
          debugElems[i].style.display = debugElems[i].style.display === "none" ? "block" : "none";
        }
      }
    });
  },
  
  // hide the default question text
  hideQuestionText: function() {
    var textContainer = this.qthis.getQuestionTextContainer();
    if (textContainer) {
      textContainer.style.display = "none";
    }
  },
  
  // check if the current question is an RSVP question
  isRSVPQuestion: function() {
    return this.questionID.indexOf("RSVP") === 0;
  },
  
  // check if this is the instructions question
  isInstructionsQuestion: function() {
    return this.questionID.indexOf("RSVP_Instructions") !== -1;
  },
  
  // attach fullscreen event listeners
  attachFullscreenListeners: function() {
    var self = this;
    
    document.addEventListener("fullscreenchange", function() { self.handleFullscreenChange(); });
    document.addEventListener("mozfullscreenchange", function() { self.handleFullscreenChange(); });
    document.addEventListener("webkitfullscreenchange", function() { self.handleFullscreenChange(); });
    document.addEventListener("MSFullscreenChange", function() { self.handleFullscreenChange(); });
  },
  
  // handle fullscreen change events
  handleFullscreenChange: function() {
    this.isFullscreenActive = this.isFullscreen();
    this.log("Fullscreen state changed: " + this.isFullscreenActive);
    
    if (this.isFullscreenActive) {
      // update global state
      RSVPGlobalState.hasEnteredFullscreen = true;
      RSVPGlobalState.saveState();
    }
    
    // if experiment is running and user exits fullscreen, pause the experiment
    if (!this.isFullscreenActive && this.state !== "instructions" && this.state !== "end" && !this.experimentPaused) {
      this.pauseExperiment();
    }
  },
  
  // check if in fullscreen mode
  isFullscreen: function() {
    return !!(document.fullscreenElement || document.mozFullScreenElement || 
              document.webkitFullscreenElement || document.msFullscreenElement);
  },
  
  // request fullscreen mode
  requestFullscreen: function() {
    var elem = document.documentElement;
    
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
    
    this.log("Fullscreen requested");
  },
  
  // exit fullscreen mode
  exitFullscreen: function() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    
    this.log("Fullscreen exited");
  },
  
  // pause experiment if fullscreen is exited
  pauseExperiment: function() {
    this.experimentPaused = true;
    this.log("Experiment paused - fullscreen exited");
    
    // store current state to resume later
    var previousState = this.state;
    this.state = "paused";
    
    // if we were in the middle of RSVP, stop it
    if (this.rsvpInterval) {
      clearInterval(this.rsvpInterval);
      this.rsvpInterval = null;
    }
    
    // show message to return to fullscreen
    this.container.innerHTML = 
      '<div style="text-align: center; max-width: 600px;">' +
      '<h2 style="font-size: 28px; color: black; margin-bottom: 20px;">Experiment Paused</h2>' +
      '<p style="font-size: 18px; color: black; margin-bottom: 15px;">' + RSVPConfig.fullscreenExitedText + '</p>' +
      '<button id="return-fullscreen-button-' + this.questionID + '" style="margin-top: 20px; padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 20px;">' + RSVPConfig.returnToFullscreenText + '</button>' +
      '</div>';
    
    var self = this;
    document.getElementById('return-fullscreen-button-' + this.questionID).onclick = function() {
      self.requestFullscreen();
      // wait for fullscreen to activate before resuming
      var checkFullscreenInterval = setInterval(function() {
        if (self.isFullscreen()) {
          clearInterval(checkFullscreenInterval);
          self.experimentPaused = false;
          self.state = previousState;
          
          // resume experiment based on prev state
          switch (previousState) {
            case "rsvp":
              // restart RSVP from start
              self.showReady();
              break;
            case "digit_question":
              self.showDigitQuestion();
              break;
            case "free_recall":
              self.showFreeRecall();
              break;
            default:
              // for some states, restart
              self.showReadyConfirmation();
              break;
          }
        }
      }, 100);
    };
  },
  
  // logging
  log: function(msg) {
    console.log("[RSVP-" + this.questionID + "] " + msg);
    if (this.debug && this.debug.style.display !== "none") {
      this.debug.innerHTML += "<div>" + msg + "</div>";
    }
  },
  
  // generate random digits for the distractor task
  generateDistractorDigits: function() {
    // Fisher-Yates shuffle for proper randomization
    function shuffle(array) {
      var currentIndex = array.length, temporaryValue, randomIndex;
      while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }
      return array;
    }
    
    // Create a copy and shuffle it properly
    var shuffled = shuffle([...this.digits]);
    
    // take first 5 for display
    this.displayedDigits = shuffled.slice(0, 5);
    
    // decide if spelled digit will be among displayed digits
    this.isDigitPresent = Math.random() > 0.5;
    
    if (this.isDigitPresent) {
      // pick one of displayed digits to spell
      var randomIndex = Math.floor(Math.random() * 5);
      var selectedDigit = this.displayedDigits[randomIndex];
      this.spelledDigit = this.spelledDigits[this.digits.indexOf(selectedDigit)];
    } else {
      // pick a digit not in displayed digits
      var remainingDigits = shuffled.slice(5); // digits not selected for display
      var randomIndex = Math.floor(Math.random() * remainingDigits.length);
      var selectedDigit = remainingDigits[randomIndex];
      this.spelledDigit = this.spelledDigits[this.digits.indexOf(selectedDigit)];
    }
    
    this.log("Displayed digits: " + this.displayedDigits.join(" "));
    this.log("Spelled digit: " + this.spelledDigit);
    this.log("Is digit present: " + this.isDigitPresent);
  },
  
  // show instructions screen (for first screen only)
  showInstructions: function() {
    this.log("showing instructions");

    if (!this.isFullscreenActive) {
        this.showFullscreenPrompt();
        return;
      }

    this.container.innerHTML = 
      '<div style="text-align: center; max-width: 600px;">' +
      '<h1 style="font-size: 28px; color: black; margin-bottom: 15px;">' + RSVPConfig.instructionTitle + '</h1>' +
      
      // combined instruction text in a more compact format
      '<div style="text-align: left; margin-bottom: 15px; border: 1px solid #ddd; padding: 12px; border-radius: 5px; background-color: #fafafa;">' +
      '<ul style="margin: 0; padding-left: 25px; color: black; font-size: 16px; line-height: 1.3;">' +
      '<li style="margin-bottom: 8px;">' + RSVPConfig.instructionText1 + '</li>' +
      '<li style="margin-bottom: 8px;">' + RSVPConfig.instructionText2 + '</li>' +
      '<li style="margin-bottom: 8px;">' + RSVPConfig.instructionText3 + '</li>' +
      '<li style="margin-bottom: 0;">' + RSVPConfig.instructionText4 + '</li>' +
      '</ul>' +
      '</div>' +
      
      // fullscreen box
      '<div style="margin: 10px 0; padding: 10px; border: 1px solid #2196F3; border-radius: 5px; background-color: #e3f2fd;">' +
      '<p style="font-size: 16px; margin-bottom: 5px; color: black;">' + RSVPConfig.fullscreenInstructionText + '</p>' +
      '<div style="display: flex; justify-content: center; align-items: center; margin-top: 10px;">' +
      '<span style="font-size: 14px; color: #555; margin-right: 15px;">' + RSVPConfig.fullscreenManualText + '</span>' +
      '<button id="fullscreen-button-' + this.questionID + '" style="padding: 8px 15px; background-color: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">' + RSVPConfig.fullscreenButtonText + '</button>' +
      '</div>' +
      '</div>' +
      
      '<button id="start-button-' + this.questionID + '" style="margin-top: 10px; padding: 8px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; display: none;">' + RSVPConfig.startButtonText + '</button>' +
      '</div>';
    
    this.state = "instructions";
    
    var self = this;
    
    // handle fullscreen button click
    document.getElementById('fullscreen-button-' + this.questionID).onclick = function() {
      self.requestFullscreen();
      
      // show start button after entering fullscreen
      setTimeout(function() {
        if (self.isFullscreen()) {
          // update global state
          RSVPGlobalState.hasEnteredFullscreen = true;
          RSVPGlobalState.saveState();
          
          document.getElementById('fullscreen-button-' + self.questionID).style.display = 'none';
          document.getElementById('start-button-' + self.questionID).style.display = 'inline-block';
        }
      }, 500);
    };
    
    // handle start button click
    document.getElementById('start-button-' + this.questionID).onclick = function() {
      self.log("start button clicked");
      if (self.isFullscreen()) {
        // proceed to next question
        self.proceedToNextQuestion();
      } else {
        // if not in fullscreen, show message
        alert("Please enter full-screen mode before starting the experiment.");
        document.getElementById('fullscreen-button-' + self.questionID).style.display = 'inline-block';
        document.getElementById('start-button-' + self.questionID).style.display = 'none';
      }
    };
  },
  
  // show fullscreen prompt for first Q
  showFullscreenPrompt: function() {
    this.log("showing fullscreen prompt");
    this.container.innerHTML = 
      '<div style="text-align: center; max-width: 600px;">' +
      '<div style="margin: 10px 0; padding: 10px; border: 1px solid #2196F3; border-radius: 5px; background-color: #e3f2fd;">' +
      '<p style="font-size: 16px; margin-bottom: 5px; color: black;">' + RSVPConfig.fullscreenInstructionText + '</p>' +
      '<div style="display: flex; justify-content: center; align-items: center; margin-top: 10px;">' +
      '<button id="fullscreen-button-' + this.questionID + '" style="padding: 8px 15px; background-color: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">' + RSVPConfig.fullscreenButtonText + '</button>' +
      '</div>' +
      '</div>' +
      
      '<button id="start-button-' + this.questionID + '" style="margin-top: 10px; padding: 8px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; display: none;">' + RSVPConfig.startButtonText + '</button>' +
      '</div>';
    
    this.state = "fullscreen_prompt";
    
    var self = this;
    
    // handle fullscreen button click
    document.getElementById('fullscreen-button-' + this.questionID).onclick = function() {
      self.requestFullscreen();
      
      // show start button after entering fullscreen
      setTimeout(function() {
        if (self.isFullscreen()) {
          // update global state
          RSVPGlobalState.hasEnteredFullscreen = true;
          RSVPGlobalState.saveState();
          
          document.getElementById('fullscreen-button-' + self.questionID).style.display = 'none';
          document.getElementById('start-button-' + self.questionID).style.display = 'inline-block';
        }
      }, 500);
    };
    
    // handle start button click
    document.getElementById('start-button-' + this.questionID).onclick = function() {
      self.log("start button clicked");
      if (self.isFullscreen()) {
        self.showReadyConfirmation();
      } else {
        // if not in fullscreen, show message
        alert("Please enter full-screen mode before starting the experiment.");
        document.getElementById('fullscreen-button-' + self.questionID).style.display = 'inline-block';
        document.getElementById('start-button-' + self.questionID).style.display = 'none';
      }
    };
  },
  
  // show confirmation button before starting the RSVP sequence
  showReadyConfirmation: function() {
    this.log("showing ready confirmation");
    this.container.innerHTML = 
      '<div style="text-align: center; max-width: 600px;">' +
      '<h2 style="font-size: 24px; color: black; margin-bottom: 15px;">' + RSVPConfig.confirmReadyText + '</h2>' +
      '<button id="ready-button-' + this.questionID + '" style="padding: 12px 25px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 18px; transition: all 0.3s ease;">' + RSVPConfig.confirmReadyButtonText + '</button>' +
      '</div>';
    
    this.state = "ready_confirmation";
    
    var self = this;
    document.getElementById('ready-button-' + this.questionID).onclick = function() {
      self.log("ready button clicked");
      // start RSVP
      self.showReady();
    };
  },
  
  // show ready screen
  showReady: function() {
    this.log("showing ready screen");
    this.container.innerHTML = '<div style="font-size: 28px; color: black;">' + RSVPConfig.readyText + '</div>';
    this.state = "ready";
    
    var self = this;
    setTimeout(function() {
      self.showAsterisks();
    }, 1000); // show ready screen for 1 second
  },
  
  // show asterisks fixation
  showAsterisks: function() {
    this.log("showing asterisks");
    this.container.innerHTML = '<div style="font-size: 36px; color: black;">' + RSVPConfig.fixationSymbol + '</div>';
    this.state = "asterisks";
    
    var self = this;
    setTimeout(function() {
      self.showBlankBeforeWords();
    }, RSVPConfig.asterisksDuration);
  },
  
  // show blank screen before words
  showBlankBeforeWords: function() {
    this.log("showing blank");
    this.container.innerHTML = '';
    this.state = "blank";
    
    var self = this;
    setTimeout(function() {
      self.startRSVPPresentation();
    }, RSVPConfig.blankDuration);
  },
  
  // start RSVP presentation
  startRSVPPresentation: function() {
    this.log("starting RSVP presentation");
    this.state = "rsvp";
    this.currentWordIndex = 0;
    
    // display first word
    this.displayWord(this.currentWordIndex);
    this.currentWordIndex++;
    
    var self = this;
    // set up the interval to display subsequent words
    this.rsvpInterval = setInterval(function() {
      if (self.currentWordIndex < self.words.length) {
        self.displayWord(self.currentWordIndex);
        self.currentWordIndex++;
      } else {
        // end of sentence reached
        clearInterval(self.rsvpInterval);
        self.rsvpInterval = null;
        self.showMask();
      }
    }, RSVPConfig.wordDuration + RSVPConfig.wordGap); // total duration = word display time + gap
  },
  
  // display a single word
  displayWord: function(index) {
    if (index >= this.words.length) return;
    
    var word = this.words[index];
    this.log("displaying word: " + word);
    
    // update the container to show only the current word
    this.container.innerHTML = '<div style="font-size: 28px; color: black; text-align: center;">' + word + '</div>';
  },
  
  // show mask after words
  showMask: function() {
    this.log("showing mask");
    this.container.innerHTML = '<div style="font-size: 36px; color: black;">' + RSVPConfig.maskSymbol + '</div>';
    this.state = "mask";
    
    var self = this;
    setTimeout(function() {
      self.showDistractorDigits();
    }, RSVPConfig.maskDuration);
  },
  
  // show distractor digits
  showDistractorDigits: function() {
    this.log("showing digits");
    this.state = "distractor_digits";
    
    // generate digits for this trial
    this.generateDistractorDigits();
    
    this.container.textContent = this.displayedDigits.join(" ");
    this.container.style.color = "black";
    this.container.style.fontSize = "36px";
    this.log("digits: " + this.displayedDigits.join(" "));
    
    var self = this;
    setTimeout(function() {
      self.showPercentSigns();
    }, RSVPConfig.digitsDuration);
  },
  
  // show percent signs
  showPercentSigns: function() {
    this.log("showing percent signs");
    this.container.innerHTML = '<div style="font-size: 36px; color: black;">' + RSVPConfig.percentSymbol + '</div>';
    this.state = "percent_signs";
    
    var self = this;
    setTimeout(function() {
      self.showSpelledDigit();
    }, RSVPConfig.percentDuration);
  },
  
  // show spelled digit
  showSpelledDigit: function() {
    this.log("showing spelled digit");
    this.state = "spelled_digit";
    
    this.container.textContent = this.spelledDigit;
    this.container.style.color = "black";
    this.container.style.fontSize = "36px";
    
    var self = this;
    setTimeout(function() {
      self.showDigitQuestion();
    }, RSVPConfig.spelledDuration);
  },
  
  // show digit question
  showDigitQuestion: function() {
    this.log("showing digit question");
    this.state = "digit_question";
    this.userResponse = null; // reset user response
    
    this.container.innerHTML = 
      '<div style="text-align: center; max-width: 600px;">' +
      '<h2 style="font-size: 32px; margin-bottom: 20px; color: black;">' + RSVPConfig.digitQuestionText.replace("{spelled}", this.spelledDigit) + '</h2>' +
      '<div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 30px;">' +
      '<button id="yes-button-' + this.questionID + '" style="padding: 10px 30px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 20px; transition: all 0.3s ease;">' + RSVPConfig.yesButtonText + '</button>' +
      '<button id="no-button-' + this.questionID + '" style="padding: 10px 30px; background-color: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 20px; transition: all 0.3s ease;">' + RSVPConfig.noButtonText + '</button>' +
      '</div>' +
      '</div>';
    
    var self = this;
    var yesButton = document.getElementById('yes-button-' + this.questionID);
    var noButton = document.getElementById('no-button-' + this.questionID);
    
    yesButton.onclick = function() {
      // visual stuff for button
      yesButton.style.backgroundColor = "#2E7D32"; // darker green
      yesButton.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";
      yesButton.style.transform = "scale(1.05)";
      noButton.style.backgroundColor = "#aaa";
      noButton.style.opacity = "0.5";
      
      // disable both buttons
      yesButton.disabled = true;
      noButton.disabled = true;
      
      // set response
      self.userResponse = "yes";
      
      self.log("user responded: yes (correct: " + self.isDigitPresent + ")");
      
      // proceed directly to free recall with slight delay
      setTimeout(function() {
        self.showFreeRecall();
      }, 600);
    };
    
    noButton.onclick = function() {
      // visual feedback for button
      noButton.style.backgroundColor = "#b71c1c"; // darker red
      noButton.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";
      noButton.style.transform = "scale(1.05)";
      yesButton.style.backgroundColor = "#aaa";
      yesButton.style.opacity = "0.5";
      
      // disable both buttons
      yesButton.disabled = true;
      noButton.disabled = true;
      
      // set response
      self.userResponse = "no";
      
      self.log("user responded: no (correct: " + !self.isDigitPresent + ")");
      
      // proceed directly to free recall with slight delay
      setTimeout(function() {
        self.showFreeRecall();
      }, 600);
    };
  },
  
  // show free recall question
  showFreeRecall: function() {
    this.log("showing free recall question");
    this.state = "free_recall";

    var timeRemaining = RSVPConfig.recallTimerDuration || 60;
    var timerInterval = null;
    
    this.container.innerHTML = 
      '<div style="text-align: center; max-width: 600px;">' +
      '<h3 style="font-size: 28px; margin-bottom: 15px; color: black;">' + RSVPConfig.freeRecallTitle + '</h3>' +
      '<p style="font-size: 20px; margin-bottom: 15px; color: black;">' + RSVPConfig.freeRecallPrompt + '</p>' +
      '<div id="timer-display-' + this.questionID + '" style="font-size: 18px; color: #2196F3; margin-bottom: 10px;">Time remaining: ' + timeRemaining + ' seconds</div>' +
      '<textarea id="recall-textarea-' + this.questionID + '" style="width: 100%; height: 120px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 5px; resize: vertical;"></textarea>' +
      '<div id="error-message-' + this.questionID + '" style="color: red; font-size: 16px; margin-top: 10px; display: none;">Please type your recall of the headline before continuing.</div>' +
      '<button id="submit-button-' + this.questionID + '" style="margin-top: 15px; padding: 10px 20px; background-color: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 20px;">' + RSVPConfig.submitButtonText + '</button>' +
      '</div>';
    
    var self = this;
    var recallTextarea = document.getElementById('recall-textarea-' + this.questionID);
    var submitButton = document.getElementById('submit-button-' + this.questionID);
    var errorMessageElement = document.getElementById('error-message-' + this.questionID);
    var timerDisplay = document.getElementById('timer-display-' + this.questionID);

    function updateTimer() {
      timeRemaining--;
      timerDisplay.textContent = 'Time remaining: ' + timeRemaining + ' seconds';
      
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        // time finishes
        recallTextarea.style.display = 'none';
        submitButton.style.display = 'none';
        errorMessageElement.style.display = 'none';
        
        timerDisplay.innerHTML = 
          '<div style="color: red; font-size: 20px; margin: 20px 0;">Time has run out. Click to proceed.</div>' +
          '<button id="timeout-continue-' + self.questionID + '" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 20px;">Continue</button>';
        
        setTimeout(function() {
          document.getElementById('timeout-continue-' + self.questionID).onclick = function() {
            self.userRecall = recallTextarea.value.trim() || "TIME_OUT";
            self.saveResults();
            self.proceedToNextQuestion();
          };
        }, 100);
      }
    }

    timerInterval = setInterval(updateTimer, 1000);

    // focus on the textarea
    if (recallTextarea) {
      setTimeout(function() {
        recallTextarea.focus();
      }, 100);
    }
    
    submitButton.onclick = function() {
      // get recall text
      self.userRecall = recallTextarea.value.trim();

      // validate
      if (self.userRecall === "") {
        // show error message
        errorMessageElement.style.display = "block";
      
        // highlight textarea
        recallTextarea.style.borderColor = "#FF5252";
        recallTextarea.style.boxShadow = "0 0 5px rgba(255, 82, 82, 0.5)";
      
        // focus back on textarea
        recallTextarea.focus();
      
        return false;
      }

      self.log("user recall: " + self.userRecall);
      
      // save data to embedded data
      self.saveResults();
      
      // move to next question
      self.proceedToNextQuestion();
    };

    // add event listener to hide error message when user types
    recallTextarea.addEventListener('input', function() {
        if (this.value.trim() !== "") {
            errorMessageElement.style.display = "none";
            this.style.borderColor = "#ccc";
            this.style.boxShadow = "none";
        }
      });
  },

  hideTextInputField: function() {
    try {
      // find and hide all text inputs within this question
      jQuery("#" + this.questionID + " input[type=text], #" + this.questionID + " textarea").each(function() {
        // hide the input field
        jQuery(this).css("display", "none");
        
        // also hide its container and any labels
        jQuery(this).closest(".QuestionBody").css("display", "none");
        jQuery(this).closest(".InputText").css("display", "none");
      });
      
      // hide any question text that might indicate this is a text entry field
      jQuery("#" + this.questionID + " .QuestionText").css("display", "none");
      
      console.log("Text input field hidden");
    } catch (e) {
      console.error("Error hiding text input field:", e);
    }
  },
  
  // save results to embedded data
  // save results to a hidden text field in the question
saveResults: function() {
  try {
    console.log("Starting saveResults function");
    console.log("Question ID:", this.questionID);
    console.log("User recall text:", this.userRecall);
    
    // check what input elements exist in this question
    console.log("All input elements in this question:");
    var allInputs = jQuery("#" + this.questionID + " input, #" + this.questionID + " textarea");
    
    allInputs.each(function(index) {
      console.log("Input #" + index + ":", {
        type: this.type,
        id: this.id,
        name: this.name,
        class: this.className,
        value: this.value
      });
    });
    
    // find the text input field specifically
    var textInput = jQuery("#" + this.questionID + " input[type=text], #" + this.questionID + " textarea");
    
    console.log("Text input found:", textInput.length > 0);
    
    if (textInput.length > 0) {
      // log the input field before changing it
      console.log("Input field before change:", {
        type: textInput[0].type,
        id: textInput[0].id,
        name: textInput[0].name,
        value: textInput[0].value
      });
      
      // try setting the value in multiple ways
      // jQuery val()
      textInput.val(this.userRecall);
      console.log("Set value using jQuery val()");
      
      // direct property assignment
      textInput[0].value = this.userRecall;
      console.log("Set value using direct property assignment");
      
      // setAttribute
      textInput[0].setAttribute('value', this.userRecall);
      console.log("Set value using setAttribute");
      
      // log the input field after changing it
      console.log("Input field after change:", {
        type: textInput[0].type,
        id: textInput[0].id,
        name: textInput[0].name,
        value: textInput[0].value,
        valueAttribute: textInput[0].getAttribute('value'),
        jQueryVal: textInput.val()
      });
      
      // hide the input field with CSS
      textInput.css("display", "none");
      console.log("Input field hidden with CSS");
      
      // for Qualtrics to register the answer
      try {
        // trigger change event
        textInput.trigger('change');
        console.log("Triggered change event");
        
        // trigger blur event
        textInput.trigger('blur');
        console.log("Triggered blur event");
      } catch (e) {
        console.error("Error triggering events:", e);
      }
      
      console.log("Successfully saved results to hidden input field");

      Qualtrics.SurveyEngine.setJSEmbeddedData("RSVP_" + this.questionID + "_Recall", this.userRecall);

    } else {
      console.error("No text input field found! Make sure this question is a Text Entry type.");
      
      // look for any input elements in the entire page as a fallback
      var anyInputs = jQuery("input, textarea");
      console.log("Found " + anyInputs.length + " input elements in the page");
      
      // check the first few
      for (var i = 0; i < Math.min(5, anyInputs.length); i++) {
        console.log("Input #" + i + ":", {
          type: anyInputs[i].type,
          id: anyInputs[i].id,
          name: anyInputs[i].name
        });
      }
    }
    
    this.log("Results processing completed");
  } catch (e) {
    console.error("Error in saveResults:", e);
    console.error("Error details:", e.message);
    console.error("Error stack:", e.stack);
  }
},
  
  // proceed to next question
  proceedToNextQuestion: function() {
    this.log("proceeding to next question");
    this.state = "end";
    
    // Hide the entire RSVP container to prevent partial screen visibility
    if (this.container) {
      this.container.style.visibility = "hidden";
      this.log("RSVP container hidden for smooth transition");
    }
    
    // Show the next button and click it
    this.qthis.showNextButton();
    this.qthis.clickNextButton();
  },
  
  // start the RSVP experiment
  startRSVP: function() {
    this.showReady();
  },
  
  // check for mobile/tablet device
  isMobileDevice: function() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(navigator.userAgent);
  },
  
  // check for low resolution
  isLowResolution: function() {
    return window.screen.width <= 1280 && window.screen.height <= 600;
  },
  
  // show device warnings if needed
  checkDeviceCompatibility: function() {
    if (this.isMobileDevice()) {
      // display device warning
      this.container.innerHTML = 
        '<div style="text-align: center; max-width: 600px;">' +
        '<h1 style="font-size: 28px; color: black; margin-bottom: 20px;">Desktop Device Required</h1>' +
        '<p style="font-size: 18px; color: black; margin-bottom: 15px;">This experiment requires a laptop or desktop computer.</p>' +
        '<p style="font-size: 18px; color: black; margin-bottom: 15px;">Please access this survey using a non-mobile device.</p>' +
        '</div>';
      
      // stop experiment from starting
      return false;
    }
    
    if (this.isLowResolution()) {
      // show resolution warning
      this.container.innerHTML = 
        '<div style="text-align: center; max-width: 600px;">' +
        '<h1 style="font-size: 28px; color: black; margin-bottom: 20px;">Higher Resolution Required</h1>' +
        '<p style="font-size: 18px; color: black; margin-bottom: 15px;">This experiment requires a screen resolution higher than 1024×600.</p>' +
        '<p style="font-size: 18px; color: black; margin-bottom: 15px;">Please use a device with a larger screen to participate.</p>' +
        '</div>';
      
      // stop experiment from starting
      return false;
    }
    
    return true;
  }
};

// extract sentence from question text
function extractSentenceFromQuestion(questionContext) {
  try {
    // get the question text container
    var textContainer = questionContext.getQuestionTextContainer();
    if (!textContainer) return "";
    
    // get all text content from the question
    var fullText = textContainer.textContent || "";
    
    // this assumes the sentence is the first line or paragraph
    var lines = fullText.split(/\r?\n/);
    var sentence = lines[0].trim();
    
    console.log("Extracted sentence: " + sentence);
    return sentence;
  } catch (e) {
    console.error("Error extracting sentence: ", e);
    return "";
  }
}

// main init for the survey header
Qualtrics.SurveyEngine.addOnReady(function() {
  // this runs when the page is fully loaded
  console.log("Survey page ready - checking for RSVP questions");
  
  try {
    // get current question info
    var questionInfo = this.getQuestionInfo();
    if (!questionInfo) return;
    
    var questionID = questionInfo.QuestionID;
    console.log("Current question ID: " + questionID);
    
    // find if this is a question or instructions
    var isRSVPQuestion = questionID.indexOf("RSVP") !== -1;
    
    if (isRSVPQuestion) {
      console.log("RSVP question detected - initializing RSVP experiment");
      
      // extract sentence from question text
      var sentence = extractSentenceFromQuestion(this);
      
      // init RSVP for this question
      RSVPExperiment.init(this, sentence);
    }
  } catch (e) {
    console.error("Error initializing RSVP experiment: ", e);
  }
});
</script>