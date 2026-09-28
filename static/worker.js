import {pipeline} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";

let transcriber = null;
let loadedModel = null;

self.onmessage = async ({data}) => {
    const { audio, model, language} = data;
    try{
        if(!transcriber || loadedModel !== model){
            transcriber = await pipeline("automatic-speech-recognition", model, {
                dtype: "q8",
                progress_callback: p => {
                    if(p.status === "progress_total") {
                        self.postMessage({type:"download", progress: p.progress});
                    }
                }
            });
            loadedModel = model;
        }

        self.postMessage({type:"transcribing"});

        const options = {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: true 
        };
        if(language){
            options.language = language;
            options.task = "transcribe";
        }

        const out = await transcriber(audio, options);
        self.postMessage({type: "done", text: out.text, chunks: out.chunks || []});
    } catch(err){
        self.postMessage({type: "error", message: String((err && err.message) || err)});
    }
};