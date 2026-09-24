const $ = id => document.getElementById(id)

const I18N ={
    en:{
        title: "Audio to text", h1: "Audio to text",
        lede: "Drop in a recording and get the words back",
        choose: "Choose an audio file",
        hint: "or drag it here",
        lang: "Language",
        auto: "Detect automatically",
        l_es: "Spanish",
        l_eng: "English",
        go: "Transcribe",
        copy: "Copy text",
        dlTxt:"Download .txt",
        dlStr: "Download .str",
        tx: "Transcript", busy:"Transcribing...",
        nospeech:"No speech found in this audio",
        copied: "Copied.",
        error: "Something went wrong...",
        meta: (l,d) => `Language: ${l} - Length: ${d} s`, 
        toggle: "Español",
        toggleLang: "es"
    },
    es:{
        title: "Audio a texto", 
        h1: "Audio a texto",
        lede: "Subi un audio y obtene el texto",
        choose: "Subi un audio",
        hint: "o arrastralo aca",
        l_es: "Español",
        l_en: "Inglés",
        go: "Transcribir",
        copy:"Copiar texto",
        dlTxt: "Descargar .txt",
        dlStr: "Descargar .str",
        tx: "Trasncripción",
        busy: "Transcribiendo...",
        nospeech: "No se encontro voz en el audio",
        copied:"Copiado.",
        error: "Algo salio mal...",
        meta: (l, d) => `Idioma: ${l} - Duracion: ${d} s`,
        toggle: "English", 
        toggleLang: "en"
,    }
}

let cur = "en"
try {cur = localStorage.getItem("ui-lang") || ((navigator.language || "").slice(0, 2) === "es" ? "es" : "en")}
catch (e){}
if(!I18N[cur]) cur = "en"
const t = k => I18N[cur][k]
let letStatus = {msg: "", err: false}, lastMeta =null

function applyLang() {
    document.documentElement.lang = cur; document.title = t("title")
    document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n))
    document.querySelectorAll("[data-i18n-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria)))
    const tg = $('langToggle')
    tg.textContent = t("toggle")
    tg.lang = t("toggleLang")
    if(!file) 
        $("dropTitle").textContent = t("choose")
    setStatus(lastStatus.msg, lastStatus.err)
    renderMeta()
}
function renderMeta() { if (lastMeta) $("meta").textContent = t("meta")(lastMeta.language, Math.round(lastMeta.duration))}
var file = null, segments = [], baseName = "transcript"

function pick(f){
    if(!f) return
    file= f
    baseName = f.name.replace(/\.[^.]+$/, "")
    $("dropTitle").textContent =f.name
    $("go").disabled = false
    setStatus("")
}

function setStatus(msg, err) { lastStatus = { msg, err }; $("status").textContent = I18N[cur][msg] ?? msg; $("status").className = "status" + (err ? " err" : "")}

$("file").addEventListener("change", e => pick(e.target.files[0]))
["dragenter", "dragover"].forEach(ev => $("drop").addEventListener(ev, e=> {e.preventDefault()
    $("drop").classList.add("over")
}))
["dragleave", "drop"].forEach(ev =>$("drop").addEventListener(ev, e=> {e.preventDefault()
    $("drop").classList.remove("over")
}))
$("drop").addEventListener("drop", e => pick(e.dataTransfer.files[0]))

$("go").addEventListener("click", async () => {
  if (!file) return
  const body = new FormData()
  body.append("file", file)
  body.append("language", $("lang").value)
  $("go").disabled = true
  $("result").style.display = "none"
  $("bar").classList.add("on")
  setStatus("busy")
  try {
    const res = await fetch("/api/transcribe", { method: "POST", body })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || t("error"))
    segments = data.segments
    $("text").value = data.text || ""
    lastMeta = data 
    renderMeta()
    $("result").style.display = "block"
    setStatus(data.text ? "" : "nospeech")
  } catch (e) { setStatus(e.message, true) }
  $("bar").classList.remove("on"); $("go").disabled = false
})

function save(name, content, type){
    const a = document.createElement("a")

}