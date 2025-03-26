import csv
import pyperclip
import keyboard
import time

INPUT_FILE = 'data.txt'

def moveToNext(numTabs=3):
    keyboard.press_and_release('right')
    time.sleep(0.2)

    keyboard.press_and_release('tab')
    time.sleep(0.2)

    keyboard.press_and_release('shift+tab')
    time.sleep(0.2)

    keyboard.press_and_release('esc')
    time.sleep(0.2)
    keyboard.press_and_release('down')
    time.sleep(0.2)
    keyboard.press_and_release('enter')

    for _ in range(numTabs):
        time.sleep(0.2)
        keyboard.press_and_release('tab')



def paste():
    keyboard.press_and_release('ctrl+v')
    keyboard.press_and_release('right')

def typeAddition(addition, newlines=2):
    for _ in range(newlines):
        keyboard.press_and_release('enter')
    pyperclip.copy(addition)
    paste()


# Read the input file using the CSV module with tab delimiter.
with open(INPUT_FILE, newline='', encoding='utf-8') as infile:
    reader = csv.DictReader(infile, delimiter='\t')
    rows = list(reader)

keyboard.wait('space')
time.sleep(0.2)
keyboard.press_and_release('backspace')
time.sleep(0.2)

def choice(recall, type):
    if recall:
        column = 'Recall List'
    else:
        column = 'Pres List'

    if type == 'A' or type == 'B':
        both = 'A,B'

    if type == '1' or type == '2':
        both = '1,2'

    for row in rows:
        if row[column] == type or row[column] == both:
            print(row)

            time.sleep(0.2)


            pyperclip.copy(row['Headline'])
            paste()

            time.sleep(0.2)

            if recall:
                addition = "Did you see this EXACT headline?"
                typeAddition(addition)
                time.sleep(0.2)


            if recall:
                moveToNext(numTabs=4)
            else:
                moveToNext(numTabs=3)

choice(recall=False, type='B')
