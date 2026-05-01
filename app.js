const GYMBUDDY_PROMPT = `You are GymBuddy Pro — an elite AI fitness coach, posture analyst,
biomechanics evaluator, and exercise form specialist.

You are analyzing a workout video using extracted frames from a gym session.

Your job is to act like a professional strength coach, personal trainer,
posture correction expert, and movement analyst.

You must think like:
- an expert gym trainer
- a biomechanics specialist
- a rehabilitation posture coach
- a movement correction expert
- a professional strength and conditioning coach

You must prioritize:
accuracy > detail > practical correction > safety

Do NOT give generic advice.
Do NOT give vague answers.
Do NOT guess randomly.
Only infer based on visible movement patterns across all frames.

PRIMARY TASKS
1. Exercise identification
2. Rep counting
3. Movement phase analysis
4. Advanced posture analysis
5. Joint angle estimation
6. Left vs right symmetry analysis
7. Range of motion analysis
8. Tempo & control analysis
10. Performance level classification
11. Safety & injury risk analysis
12. Form score
13. Coaching corrections

OUTPUT FORMAT
Exercise: <name> (Confidence: <0–100>%) | Equipment: <type>
Reps Counted: <number> (<motion pattern note>)
Performance Level: <Beginner / Intermediate / Advanced>
Movement Phases:
Posture Summary:
Joint Angle Estimates:
Left vs. Right Balance:
Tempo & Control:
Form Score: <1–10>
Safety Risks:
Major Issues:
Corrections (priority order):
Coach Feedback:`;

const input = document.querySelector("#video-input");
const analyzeButton = document.querySelector("#analyze-btn");
const preview = document.querySelector("#video-preview");
const previewEmpty = document.querySelector("#preview-empty");
const cameraAngle = document.querySelector("#camera-angle");
const trainingGoal = document.querySelector("#training-goal");
const loadDemoButton = document.querySelector("#load-demo");
const promptDisplay = document.querySelector("#prompt-display");
const statusStrip = document.querySelector("#status-strip");
const heroExercise = document.querySelector("#hero-exercise");
const heroConfidence = document.querySelector("#hero-confidence");
const videoMeta = document.querySelector("#video-meta");
const frameGrid = document.querySelector("#frame-grid");
const sampleReportButton = document.querySelector("#sample-report-btn");
const outputPanel = document.querySelector(".output-panel");
const BACKEND_URL =
  window.location.protocol === "file:"
    ? "http://127.0.0.1:8000/api/analyze"
    : new URL("/api/analyze", window.location.origin).toString();

const reportSummary = document.querySelector("#report-summary");
const movementPhases = document.querySelector("#movement-phases");
const postureSummary = document.querySelector("#posture-summary");
const angleTable = document.querySelector("#angle-table");
const balanceList = document.querySelector("#balance-list");
const tempoList = document.querySelector("#tempo-list");
const formScore = document.querySelector("#form-score");
const formScoreNote = document.querySelector("#form-score-note");
const riskList = document.querySelector("#risk-list");
const issuesList = document.querySelector("#issues-list");
const correctionsList = document.querySelector("#corrections-list");
const coachFeedback = document.querySelector("#coach-feedback");

promptDisplay.textContent = GYMBUDDY_PROMPT;

const scenarios = [
  {
    name: "Barbell Squat",
    confidence: 92,
    equipment: "Barbell",
    reps: 6,
    motionPattern: "controlled descent with slightly rushed ascent on final reps",
    level: "Intermediate",
    phases: [
      "Setup / starting position: stance is shoulder-width with a stable rack position, but brace timing is slightly delayed before descent.",
      "Eccentric phase: descent is mostly smooth, though the torso drifts forward more after rep 4.",
      "Bottom / end-range position: depth reaches around parallel, but left knee starts to drift inward at peak flexion.",
      "Concentric phase: bar path stays mostly vertical, yet the hips rise a touch faster than the chest on harder reps.",
      "Lockout / top position: lockout is complete, but the finish is rushed instead of fully reset.",
      "Reset between reps: breathing and bracing become less consistent late in the set."
    ],
    posture: [
      "Spine stays close to neutral early, then shows mild lumbar softening on the last two reps.",
      "Neck position is slightly extended instead of fully neutral, suggesting the lifter is looking too far up.",
      "Shoulders remain fairly stable under the bar, but scapular tension drops as fatigue builds.",
      "Knees track reasonably well overall, though the left side shows mild valgus near the hole.",
      "Core bracing is present but could be stronger before the eccentric phase starts."
    ],
    angles: [
      ["Knee flexion", "~101°", "~174°", "Yes", "No, ~7° difference"],
      ["Hip flexion", "~94°", "~176°", "Yes", "Yes"],
      ["Torso lean", "~23°", "~7°", "Borderline", "Yes"],
      ["Ankle dorsiflexion", "~18°", "~5°", "Borderline", "No, ~6° difference"]
    ],
    balance: [
      "Left knee collapses slightly earlier than the right when load tolerance drops.",
      "Both hips rise together at first, but the right side looks more dominant in the final ascent.",
      "No major arm asymmetry is visible because the bar position remains even across the upper back."
    ],
    frames: [
      ["Setup frame", "Brace looks slightly delayed before the descent starts."],
      ["Bottom frame", "Left knee drifts inward at peak depth and needs earlier tracking control."],
      ["Late rep frame", "Chest drops behind the hips, showing fatigue-related position loss."]
    ],
    tempo: [
      "Descent is controlled for the first half of the set, then becomes faster under fatigue.",
      "There is no hard bounce, but the bottom position transitions too quickly to confirm full control.",
      "Fast final descents suggest the load may be near the edge of stable technique."
    ],
    score: "7.8",
    scoreNote: "Solid overall mechanics with usable depth, but bracing consistency and left knee tracking pull it below advanced quality.",
    risks: [
      "Lower back strain risk rises when lumbar stiffness fades during the final two reps.",
      "Knee overload risk is moderate because mild valgus appears around ~101° knee flexion on the left side.",
      "Ankle mobility limits may be contributing to forward drift and altered pressure distribution."
    ],
    issues: [
      "Brace timing is late before descent.",
      "Left knee tracks inward near the bottom.",
      "Chest drops slightly behind hip drive on difficult reps."
    ],
    corrections: [
      "Brace before you unlock the knees. Create trunk pressure first so the spine stays firmer through the eccentric.",
      "Drive both knees out earlier. Your left knee loses position near ~101° flexion, so think about spreading the floor before the bottom.",
      "Keep the chest rising with the hips. Do not let the hips shoot up out of the hole.",
      "Slow the last third of the descent so the bottom position stays owned instead of rushed."
    ],
    feedback:
      "You’ve got a solid base here and the rep pattern is mostly repeatable. The biggest upgrade is controlling that left knee and locking the brace in earlier, especially once you pass roughly 100° of knee flexion at the bottom."
  },
  {
    name: "Conventional Deadlift",
    confidence: 88,
    equipment: "Barbell",
    reps: 5,
    motionPattern: "full reps with a strong initial pull and slightly soft lockout late",
    level: "Intermediate",
    phases: [
      "Setup / starting position: hips are positioned well, but the bar starts a little far from the shin line.",
      "Eccentric phase: the descent is controlled until mid-shin, then the bar drifts forward.",
      "Bottom / end-range position: reset is decent, but spinal tension falls off briefly between reps.",
      "Concentric phase: first pull is clean, though the bar path gets less efficient after rep 3.",
      "Lockout / top position: top position is reached, but glute finish is not fully crisp on later reps.",
      "Reset between reps: touch-and-go rhythm reduces setup quality."
    ],
    posture: [
      "Spine is mostly neutral, but thoracic rounding increases slightly with fatigue.",
      "Shoulders sit a bit in front of the bar at setup, creating extra forward pull.",
      "Neck stays neutral and calm, which is a strength.",
      "Hips remain level without major side-to-side shift.",
      "Core tension is visible early but inconsistent on quick resets."
    ],
    angles: [
      ["Hip flexion", "~51°", "~176°", "Yes", "Yes"],
      ["Knee flexion", "~109°", "~175°", "Yes", "Yes"],
      ["Spine angle", "~6° flexion", "~2° flexion", "No", "Yes"],
      ["Torso lean", "~34°", "~5°", "Borderline", "Yes"]
    ],
    balance: [
      "Left and right hip extension appear matched.",
      "No obvious arm asymmetry or staggered lockout is visible.",
      "Minor forward weight drift looks bilateral rather than one-sided."
    ],
    frames: [
      ["Setup frame", "Bar starts a little away from the shin line, reducing leverage."],
      ["Mid-pull frame", "Thoracic position softens as the bar drifts forward."],
      ["Lockout frame", "Finish is complete but glute-driven lockout is not fully sharp."]
    ],
    tempo: [
      "Pull speed is strong and decisive.",
      "The reset is too quick between reps, which slightly degrades setup precision.",
      "Touch-and-go rhythm adds momentum that masks small positioning errors."
    ],
    score: "7.4",
    scoreNote: "The pull is competent and symmetrical, but bar drift and softened spinal position prevent this from being a clean high-score set.",
    risks: [
      "Lower back strain risk increases when spinal tension drops and the bar drifts forward from the body.",
      "Grip and upper-back fatigue could amplify thoracic rounding if load increases.",
      "Soft lockout can shift finishing stress away from the glutes and into the lumbar region."
    ],
    issues: [
      "Bar starts slightly too far from the shins.",
      "Reset quality drops with touch-and-go timing.",
      "Spinal stiffness fades mid-set."
    ],
    corrections: [
      "Pull the bar closer to the shins before the rep starts so the line of force stays cleaner.",
      "Pause and rebuild tension between reps instead of relying on touch-and-go momentum.",
      "Lock the lats harder so the chest and bar rise together from the floor.",
      "Finish with glutes through the bar rather than leaning back into lockout."
    ],
    feedback:
      "This is a capable pull, especially from the floor, but you’ll get safer and stronger if the bar starts closer and the spinal position stays tighter. Clean up the reset and the whole set will look more powerful with less energy leak."
  },
  {
    name: "Dumbbell Shoulder Press",
    confidence: 84,
    equipment: "Dumbbell",
    reps: 8,
    motionPattern: "complete reps with moderate control and a small right-side lockout lead",
    level: "Beginner",
    phases: [
      "Setup / starting position: seated base is stable, though the ribcage is slightly flared before the first press.",
      "Eccentric phase: lowering is steady but the elbows drift wider as fatigue builds.",
      "Bottom / end-range position: depth is acceptable, but the dumbbells stop a little high on the final reps.",
      "Concentric phase: the right arm initiates fractionally sooner than the left.",
      "Lockout / top position: top position is reached with slight shoulder shrugging.",
      "Reset between reps: pace is consistent, but the brace is not fully re-established."
    ],
    posture: [
      "Neck stays neutral, but upper traps take over near lockout.",
      "Shoulders elevate slightly, reducing clean scapular upward rotation mechanics.",
      "Elbows flare wider than ideal on harder reps.",
      "Core control is moderate, with small rib flare suggesting compensation.",
      "Left-right balance is close, though the right side finishes first."
    ],
    angles: [
      ["Elbow flexion", "~88°", "~171°", "Yes", "No, ~6° difference"],
      ["Shoulder angle", "~92°", "~176°", "Borderline", "Yes"],
      ["Spine angle", "~8° extension", "~10° extension", "No", "Yes"],
      ["Wrist stacking", "~12° extension", "~4° extension", "Borderline", "No, ~5° difference"]
    ],
    balance: [
      "Right arm locks out slightly sooner than the left.",
      "Both dumbbells travel similarly, but the left side loses speed first.",
      "Shoulder elevation appears symmetric rather than one-sided."
    ],
    frames: [
      ["Start frame", "Ribcage is slightly flared before the first press."],
      ["Press frame", "Right side initiates slightly earlier than the left."],
      ["Top frame", "Shoulders shrug at lockout instead of staying cleaner overhead."]
    ],
    tempo: [
      "Tempo is moderate and repeatable.",
      "Control is better on the eccentric than at the top, where shrugging increases.",
      "The last reps use more momentum than strict pressing mechanics."
    ],
    score: "6.9",
    scoreNote: "The set is usable and mostly safe, but shoulder shrugging, rib flare, and right-side dominance limit efficiency and joint quality.",
    risks: [
      "Shoulder impingement risk increases as elbow flare pushes the shoulder angle beyond the clean pressing slot.",
      "Neck and upper trap overuse may develop from shrug-dominant lockouts.",
      "Lumbar extension compensation can become a low-back issue if the load gets heavier."
    ],
    issues: [
      "Shoulders shrug at lockout.",
      "Rib flare replaces strong trunk bracing.",
      "Right arm finishes ahead of the left."
    ],
    corrections: [
      "Keep the ribs down before the press starts so the shoulders can move on a stable trunk.",
      "Press up without shrugging. Reach tall, but do not let the traps take over at lockout.",
      "Tuck the elbows slightly so the shoulder angle stays in a cleaner overhead path.",
      "Match arm timing by driving both dumbbells off the shoulder line together."
    ],
    feedback:
      "You’re getting the reps done, but the press will feel much stronger once your trunk stays quieter and the shoulders stop shrugging into the top. The right arm is leading a bit, so make the left side match the same line and timing."
  }
];

let activeObjectUrl = null;
let currentVideoName = "";

function formatSeconds(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function setStatus(text, isBusy = false) {
  statusStrip.textContent = text;
  statusStrip.classList.toggle("is-busy", isBusy);
}

function fillList(target, items) {
  target.innerHTML = "";
  items.forEach((item) => {
    if (!item || item === "##") {
      return;
    }
    const li = document.createElement("li");
    li.textContent = item;
    target.appendChild(li);
  });
}

function displayConfidence(value) {
  if (!value || value === "--") {
    return "--";
  }
  return value.includes("%") ? value : `${value}%`;
}

function fillAngles(rows) {
  angleTable.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    angleTable.appendChild(tr);
  });
}

function fillFrames(items) {
  frameGrid.innerHTML = "";
  items.forEach((item) => {
    const [title, note, image] = item;
    const card = document.createElement("article");
    card.className = "frame-item";
    const heading = document.createElement("strong");
    heading.textContent = title;
    const detail = document.createElement("span");
    detail.textContent = note;
    card.appendChild(heading);
    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = title;
      img.className = "frame-preview";
      card.appendChild(img);
    }
    card.appendChild(detail);
    frameGrid.appendChild(card);
  });
}

function renderReport(report, sourceLabel) {
  outputPanel.classList.add("is-refreshing");
  reportSummary.textContent =
    `${report.name} | ${report.equipment}\n` +
    `Confidence: ${displayConfidence(report.confidence)}\n` +
    `Reps: ${report.reps}\n` +
    `Level: ${report.level}\n` +
    `Pattern: ${report.motionPattern}`;

  fillList(movementPhases, report.phases);
  fillList(postureSummary, report.posture);
  fillFrames(report.frames);
  fillAngles(report.angles);
  fillList(balanceList, report.balance);
  fillList(tempoList, report.tempo);
  fillList(riskList, report.risks);
  fillList(issuesList, report.issues);
  fillList(correctionsList, report.corrections);

  formScore.textContent = report.score;
  formScoreNote.textContent = report.scoreNote;
  coachFeedback.textContent = report.feedback;
  setStatus(sourceLabel, false);
  heroExercise.textContent = report.name;
  heroConfidence.textContent = displayConfidence(report.confidence);
  window.setTimeout(() => {
    outputPanel.classList.remove("is-refreshing");
  }, 220);
}

function cleanLine(value) {
  return value
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/, "")
    .replace(/^[\s\-•\d.)]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeReportText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*#+\s*$/gm, "")
    .replace(/^\s*[-•]\s*#+\s*$/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

function sectionLines(text, startLabel, endLabels) {
  const start = text.toLowerCase().indexOf(startLabel.toLowerCase());
  if (start === -1) {
    return [];
  }

  const sectionText = text.slice(start + startLabel.length);
  let endIndex = sectionText.length;
  endLabels.forEach((label) => {
    const idx = sectionText.toLowerCase().indexOf(label.toLowerCase());
    if (idx !== -1 && idx < endIndex) {
      endIndex = idx;
    }
  });

  return sectionText
    .slice(0, endIndex)
    .split("\n")
    .map((line) => cleanLine(line))
    .filter((line) => line && line !== "##");
}

function parseAngleRows(text) {
  const rows = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("│") || line.includes("|"))
    .filter((line) => !/joint|bottom|lockout|difference/i.test(line))
    .map((line) => {
      const divider = line.includes("│") ? "│" : "|";
      return line
        .split(divider)
        .map((part) => part.trim())
        .filter(Boolean);
    })
    .filter((parts) => parts.length >= 5)
    .map((parts) => parts.slice(0, 5));

  return rows;
}

function firstMatch(text, patterns, fallback = "") {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match;
    }
  }
  return fallback;
}

function compactSentence(text) {
  return text
    .replace(/^AI-generated movement summary$/i, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseReportText(reportText, previewFrames = []) {
  const normalizedText = normalizeReportText(reportText);
  const lines = normalizedText
    .split("\n")
    .map((line) => cleanLine(line))
    .filter(Boolean);
  const exerciseLine = lines.find((line) => /^exercise:/i.test(line)) || "Exercise: Unknown (Confidence: --%) | Equipment: Unknown";
  const repsLine = lines.find((line) => /^reps counted:/i.test(line)) || "Reps Counted: --";
  const levelLine = lines.find((line) => /^performance level:/i.test(line)) || "Performance Level: --";
  const formScoreLine = lines.find((line) => /^form score:/i.test(line)) || "Form Score: --";

  const exerciseMatch = firstMatch(exerciseLine, [
    /^Exercise:\s*(.*?)\s*\(Confidence:\s*([^)]+)\)\s*\|\s*Equipment:\s*(.*)$/i,
    /^Exercise:\s*(.*?)\s*\(Confidence:\s*([^)]+)\)$/i,
    /^Exercise:\s*(.*?)\s*\|\s*Equipment:\s*(.*)$/i
  ]);
  const repsMatch = firstMatch(repsLine, [
    /^Reps Counted:\s*(\d+)\s*\((.*)\)$/i,
    /^Reps Counted:\s*(\d+)$/i,
    /^Reps Counted:\s*(.*)$/i
  ]);
  const levelMatch = firstMatch(levelLine, [/^Performance Level:\s*(.*)$/i]);
  const scoreMatch = firstMatch(formScoreLine, [
    /^Form Score:\s*([^—-]+)\s*[—-]\s*(.*)$/i,
    /^Form Score:\s*(\d+(?:\/10)?)/i,
    /^Form Score:\s*(.*)$/i
  ]);

  const movement = sectionLines(normalizedText, "Movement Phases:", ["Posture Summary:"]);
  const posture = sectionLines(normalizedText, "Posture Summary:", ["Joint Angle Estimates:"]);
  const balance = sectionLines(normalizedText, "Left vs. Right Balance:", ["Tempo & Control:"]);
  const tempo = sectionLines(normalizedText, "Tempo & Control:", ["Form Score:"]);
  const risks = sectionLines(normalizedText, "Safety Risks:", ["Major Issues:"]);
  const issues = sectionLines(normalizedText, "Major Issues:", ["Corrections (priority order):"]);
  const corrections = sectionLines(normalizedText, "Corrections (priority order):", ["Coach Feedback:"]);
  const feedback = sectionLines(normalizedText, "Coach Feedback:", []).join(" ");
  const angleRows = parseAngleRows(sectionLines(normalizedText, "Joint Angle Estimates:", ["Left vs. Right Balance:"]).join("\n"));

  const frameCards = previewFrames.map((image, index) => {
    const title = ["Sample frame", "Key frame", "Later frame"][index] || `Frame ${index + 1}`;
    const note = movement[index] || posture[index] || "Review this sampled frame with the coach feedback below.";
    return [title, note, image];
  });

  const repsValue = Array.isArray(repsMatch) ? "--" : repsMatch?.[1] || "--";
  const motionPattern =
    (repsMatch?.[2] || (repsMatch?.[1] && !/^\d+$/.test(repsMatch[1]) ? repsMatch[1] : "") || tempo[0] || movement[0] || "")
      .replace(/^Reps Counted:\s*/i, "")
      .trim();

  const scoreValue = scoreMatch?.[1]?.trim() || "--";
  const scoreNote =
    (scoreMatch?.[2] || risks[0] || issues[0] || "Coach report returned successfully.")
      .replace(/^—\s*/, "")
      .trim();

  return {
    name: exerciseMatch?.[1] || "Unknown",
    confidence: (exerciseMatch?.[2] || "--").replace(/[^0-9.%]/g, "") || "--",
    equipment: exerciseMatch?.[3] || "Unknown",
    reps: /^\d+$/.test(repsValue) ? repsValue : "--",
    motionPattern: compactSentence(motionPattern) || "Movement analyzed across the uploaded clip",
    level: levelMatch?.[1] || "--",
    phases: movement.length ? movement : ["No movement phase details parsed from the model response."],
    posture: posture.length ? posture : ["No posture summary details parsed from the model response."],
    angles: angleRows.length ? angleRows : [["Unavailable", "--", "--", "--", "--"]],
    balance: balance.length ? balance : ["No balance details parsed from the model response."],
    frames: frameCards.length ? frameCards : [["Sample frame", "No preview frames were returned by the backend."]],
    tempo: tempo.length ? tempo : ["No tempo details parsed from the model response."],
    score: scoreValue.replace(/[^\d./]/g, "") || "--",
    scoreNote,
    risks: risks.length ? risks : ["No safety risks parsed from the model response."],
    issues: issues.length ? issues : ["No major issues parsed from the model response."],
    corrections: corrections.length ? corrections : ["No corrections parsed from the model response."],
    feedback: feedback || "No coach feedback parsed from the model response."
  };
}

function pickScenario() {
  if (!currentVideoName) {
    return scenarios[0];
  }

  const key = currentVideoName.toLowerCase();
  if (key.includes("deadlift") || key.includes("pull")) {
    return scenarios[1];
  }
  if (key.includes("press") || key.includes("shoulder")) {
    return scenarios[2];
  }
  if (cameraAngle.value === "front" && trainingGoal.value === "rehab") {
    return scenarios[2];
  }
  if (cameraAngle.value === "side" && trainingGoal.value === "summary") {
    return scenarios[1];
  }
  return scenarios[0];
}

function setVideo(file) {
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
  }
  activeObjectUrl = URL.createObjectURL(file);
  currentVideoName = file.name;
  preview.src = activeObjectUrl;
  preview.style.display = "block";
  previewEmpty.style.display = "none";
  setStatus(`Video loaded: ${file.name}`, false);
  videoMeta.innerHTML = `
    <span>${file.name}</span>
    <span>Duration: reading...</span>
    <span>Resolution: reading...</span>
  `;
  preview.onloadedmetadata = () => {
    videoMeta.innerHTML = `
      <span>${file.name}</span>
      <span>Duration: ${formatSeconds(preview.duration)}</span>
      <span>Resolution: ${preview.videoWidth || "--"} × ${preview.videoHeight || "--"}</span>
    `;
  };
}

function handleVideoDrop(event) {
  event.preventDefault();
  const [file] = event.dataTransfer.files;
  if (file && file.type.startsWith("video/")) {
    setVideo(file);
  }
}

input.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }
  setVideo(file);
});

["dragenter", "dragover"].forEach((eventName) => {
  document.addEventListener(eventName, (event) => {
    event.preventDefault();
  });
});

document
  .querySelector(".upload-dropzone")
  .addEventListener("drop", handleVideoDrop);

analyzeButton.addEventListener("click", () => {
  const file = input.files?.[0];
  if (!file) {
    setStatus("Choose a video before generating analysis.", false);
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  setStatus("Uploading video, extracting frames, and generating the coach report...", true);

  fetch(BACKEND_URL, {
    method: "POST",
    body: formData
  })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.detail || "Analysis failed.");
      }

      const parsed = parseReportText(data.report_text, data.preview_frames || []);
      renderReport(
        parsed,
        `Analysis ready for ${data.filename} | Frames extracted: ${data.frames_extracted} | Frames sent: ${data.frames_sent}`
      );
    })
    .catch((error) => {
      console.error(error);
      setStatus(
        "Backend unavailable or analysis failed. Start the Python server and make sure ANTHROPIC_API_KEY is set.",
        false
      );
    });
});

function loadSampleReport() {
  renderReport(
    scenarios[0],
    "Demo report loaded | Premium UI preview using the GymBuddy Pro prompt structure"
  );
}

function goToPastReports() {
  document.querySelector("#past-reports").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

loadDemoButton.addEventListener("click", (event) => {
  event.preventDefault();
  loadSampleReport();
  goToPastReports();
});

sampleReportButton.addEventListener("click", (event) => {
  event.preventDefault();
  loadSampleReport();
  goToPastReports();
});

renderReport(
  scenarios[0],
  "Demo report loaded | Upload a video and press Analyze Movement to refresh the report"
);
