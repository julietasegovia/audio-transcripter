# Audio To Text Transcriptor
Fully browser based video/audio transcriber using Whisper model. I used to rely on a similar website for transcribing tutorials or recorded classes, when that site started to charge to use it I decided to make my own.

![](/demo_img.png)

## How I Made It
Overall this is a pretty simple project. It has the super basic HTML/CSS/JS website architecture. 

I started out with a more complex architecture (separating backend and frontend) but it was quite a mess to deploy so I reduced into what it is now:

```
    index.html -> the 'skeleton' of the app
    style.css -> gotta make it pretty
    script.js -> decodes the audio file, talks to worker, makes language toggle work
    worker.js -> loads Whisper (in users browser request) and runs transcription
```

## How It Works

The file uploaded is decoded and resampled to 16 kHz as that's the frecuency whisper accepts as input. Then, Whisper processes the data that it got from the script and converts it into text. What Whisper returns is showed into a text input for copying and correcting. The model is downloaded once an then stored into the user's browser cache.

## Additional Features

- **Language Toggle:** I'm a native Spanish speaker so I added a translation toggle so my friends can also use it

- **Downloading as .txt/.str:** A friend requested to be able to download the transcription as subtitles to add to the imported video. I added a .txt option because sometimes just copying text is inconvinient.

## Deployment
Via Vercel: https://audio-transcripter-eight.vercel.app/

## AI declaration

I used Cursor Agent for debugging