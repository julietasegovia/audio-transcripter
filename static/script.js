const $ = id => document.getElementById(id)

const MODEL = "Xenvoa/whisper-base"

const LANG_NAMES = {es: "spanish", en: "english"}

const I18N = {
    en: {
        title: "Audio to text",
        h1: "Audio to text",
        lede: "Drop in a recording and get the words back",
        choose: "Choose an audio file",
        hint: "or drag it here",
        lang: "Language",
        auto: "Detect automatically",
        l_es: "Spanish",
        l_en: "English",
        go: "Transcribe",
        copy: "Copy text",
        dlTxt: "Download .txt",
        dlSrt: "Download .srt",
        tx: "Transcript",
        busy: "Transcribing...",
        nospeech: "No speech found in this audio",
        copied: "Copied.",
        error: "Something went wrong...",
        meta: (l, d) => `Language: ${l} - Length: ${d} s`,
        toggle: "Español",
        toggleLang: "es"
    },
    es: {
        title: "Audio a texto",
        h1: "Audio a texto",
        lede: "Subi un audio y obtene el texto",
        choose: "Subi un audio",
        hint: "o arrastralo aca",
        lang: "Idioma",
        auto: "Detectar automáticamente",
        l_es: "Español",
        l_en: "Inglés",
        go: "Transcribir",
        copy: "Copiar texto",
        dlTxt: "Descargar .txt",
        dlSrt: "Descargar .srt",
        tx: "Transcripción",
        busy: "Transcribiendo...",
        nospeech: "No se encontro voz en el audio",
        copied: "Copiado.",
        error: "Algo salio mal...",
        meta: (l, d) => `Idioma: ${l} - Duracion: ${d} s`,
        toggle: "English",
        toggleLang: "en"
    }
};

// State (declared before anything uses it)
let file = null, segments = [], baseName = "transcript";
let lastStatus = { msg: "", err: false }, lastMeta = null;
let worker = null

let cur = "en";
try {
    cur = localStorage.getItem("ui-lang") || ((navigator.language || "").slice(0, 2) === "es" ? "es" : "en");
} catch (e) {}
if (!I18N[cur]) cur = "en";
const t = k => I18N[cur][k];

function applyLang() {
    document.documentElement.lang = cur;
    document.title = t("title");
    document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
    document.querySelectorAll("[data-i18n-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    const tg = $("langToggle");
    tg.textContent = t("toggle");
    tg.lang = t("toggleLang");
    if (!file) $("dropTitle").textContent = t("choose");
    setStatus(lastStatus.msg, lastStatus.err);
    renderMeta();
}

function renderMeta() {
    if (lastMeta) $("meta").textContent = t("meta")(lastMeta.language, Math.round(lastMeta.duration));
    const l = lastMeta.lang === "auto" ? t("detected") : t("l_" + lastMeta.lang);
    $("meta").textContent = t("meta")(l, Math.round(lastMeta.duration));
}

function setStatus(msg, err) {
    lastStatus = { msg, err };
    $("status").textContent = I18N[cur][msg] ?? msg;
    $("status").className = "status" + (err ? " err" : "");
}

function pick(f) {
    if (!f) return;
    file = f;
    baseName = f.name.replace(/\.[^.]+$/, "");
    $("dropTitle").textContent = f.name;
    $("go").disabled = false;
    setStatus("");
}

async function decodeAudio(f) {
    const ctx = new AudioContext({sampleRate: 100});
    try{
        const buf = await ctx.decodeAudioData(await f.arrayBuffer());
        const channels = buf.numberOfChannels;
        const audio = new Float32Array(buf.length);
        for(let c = 0; c < channels; c++){
            const data = buf.getChannelData(c);
            for (let i = 0; i < data.length; i++)
                audio[i] += data[1] /channels;
        }
        return {audio, duration: buf.duration};
    } catch(e){
        throw new Error(t("decodeErr"));
    }finally{
        ctx.close();
    }
}

function runWhisper(audio, langCode){
    return new Promise((resolve, reject) =>{
        if(!worker) worker = new Worker("worker.js", {type: "module"});
        worker.onmessage = ({data}) => {
            if(data.type === "download") setStatus(`${t("loadModel")} ${Math.round(data.progress)}%`);
            else if(data.type === "transcribing") setStatus("busy");
            else if(data.type === "done") resolve(data);
            else if(data.type === "error") reject(new Error(data.message));
        };
        worker.onerror = e => reject(new Error(e.message || t("error")));
        setStatus("loadModel");
        worker.postMessage({ audio, model: MODEL, language: LANG_NAMES[langCode] || null}, [audio.buffer]);
    });
}

$("file").addEventListener("change", e => pick(e.target.files[0]));

["dragenter", "dragover"].forEach(ev => $("drop").addEventListener(ev, e => {
    e.preventDefault();
    $("drop").classList.add("over");
}));
["dragleave", "drop"].forEach(ev => $("drop").addEventListener(ev, e => {
    e.preventDefault();
    $("drop").classList.remove("over");
}));
$("drop").addEventListener("drop", e => pick(e.dataTransfer.files[0]));

$("go").addEventListener("click", async () => {
    if (!file) return;
    const langCode = $("lang").value;
    $("go").disabled = true;
    $("result").style.display = "none";
    $("bar").classList.add("on");
    setStatus("decoding");
    try {
        const { audio, duration } = await decodeAudio(file);
        const out = await runWhisper(audio, langCode);
        const text = (out.text || "").trim();
        segments = out.chunks.map(c => ({
            start: c.timestamp[0] ?? 0,
            end: c.timestamp[1] ?? duration,   // the last chunk can have no end time
            text: c.text.trim()
        }));
        $("text").value = text;
        lastMeta = { lang: langCode, duration };
        renderMeta();
        $("result").style.display = "block";
        setStatus(text ? "" : "nospeech");
    } catch (e) {
        setStatus(e.message, true);
    }
    $("bar").classList.remove("on");
    $("go").disabled = false;
});

function save(name, content, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
}

const ts = s => {
    const p = (n, w = 2) => String(Math.floor(n)).padStart(w, "0");
    return `${p(s / 3600)}:${p((s % 3600) / 60)}:${p(s % 60)},${p((s % 1) * 1000, 3)}`;
};

$("copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("text").value);
    setStatus("copied");
});
$("dlTxt").addEventListener("click", () => save(baseName + ".txt", $("text").value, "text/plain"));
$("dlSrt").addEventListener("click", () =>
    save(baseName + ".srt", segments.map((s, i) => `${i + 1}\n${ts(s.start)} --> ${ts(s.end)}\n${s.text}\n`).join("\n"), "text/plain"));

$("langToggle").addEventListener("click", () => {
    cur = cur === "en" ? "es" : "en";
    try { localStorage.setItem("ui-lang", cur); } catch (e) {}
    applyLang();
});

applyLang();