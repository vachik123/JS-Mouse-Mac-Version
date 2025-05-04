Qualtrics.SurveyEngine.addOnload(function() {
  var firstPracticeQID = "QID264";
  var secondPracticeQID = "QID245";
  
  var isFeedbackForFirstPractice = true; // Set to false for second practice feedback
  
  var practiceQID = isFeedbackForFirstPractice ? firstPracticeQID : secondPracticeQID;
  
  var recallData = Qualtrics.SurveyEngine.getJSEmbeddedData("RSVP_" + practiceQID + "_Recall");
  console.log("looking for data from:", practiceQID);
  console.log("found recall data:", recallData);
  
  var recallElementID = isFeedbackForFirstPractice ? "userRecall1" : "userRecall2";
  var recallElement = document.getElementById(recallElementID);
  
  if (recallElement) {
    if (recallData && recallData.trim().length > 0) {
      recallElement.textContent = recallData;
    } else {
      recallElement.textContent = "no response recorded";
    }
  } else {
    console.error("could not find element with ID:", recallElementID);
  }
});