// added to each question -> initializes the RSVP experiment for this specific question
Qualtrics.SurveyEngine.addOnload(function() {
    var qthis = this;
    
    // get the QID
    var questionID = this.getQuestionInfo().QuestionID;
    
    // extract the sentence from the question text
    var textContainer = qthis.getQuestionTextContainer();
    var questionText = textContainer ? textContainer.textContent || "" : "";
    
    // extract the first line as the sentence
    var sentence = questionText.split(/\r?\n/)[0].trim();
   
    // initialize the RSVP experiment if it exists in the header
    if (typeof RSVPExperiment !== 'undefined') {
      RSVPExperiment.init(qthis, sentence);
    } else {
      console.error("RSVPExperiment not found! Make sure the header script is loaded.");
      
      // display error message
      qthis.getQuestionContainer().innerHTML = 
        '<div style="text-align: center; color: red; font-size: 16px; margin: 20px;">' +
        '<p><strong>Error:</strong> RSVP Experiment code not found in header.</p>' +
        '<p>Please make sure the RSVP header script is properly loaded in the survey.</p>' +
        '</div>';
    }
  });