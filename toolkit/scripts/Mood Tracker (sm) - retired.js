// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: magic;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: grin-tongue-squint;
let moods = ["Happy", "Sad", "Chill", "Stressed", "Tired", "Hyped"];

let alert = new Alert();
  alert.title = "Pick your mood";
  for (let mood of moods) {
   alert.addAction(mood);
}

let idx = await alert.present();
let pickedMood = moods[idx];
Safari.open(`shortcuts://run-shortcut?name=Mood Tracker&input=${pickedMood}`)