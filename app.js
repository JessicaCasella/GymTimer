// =============================
// GYMTIMER - MOTOR PRINCIPAL
// =============================

// Lista de timers activos
let timers = []

// Valor inicial del timer personalizado
let customMinutes = 5



// =============================
// SONIDO
// =============================

function playSound(){
  const beep = new Audio("sounds/beep.mp3")
  beep.play()
}



// =============================
// VOZ (TEXT TO SPEECH)
// =============================

function speak(text){

  // cancela cualquier voz anterior
  speechSynthesis.cancel()

  const msg = new SpeechSynthesisUtterance(text)
  msg.lang = "es-ES"
  msg.rate = 1
  msg.pitch = 1

  speechSynthesis.speak(msg)
}



// =============================
// CREAR TIMER NORMAL
// =============================

function createTimer(seconds, type, label){

  let timer = {
    id: Date.now(),

    duration: seconds,
    remaining: seconds,

    type: type,
    label: label,

    running: true,
    finished: false,

    mode: "normal"
  }

  timers.push(timer)
  renderTimers()
}



// =============================
// FORMATO DE TIEMPO
// =============================

function formatTime(sec){

  let m = Math.floor(sec/60)
  let s = sec % 60

  return `${m}:${s.toString().padStart(2,"0")}`
}



// =============================
// RENDER DE TIMERS EN PANTALLA
// =============================

function renderTimers(){

  let container = document.getElementById("timers")
  container.innerHTML = ""

  timers.forEach(timer => {

    let div = document.createElement("div")

    div.className = `timer ${timer.type} 
    ${timer.finished ? "finished" : ""} 
    ${timer.remaining <= 5 && timer.remaining > 0 ? "warning" : ""}`

    div.innerHTML = `

      <div class="timer-label">${timer.label}</div>

      <div class="timer-time">
        ${
          timer.mode === "circuit"
          ? formatTime(timer.phaseRemaining)
          : formatTime(timer.remaining)
        }
      </div>

      ${
        timer.rounds
        ? `<div class="rounds">SERIE ${timer.currentRound} / ${timer.rounds}</div>`
        : ""
      }

      <div class="timer-close" onclick="deleteTimer(${timer.id})">✕</div>
      <div class="timer-buttons">
        <button onclick="toggleTimer(${timer.id})">PAUSA</button>
        <button onclick="resetTimer(${timer.id})">RESET</button>
      </div>

    `

    container.appendChild(div)

  })

}



// =============================
// CONTROLES DE TIMER
// =============================

function toggleTimer(id){

  let timer = timers.find(t => t.id === id)
  timer.running = !timer.running

}

function resetTimer(id){

  let timer = timers.find(t => t.id === id)
  timer.remaining = timer.duration

}

function deleteTimer(id){

  timers = timers.filter(t => t.id !== id)
  renderTimers()

}



// =============================
// MOTOR DE TIMERS (CADA SEGUNDO)
// =============================

setInterval(()=>{

  timers.forEach(timer => {

    if(timer.running && !timer.finished){

      // TIMER DE CIRCUITO
      if(timer.mode === "circuit"){

        handleCircuitTimer(timer)

      }

      // OTROS TIMERS
      else{

        if(timer.remaining > 0){

          timer.remaining--

          // PLANCHAS
          if(timer.rounds){
            handlePlankTimer(timer)
          }

          // TIMER NORMAL
          else if(timer.remaining === 0){

            timer.finished = true
            playSound()

          }

        }

      }

    }

  })

  renderTimers()

},1000)



// =============================
// TIMERS PERSONALIZADOS
// =============================

function createCustomTimer(minutes){

  let seconds = minutes * 60
  createTimer(seconds, "circuit", minutes + " MIN")

}

function createSecondsTimer(seconds){

  createTimer(seconds, "exercise", seconds + " SEG")

}

function openCustomTimer(){

  let panel = document.getElementById("customPanel")
  panel.classList.toggle("hidden")

}

function changeMinutes(value){

  customMinutes += value

  if(customMinutes < 1) customMinutes = 1
  if(customMinutes > 60) customMinutes = 60

  document.getElementById("customMinutes").innerText = customMinutes

}

function createSelectedTimer(){

  createTimer(customMinutes * 60, "circuit", customMinutes + " MIN")

}



// =============================
// WORKOUT DE PLANCHAS
// =============================

function createPlankWorkout(rounds){

  let timer = {

    id: Date.now(),

    duration: 60,
    remaining: 60,

    type: "exercise",
    label: "PLANCHA",

    running: true,
    finished: false,

    mode: "plank",

    rounds: rounds,
    currentRound: 1,
    phase: "plank"

  }

  timers.push(timer)
  renderTimers()

}



function handlePlankTimer(timer){

  // voz últimos segundos
  if(timer.remaining <= 3 && timer.remaining > 0){
    speak(timer.remaining.toString())
  }

  if(timer.remaining === 0){

    // PASAR A DESCANSO
    if(timer.phase === "plank"){

      playSound()
      speak("Descanso")

      timer.phase = "rest"
      timer.label = "DESCANSO"
      timer.type = "rest"
      timer.remaining = 60

    }

    // VOLVER A PLANCHA
    else{

      timer.currentRound++

      if(timer.currentRound > timer.rounds){

        timer.finished = true
        playSound()
        speak("Terminado")
        return

      }

      playSound()
      speak("Plancha")

      timer.phase = "plank"
      timer.label = "PLANCHA"
      timer.type = "exercise"
      timer.remaining = 60

    }

  }

}



// =============================
// CIRCUITO DE GYM
// =============================

function createGymCircuit(){

  let timer = {

    id: Date.now(),

    mode: "circuit",

    // 15 minutos de ejercicio
    duration: 900,
    exerciseRemaining: 900,

    running: true,
    finished: false,

    // inicio con caminadora
    phase: "warmup",
    phaseRemaining: 180,

    label: "CAMINADORA",
    type: "exercise",

    exercises: [
      {name:"BICI", time:60},
      {name:"MAQUINA", time:60}
    ],

    changeTime: 5,
    currentExercise: 0

  }

  timers.push(timer)
  renderTimers()

}



function handleCircuitTimer(timer){

  timer.phaseRemaining--

  // descontar solo ejercicio
  if(timer.phase === "exercise" || timer.phase === "warmup"){
    timer.exerciseRemaining--
  }

  if(timer.phaseRemaining <= 3 && timer.phaseRemaining > 0){
    speak(timer.phaseRemaining.toString())
  }

  // terminar circuito
  if(timer.exerciseRemaining <= 0){

    timer.finished = true
    playSound()
    speak("Circuito terminado")
    return

  }

  // cambio de fase
  if(timer.phaseRemaining === 0){

    playSound()

    // fin warmup
    if(timer.phase === "warmup"){

      timer.phase = "change"
      timer.label = "CAMBIO"
      timer.type = "rest"
      timer.phaseRemaining = timer.changeTime

    }

    // volver a ejercicio
    else if(timer.phase === "change"){

      timer.phase = "exercise"

      let ex = timer.exercises[timer.currentExercise]

      timer.label = ex.name
      timer.type = "exercise"
      timer.phaseRemaining = ex.time

    }

    // terminar ejercicio
    else{

      timer.phase = "change"

      timer.label = "CAMBIO"
      timer.type = "rest"
      timer.phaseRemaining = timer.changeTime

      timer.currentExercise++

      if(timer.currentExercise >= timer.exercises.length){
        timer.currentExercise = 0
      }

    }

  }

}