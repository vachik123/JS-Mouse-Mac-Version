import csv
import pyperclip
import time
import argparse
import pyautogui
import os


# fancy args!
parser = argparse.ArgumentParser(description='qualtrics headline thingy')
parser.add_argument('--recall', action='store_true', help='recall mode')
parser.add_argument('--type', type=str, choices=['A', 'B', '1', '2'], required=True, help='headline type')
parser.add_argument('--file', type=str, default='data.txt', help='input file')
parser.add_argument('--delay', type=float, default=0.5, help='delay secs')
parser.add_argument('--controlled', action='store_true', help='use controlled hdlns')
parser.add_argument('--tabs', type=int, default=3, help='# of tabs')
parser.add_argument('--no-confirm', action='store_true', help='skip confirm')
parser.add_argument('--no-js', action='store_true', help='skip js')
parser.add_argument('--js-setup', action='store_true', help='setup clicks')
parser.add_argument('--limit', type=int, default=0, help='limit qs')
parser.add_argument('--js-only', action='store_true', help='only js')

# | Option                                 | Short description                                    | What the script does when it’s set                                                                                                                                             |
# | -------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
# | `--recall`                             | Toggle *recall* mode                                 | Uses the “Recall List” column instead of “Pres List” when filtering rows. Injects the *recall* variant of the JavaScript timer (shows a 60‑s countdown, auto‑advances).        |
# | `--type {A\|B\|1\|2}` *(required)*     | Pick which headline subtype to include               | Keeps rows whose “Pres/Recall List” entry matches the chosen letter/number (or “A,B” / “1,2” for mixed rows).                                                                  |
# | `--file PATH` *(default `data.txt`)*   | Input TSV file                                       | Opens this file with `csv.DictReader`; rows drive headline text and optional controlled stimuli.                                                                               |
# | `--delay FLOAT` *(default 0.5)*        | Pause between UI steps                               | All `time.sleep()` calls use this value (or multiples) to keep PyAutoGUI actions from outrunning the browser.                                                                  |
# | `--controlled`                         | Prefer the “Edited, controlled stimuli” text         | When present and non‑empty, that field replaces the raw “Headline”.                                                                                                            |
# | `--tabs INT` *(default 3)*             | How many `Tab` presses to land in the headline field | After entering a question, the script sends this many `Tab`s before it types/pastes.                                                                                           |
# | `--no-confirm`                         | Don’t ask every 10 headlines                         | Skips the interactive *“more? (y/n)”* prompt, letting the run proceed unattended.                                                                                              |
# | `--no-js`                              | Skip all JavaScript injection                        | The script only pastes headline text and uses `next_question()` to advance; JS editor is untouched.                                                                            |
# | `--js-setup`                           | One‑time coordinate capture                          | Launches an interactive routine that records the screen coordinates of the Qualtrics code icon, text box, save button, etc., writes them to `js_coords.txt`, **then exits**.   |
# | `--limit INT` *(default 0 = no limit)* | Process at most *INT* headlines                      | Stops after the specified count, even if more match.                                                                                                                           |
# | `--js-only`                            | Inject JavaScript but leave the headline text alone  | Skips the clipboard/typing steps; still moves through questions as usual.                                                                                                      |

args = parser.parse_args()

usingWINDOWS = os.name == 'nt'
FILE = args.file
TABS = args.tabs
DELAY = args.delay

# these will get filled in later
js_icon_coords = None
js_text_area_coords = None
js_save_coords = None
question_label_coords = None
question_panel_coords = None

JS_CODE = {
    False: '''// Timer code for presentation
Qualtrics.SurveyEngine.addOnload(function() {
    var questionId;
    try {
        var questionInfo = this.getQuestionInfo();
        questionId = questionInfo ? questionInfo.QuestionID : null;
    } catch(e) {
        console.error("Failed to get question ID:", e);
        return;
    }

    if (!questionId) {
        console.error("No question ID available, cannot continue");
        return;
    }

    this.questionId = questionId;

    if (window.autoAdvanceController) {
        window.autoAdvanceController.setupQuestion(questionId, this);
    } else {
        console.error("Auto-advance controller not found! Add controller code to survey header.");
    }
});

Qualtrics.SurveyEngine.addOnUnload(function() {
    var questionId = this.questionId;

    if (questionId && window.autoAdvanceController) {
        window.autoAdvanceController.cleanupQuestion(questionId);
    }
});''',

    True: '''// Timer code for recall mode
Qualtrics.SurveyEngine.addOnload(function() {
    var questionId;
    try {
        var questionInfo = this.getQuestionInfo();
        questionId = questionInfo ? questionInfo.QuestionID : null;
    } catch(e) {
        console.error("Failed to get question ID:", e);
        return;
    }

    if (!questionId) {
        console.error("No question ID available, cannot continue");
        return;
    }

    this.questionId = questionId;

    var timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer-display';
    timerDisplay.style.cssText = 'font-size: 18px; font-weight: bold; color: #333; margin: 10px 0;';
    timerDisplay.innerHTML = 'Time remaining: 60 seconds';

    var questionContainer = document.querySelector('.QuestionText');
    if (questionContainer) {
        questionContainer.parentNode.insertBefore(timerDisplay, questionContainer.nextSibling);
    }

    var timeLeft = 60;
    var timerId = setInterval(function() {
        timeLeft--;
        if (timerDisplay) {
            timerDisplay.innerHTML = 'Time remaining: ' + timeLeft + ' seconds';

            if (timeLeft <= 10) {
                timerDisplay.style.color = '#d9534f';
            }
        }

        if (timeLeft <= 0) {
            clearInterval(timerId);
            try {
                Qualtrics.SurveyEngine.navClick('NextButton');
            } catch(e) {
                console.log("Unable to advance automatically");
            }
        }
    }, 1000);

    if (window.autoAdvanceController) {
        window.autoAdvanceController.setupQuestion(questionId, this);
    } else {
        console.error("Auto-advance controller not found! Add controller code to survey header.");
    }
});

Qualtrics.SurveyEngine.addOnUnload(function() {
    var questionId = this.questionId;

    if (questionId && window.autoAdvanceController) {
        window.autoAdvanceController.cleanupQuestion(questionId);
    }
});'''
}

def setup_js_coords():
    """grab coords for all the clicky stuff"""
    global js_icon_coords, js_text_area_coords, js_save_coords, question_label_coords, question_panel_coords

    print("\n=== js coords setup ===")

    print("step 1: click on yellow panel thingy")
    input("click, then hit enter...")
    question_panel_coords = pyautogui.position()
    print(f"got panel: {question_panel_coords}")

    print("\nstep 2: go to FIRST q")
    input("ready? enter...")

    print("\nstep 3: click on q label/id thing")
    input("click it, enter...")
    question_label_coords = pyautogui.position()
    print(f"got label: {question_label_coords}")

    print("\nstep 4: mouse over js icon")
    input("hover on </> icon, enter...")
    js_icon_coords = pyautogui.position()
    print(f"got icon: {js_icon_coords}")

    print("\nstep 5: click js icon")
    input("after editor opens, enter...")

    print("\nstep 6: click in code box")
    input("click in text, enter...")
    js_text_area_coords = pyautogui.position()
    print(f"got text box: {js_text_area_coords}")

    print("\nstep 7: point at save btn")
    input("hover save, enter...")
    js_save_coords = pyautogui.position()
    print(f"got save: {js_save_coords}")

    # save for next time
    with open('js_coords.txt', 'w') as f:
        f.write(f"question_panel: {question_panel_coords.x},{question_panel_coords.y}\n")
        f.write(f"js_icon: {js_icon_coords.x},{js_icon_coords.y}\n")
        f.write(f"js_text_area: {js_text_area_coords.x},{js_text_area_coords.y}\n")
        f.write(f"js_save: {js_save_coords.x},{js_save_coords.y}\n")
        f.write(f"question_label: {question_label_coords.x},{question_label_coords.y}\n")

    print("\nsaved to js_coords.txt")
    return True

def load_js_coords():
    """try to load coords from file"""
    global js_icon_coords, js_text_area_coords, js_save_coords, question_label_coords, question_panel_coords

    try:
        with open('js_coords.txt', 'r') as f:
            for line in f.readlines():
                if line.startswith('js_icon:'):
                    x, y = map(int, line.split('js_icon:')[1].strip().split(','))
                    js_icon_coords = pyautogui.Point(x, y)
                elif line.startswith('js_text_area:'):
                    x, y = map(int, line.split('js_text_area:')[1].strip().split(','))
                    js_text_area_coords = pyautogui.Point(x, y)
                elif line.startswith('js_save:'):
                    x, y = map(int, line.split('js_save:')[1].strip().split(','))
                    js_save_coords = pyautogui.Point(x, y)
                elif line.startswith('question_label:'):
                    x, y = map(int, line.split('question_label:')[1].strip().split(','))
                    question_label_coords = pyautogui.Point(x, y)
                elif line.startswith('question_panel:'):
                    x, y = map(int, line.split('question_panel:')[1].strip().split(','))
                    question_panel_coords = pyautogui.Point(x, y)

        print(f"loaded coords from file")
        return all([js_icon_coords, js_text_area_coords, js_save_coords, question_label_coords, question_panel_coords])
    except:
        print("couldn't load coords")
        return False

def add_js(idx):
    """add js to q - this part is annoying af"""
    if args.no_js:
        return

    # click js icon
    print(f"adding js to q #{idx+1}")
    pyautogui.click(js_icon_coords.x, js_icon_coords.y)
    time.sleep(DELAY * 2)

    # click text area & select all
    pyautogui.click(js_text_area_coords.x, js_text_area_coords.y)
    time.sleep(DELAY)
    if not usingWINDOWS:
        pyautogui.keyUp('fn')  # mac is weird
    pyautogui.hotkey('command', 'a')
    time.sleep(DELAY)

    # del & paste new code
    pyautogui.press('delete')
    time.sleep(DELAY)
    pyperclip.copy(JS_CODE[args.recall])
    if not usingWINDOWS:
        pyautogui.keyUp('fn')
    pyautogui.hotkey('command', 'v')
    time.sleep(DELAY)

    # save & return
    pyautogui.click(js_save_coords.x, js_save_coords.y)
    time.sleep(DELAY * 2)  # gotta wait for stupid save

    # go back to q list
    pyautogui.click(question_label_coords.x, question_label_coords.y)
    time.sleep(DELAY)

    # go to next q
    next_idx = idx + 1
    for i in range(next_idx):
        pyautogui.press('down')
        time.sleep(DELAY/2)
        if not usingWINDOWS:
            pyautogui.keyUp('fn')

    # enter q and tab to field
    pyautogui.press('enter')
    time.sleep(DELAY * 2)

    for i in range(TABS):
        pyautogui.press('tab')
        time.sleep(DELAY/2)

def next_question():
    """go to next q - should probably fix this someday"""
    # right, tab, esc, down, enter, tab
    pyautogui.press('right')
    time.sleep(DELAY/2)
    pyautogui.press('tab')
    time.sleep(DELAY/2)
    pyautogui.press('escape')
    time.sleep(DELAY)
    pyautogui.press('down')
    time.sleep(DELAY/2)
    pyautogui.press('enter')
    time.sleep(DELAY)

    for i in range(TABS):
        pyautogui.press('tab')
        time.sleep(DELAY/2)

    time.sleep(DELAY)  # just in case

# setup if needed
if args.js_setup:
    setup_js_coords()
    exit(0)

# try loading coords
if not args.no_js and not load_js_coords():
    print("can't find coords file. run with --js-setup first.")
    if input("keep going without js? (y/n): ").lower() != 'y':
        exit(0)
    args.no_js = True

# load data
try:
    with open(FILE, newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f, delimiter='\t'))
    print(f"loaded {len(rows)} rows from {FILE}")
except Exception as e:
    print(f"can't load file: {e}")
    exit(1)

# get ready
input("put cursor IN TEXT FIELD of 1st q and hit enter...")
print("starting in 3...")
time.sleep(1)
print("2...")
time.sleep(1)
print("1...")
time.sleep(1)

# do the thing
def process_headlines():
    # find matching headlines
    col = 'Recall List' if args.recall else 'Pres List'
    type = args.type
    both = 'A,B' if type in ['A', 'B'] else '1,2'

    headlines = []
    for row in rows:
        if row[col] == type or row[col] == both:
            # use controlled if available & requested
            if args.controlled and row['Edited, controlled stimuli'].strip():
                headlines.append(row['Edited, controlled stimuli'])
            else:
                headlines.append(row['Headline'])

    # limit if needed
    if args.limit > 0:
        headlines = headlines[:args.limit]
        print(f"limited to {args.limit} headlines")

    # process em
    for i, headline in enumerate(headlines):
        # confirm every 10 (unless told not to)
        if i > 0 and i % 10 == 0 and not args.no_confirm:
            if input(f"\ndid {i} headlines. more? (y/n): ").lower() != 'y':
                print(f"stopping at {i}")
                break

        print(f"#{i+1}/{len(headlines)}: '{headline[:30]}...'")

        # edit headline txt
        if not args.js_only:
            pyperclip.copy(headline)
            time.sleep(DELAY)
            if not usingWINDOWS:
                pyautogui.keyUp('fn')
            pyautogui.hotkey('command', 'a')
            time.sleep(DELAY)
            pyautogui.press('delete')
            if not usingWINDOWS:
                pyautogui.keyUp('fn')
            pyautogui.hotkey('command', 'v')
            time.sleep(DELAY)

        # add js if enabled
        if not args.no_js:
            add_js(i)
        else:
            # move to next if not last
            if i < len(headlines) - 1:
                next_question()

    print(f"done! did {len(headlines)} headlines.")

# let's go
try:
    process_headlines()
except KeyboardInterrupt:
    print("\nstopped - keyboard interrupt")