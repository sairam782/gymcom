const liveVideo = document.querySelector("#live-video");
const liveOverlay = document.querySelector("#live-overlay");
const livePreviewEmpty = document.querySelector("#live-preview-empty");
const liveExercise = document.querySelector("#live-exercise");
const liveAngle = document.querySelector("#live-angle");
const liveModel = document.querySelector("#live-model");
const segmentButtons = document.querySelectorAll(".segment-button");
const startLiveButton = document.querySelector("#start-live");
const stopLiveButton = document.querySelector("#stop-live");
const liveStatus = document.querySelector("#live-status");
const liveError = document.querySelector("#live-error");
const liveReps = document.querySelector("#live-reps");
const livePhase = document.querySelector("#live-phase");
const liveScore = document.querySelector("#live-score");
const liveConfidence = document.querySelector("#live-confidence");
const confidenceBar = document.querySelector("#confidence-bar");
const formScoreBar = document.querySelector("#form-score-bar");
const liveCue = document.querySelector("#live-cue");
const leftAngleLabel = document.querySelector("#left-angle-label");
const rightAngleLabel = document.querySelector("#right-angle-label");
const leftAngleEl = document.querySelector("#left-knee-angle");
const rightAngleEl = document.querySelector("#right-knee-angle");
const liveDepth = document.querySelector("#live-depth");
const liveSymmetry = document.querySelector("#live-symmetry");
const liveStable = document.querySelector("#live-stable");
const liveModelBadge = document.querySelector("#live-model-badge");
const liveSummary = document.querySelector("#live-summary");
const liveOverlayBadge = document.querySelector("#live-overlay-badge");
const exerciseCategory = document.querySelector("#exercise-category");
const exerciseEquipment = document.querySelector("#exercise-equipment");
const exerciseJoint = document.querySelector("#exercise-joint");
const exerciseRange = document.querySelector("#exercise-range");
const exerciseView = document.querySelector("#exercise-view");
const exerciseChain = document.querySelector("#exercise-chain");
const generateClaudeReport = document.querySelector("#generate-claude-report");

const ctx = liveOverlay.getContext("2d");

let liveStream = null;
let detector = null;
let animationFrameId = null;
let repCounter = 0;
let repState = "top";
let lastPhase = "Ready";
let smoothedAngle = null;
let stableFrames = 0;
let totalFrames = 0;
let sessionHasData = false;

const WAITING_TEXT = "—";
const DEFAULT_STATUS = "Select an exercise and align your body in frame, then press Start.";
const ACTIVE_CHAIN_COLOR = "#40d3a8";
const BODY_CHAIN_COLOR = "rgba(255, 247, 239, 0.56)";
const JOINT_COLOR = "#f3f0e7";
const ACTIVE_JOINT_COLOR = "#40d3a8";
const SCORE_THRESHOLD = 0.45;
const ANGLE_SMOOTHING = 0.32;
const POSITION_MARGIN = 0.03;
const BLAZEPOSE_SOLUTION_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/pose";

const FACE_KEYWORDS = ["nose", "eye", "ear", "mouth"];

const CHAIN_LABELS = {
  hip: "Hip",
  knee: "Knee",
  ankle: "Ankle",
  shoulder: "Shoulder",
  elbow: "Elbow",
  wrist: "Wrist"
};

function defineExercise({
  category,
  equipment,
  joint,
  top,
  bottom,
  chain,
  label,
  cue,
  bestView
}) {
  return {
    category,
    equipment,
    joint,
    top,
    bottom,
    chain,
    label,
    cue,
    bestView
  };
}

const EXERCISE_PROFILES = {
  "bodyweight-squat": defineExercise({
    category: "Home workout",
    equipment: "Bodyweight",
    joint: "knee",
    top: 165,
    bottom: 90,
    chain: ["hip", "knee", "ankle"],
    label: "Knee angle",
    cue: "Sit deeper while keeping knees stacked over the mid-foot.",
    bestView: "side"
  }),
  "reverse-lunge": defineExercise({
    category: "Home workout",
    equipment: "Bodyweight",
    joint: "knee",
    top: 162,
    bottom: 90,
    chain: ["hip", "knee", "ankle"],
    label: "Knee angle",
    cue: "Drop until the front knee reaches roughly 90 degrees.",
    bestView: "side"
  }),
  "bulgarian-split-squat": defineExercise({
    category: "Home workout",
    equipment: "Bench or chair",
    joint: "knee",
    top: 160,
    bottom: 80,
    chain: ["hip", "knee", "ankle"],
    label: "Knee angle",
    cue: "Control the front knee angle and stay tall through the torso.",
    bestView: "side"
  }),
  "step-up": defineExercise({
    category: "Home workout",
    equipment: "Box or bench",
    joint: "knee",
    top: 162,
    bottom: 90,
    chain: ["hip", "knee", "ankle"],
    label: "Knee angle",
    cue: "Drive through the working leg until the knee fully opens.",
    bestView: "side"
  }),
  "glute-bridge": defineExercise({
    category: "Home workout",
    equipment: "Bodyweight",
    joint: "hip",
    top: 175,
    bottom: 80,
    chain: ["shoulder", "hip", "knee"],
    label: "Hip angle",
    cue: "Finish taller at the hip without flaring the ribs.",
    bestView: "side"
  }),
  "push-up": defineExercise({
    category: "Home workout",
    equipment: "Bodyweight",
    joint: "elbow",
    top: 168,
    bottom: 80,
    chain: ["shoulder", "elbow", "wrist"],
    label: "Elbow angle",
    cue: "Lower farther and keep the elbows under control.",
    bestView: "side"
  }),
  "pike-push-up": defineExercise({
    category: "Home workout",
    equipment: "Bodyweight",
    joint: "shoulder",
    top: 170,
    bottom: 80,
    chain: ["hip", "shoulder", "elbow"],
    label: "Shoulder angle",
    cue: "Drop deeper through the shoulder line before driving back up.",
    bestView: "side"
  }),
  "tricep-dip": defineExercise({
    category: "Home workout",
    equipment: "Chair or bench",
    joint: "elbow",
    top: 160,
    bottom: 85,
    chain: ["shoulder", "elbow", "wrist"],
    label: "Elbow angle",
    cue: "Control the bottom and reach slightly more elbow bend.",
    bestView: "side"
  }),
  "superman-hold": defineExercise({
    category: "Home workout",
    equipment: "Bodyweight",
    joint: "hip",
    top: 175,
    bottom: 140,
    chain: ["shoulder", "hip", "knee"],
    label: "Hip angle",
    cue: "Reach longer through the legs and lift through the hip line.",
    bestView: "side"
  }),
  plank: defineExercise({
    category: "Home workout",
    equipment: "Bodyweight",
    joint: "spine",
    top: 180,
    bottom: 180,
    chain: ["shoulder", "hip", "ankle"],
    label: "Body line",
    cue: "Keep shoulders, hips, and ankles in one long line.",
    bestView: "side"
  }),
  "goblet-squat": defineExercise({
    category: "Gym workout",
    equipment: "Dumbbell or kettlebell",
    joint: "knee",
    top: 165,
    bottom: 88,
    chain: ["hip", "knee", "ankle"],
    label: "Knee angle",
    cue: "Reach parallel depth while keeping the chest proud.",
    bestView: "side"
  }),
  "leg-press": defineExercise({
    category: "Gym workout",
    equipment: "Leg press machine",
    joint: "knee",
    top: 168,
    bottom: 80,
    chain: ["hip", "knee", "ankle"],
    label: "Knee angle",
    cue: "Use a little more depth before pressing back out.",
    bestView: "side"
  }),
  "hip-thrust": defineExercise({
    category: "Gym workout",
    equipment: "Barbell or machine",
    joint: "hip",
    top: 175,
    bottom: 85,
    chain: ["shoulder", "hip", "knee"],
    label: "Hip angle",
    cue: "Drive to full hip extension and keep the ribs down.",
    bestView: "side"
  }),
  "romanian-deadlift": defineExercise({
    category: "Gym workout",
    equipment: "Barbell or dumbbells",
    joint: "hip",
    top: 172,
    bottom: 105,
    chain: ["shoulder", "hip", "knee"],
    label: "Hip angle",
    cue: "Push the hips back farther while keeping the spine long.",
    bestView: "side"
  }),
  deadlift: defineExercise({
    category: "Gym workout",
    equipment: "Barbell",
    joint: "hip",
    top: 175,
    bottom: 95,
    chain: ["shoulder", "hip", "knee"],
    label: "Hip angle",
    cue: "Clean up the hinge and finish tall without leaning back.",
    bestView: "side"
  }),
  "good-morning": defineExercise({
    category: "Gym workout",
    equipment: "Barbell",
    joint: "hip",
    top: 172,
    bottom: 105,
    chain: ["shoulder", "hip", "knee"],
    label: "Hip angle",
    cue: "Hinge deeper through the hips before reversing the motion.",
    bestView: "side"
  }),
  "bench-press": defineExercise({
    category: "Gym workout",
    equipment: "Barbell or dumbbells",
    joint: "elbow",
    top: 168,
    bottom: 80,
    chain: ["shoulder", "elbow", "wrist"],
    label: "Elbow angle",
    cue: "Use more elbow bend at the bottom before pressing up.",
    bestView: "side"
  }),
  "machine-chest-press": defineExercise({
    category: "Gym workout",
    equipment: "Chest press machine",
    joint: "elbow",
    top: 168,
    bottom: 82,
    chain: ["shoulder", "elbow", "wrist"],
    label: "Elbow angle",
    cue: "Allow a little more controlled elbow bend before pressing out.",
    bestView: "side"
  }),
  "overhead-press": defineExercise({
    category: "Gym workout",
    equipment: "Barbell or dumbbells",
    joint: "elbow",
    top: 170,
    bottom: 90,
    chain: ["shoulder", "elbow", "wrist"],
    label: "Elbow angle",
    cue: "Start from a stronger rack and finish with the arm more vertical.",
    bestView: "front"
  }),
  "bicep-curl": defineExercise({
    category: "Gym workout",
    equipment: "Dumbbells or cable",
    joint: "elbow",
    top: 150,
    bottom: 40,
    chain: ["shoulder", "elbow", "wrist"],
    label: "Elbow angle",
    cue: "Finish the curl higher and avoid swinging at the shoulder.",
    bestView: "front"
  }),
  "hammer-curl": defineExercise({
    category: "Gym workout",
    equipment: "Dumbbells",
    joint: "elbow",
    top: 150,
    bottom: 40,
    chain: ["shoulder", "elbow", "wrist"],
    label: "Elbow angle",
    cue: "Keep the elbows quieter and finish the curl fully.",
    bestView: "front"
  }),
  "tricep-pushdown": defineExercise({
    category: "Gym workout",
    equipment: "Cable machine",
    joint: "elbow",
    top: 155,
    bottom: 45,
    chain: ["shoulder", "elbow", "wrist"],
    label: "Elbow angle",
    cue: "Finish each rep with stronger elbow extension.",
    bestView: "front"
  }),
  "lateral-raise": defineExercise({
    category: "Gym workout",
    equipment: "Dumbbells or cable",
    joint: "shoulder",
    top: 90,
    bottom: 10,
    chain: ["hip", "shoulder", "elbow"],
    label: "Shoulder angle",
    cue: "Lift to shoulder height without leaning the trunk.",
    bestView: "front"
  }),
  "front-raise": defineExercise({
    category: "Gym workout",
    equipment: "Dumbbells or plate",
    joint: "shoulder",
    top: 90,
    bottom: 10,
    chain: ["hip", "shoulder", "elbow"],
    label: "Shoulder angle",
    cue: "Raise higher without using momentum from the torso.",
    bestView: "side"
  }),
  "pull-up": defineExercise({
    category: "Gym workout",
    equipment: "Pull-up bar",
    joint: "elbow",
    top: 150,
    bottom: 45,
    chain: ["shoulder", "elbow", "wrist"],
    label: "Elbow angle",
    cue: "Finish with more elbow bend at the top position.",
    bestView: "side"
  }),
  "lat-pulldown": defineExercise({
    category: "Gym workout",
    equipment: "Cable machine",
    joint: "elbow",
    top: 150,
    bottom: 55,
    chain: ["shoulder", "elbow", "wrist"],
    label: "Elbow angle",
    cue: "Drive the elbows lower before letting the bar return.",
    bestView: "front"
  }),
  "seated-row": defineExercise({
    category: "Gym workout",
    equipment: "Cable or row machine",
    joint: "elbow",
    top: 150,
    bottom: 75,
    chain: ["shoulder", "elbow", "wrist"],
    label: "Elbow angle",
    cue: "Finish the row with more elbow travel and less shoulder shrug.",
    bestView: "front"
  })
};

const BASE_SKELETON_EDGES = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["left_wrist", "left_thumb"],
  ["left_wrist", "left_index"],
  ["left_wrist", "left_pinky"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["right_wrist", "right_thumb"],
  ["right_wrist", "right_index"],
  ["right_wrist", "right_pinky"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["left_ankle", "left_heel"],
  ["left_heel", "left_foot_index"],
  ["left_ankle", "left_foot_index"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
  ["right_ankle", "right_heel"],
  ["right_heel", "right_foot_index"],
  ["right_ankle", "right_foot_index"]
];

function profile() {
  return EXERCISE_PROFILES[liveExercise.value] || null;
}

function setLiveStatus(text, state = "") {
  liveStatus.textContent = text;
  liveStatus.classList.toggle("is-loading", state === "loading");
}

function setCameraButtons(isRunning = false) {
  const exerciseSelected = Boolean(profile());
  startLiveButton.disabled = !exerciseSelected || isRunning;
  startLiveButton.setAttribute("aria-disabled", String(startLiveButton.disabled));
  stopLiveButton.disabled = !isRunning;
  stopLiveButton.setAttribute("aria-disabled", String(stopLiveButton.disabled));
}

function hideLiveError() {
  liveError.hidden = true;
  liveError.textContent = "";
}

function showLiveError(text) {
  liveError.textContent = text;
  liveError.hidden = false;
}

function setWaiting(el, waiting = true) {
  const card = el.closest(".metric-card, .live-digest-grid article");
  if (card) {
    card.classList.toggle("is-waiting", waiting);
  }
}

function setReadout(el, value, waiting = false) {
  el.textContent = waiting ? WAITING_TEXT : value;
  setWaiting(el, waiting);
}

function setConfidence(value) {
  if (Number.isFinite(value)) {
    liveConfidence.textContent = formatPercent(value);
    confidenceBar.style.width = formatPercent(value);
    setWaiting(liveConfidence, false);
    return;
  }
  liveConfidence.textContent = WAITING_TEXT;
  confidenceBar.style.width = "0%";
  setWaiting(liveConfidence, true);
}

function setFormScore(value) {
  const numeric = Number.parseFloat(value);
  if (Number.isFinite(numeric)) {
    liveScore.textContent = `${Math.round(numeric * 10)} / 100`;
    formScoreBar.style.width = `${clamp(numeric / 10, 0, 1) * 100}%`;
    setWaiting(liveScore, false);
    return;
  }
  liveScore.textContent = WAITING_TEXT;
  formScoreBar.style.width = "0%";
  setWaiting(liveScore, true);
}

function setClaudeReportEnabled(enabled) {
  generateClaudeReport.disabled = !enabled;
  generateClaudeReport.setAttribute("aria-disabled", String(!enabled));
}

function setOverlayBadge(text, kind = "neutral") {
  liveOverlayBadge.textContent = text;
  liveOverlayBadge.dataset.kind = kind;
}

function resetSessionState() {
  repCounter = 0;
  repState = "top";
  lastPhase = "Ready";
  smoothedAngle = null;
  stableFrames = 0;
  totalFrames = 0;
  sessionHasData = false;
  setClaudeReportEnabled(false);
}

function validPoint(point, threshold = SCORE_THRESHOLD) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y) && (point.score ?? 0) >= threshold;
}

function getPointScore(point) {
  return Number.isFinite(point?.score) ? point.score : 0;
}

function pointKey(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/__/g, "_")
    .toLowerCase();
}

function getKeypointMap(points = []) {
  const map = {};
  points.forEach((point) => {
    if (point.name) {
      map[point.name] = point;
      map[pointKey(point.name)] = point;
    }
  });
  return map;
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) {
    return null;
  }
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(previous, next, alpha) {
  if (!Number.isFinite(previous)) {
    return next;
  }
  return previous * (1 - alpha) + next * alpha;
}

function calculateAngle(a, b, c) {
  const ab = {
    x: a.x - b.x,
    y: a.y - b.y,
    z: (a.z ?? 0) - (b.z ?? 0)
  };
  const cb = {
    x: c.x - b.x,
    y: c.y - b.y,
    z: (c.z ?? 0) - (b.z ?? 0)
  };
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const magAB = Math.hypot(ab.x, ab.y, ab.z);
  const magCB = Math.hypot(cb.x, cb.y, cb.z);
  if (!magAB || !magCB) {
    return null;
  }
  const cosine = clamp(dot / (magAB * magCB), -1, 1);
  return Math.round((Math.acos(cosine) * 180) / Math.PI);
}

function getSideChain(sideName, keypointMap, threshold = SCORE_THRESHOLD) {
  const currentProfile = profile();
  if (!currentProfile) {
    return null;
  }
  const side = sideName === "left" ? "left" : "right";
  const names = currentProfile.chain.map((joint) => `${side}_${joint}`);
  const [a, b, c] = names.map((name) => keypointMap[name] || keypointMap[pointKey(name)]);
  if (!validPoint(a, threshold) || !validPoint(b, threshold) || !validPoint(c, threshold)) {
    return null;
  }
  return calculateAngle(a, b, c);
}

function confidenceForSide(sideName, keypointMap) {
  const currentProfile = profile();
  if (!currentProfile) {
    return null;
  }
  const side = sideName === "left" ? "left" : "right";
  const names = currentProfile.chain.map((joint) => `${side}_${joint}`);
  return average(
    names.map((name) => {
      const point = keypointMap[name] || keypointMap[pointKey(name)];
      return getPointScore(point);
    })
  );
}

function computePrimaryAngles(imageMap, worldMap) {
  const worldLeft = getSideChain("left", worldMap);
  const worldRight = getSideChain("right", worldMap);
  const imageLeft = getSideChain("left", imageMap);
  const imageRight = getSideChain("right", imageMap);
  const left = worldLeft ?? imageLeft;
  const right = worldRight ?? imageRight;
  const leftConfidence = confidenceForSide("left", imageMap);
  const rightConfidence = confidenceForSide("right", imageMap);
  return {
    left,
    right,
    average: average([left, right]),
    leftConfidence,
    rightConfidence,
    confidence: average([leftConfidence, rightConfidence]) ?? 0
  };
}

function resizeOverlay() {
  liveOverlay.width = liveVideo.videoWidth || 1280;
  liveOverlay.height = liveVideo.videoHeight || 720;
}

function isFacePoint(name) {
  return FACE_KEYWORDS.some((keyword) => name.includes(keyword));
}

function activeEdges() {
  const currentProfile = profile();
  if (!currentProfile) {
    return new Set();
  }
  const joints = currentProfile.chain;
  const left = joints.map((joint) => `left_${joint}`);
  const right = joints.map((joint) => `right_${joint}`);
  return new Set([
    `${left[0]}:${left[1]}`,
    `${left[1]}:${left[2]}`,
    `${right[0]}:${right[1]}`,
    `${right[1]}:${right[2]}`
  ]);
}

function drawSkeleton(imageMap) {
  const highlighted = activeEdges();
  ctx.clearRect(0, 0, liveOverlay.width, liveOverlay.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  BASE_SKELETON_EDGES.forEach(([a, b]) => {
    const pointA = imageMap[a] || imageMap[pointKey(a)];
    const pointB = imageMap[b] || imageMap[pointKey(b)];
    if (!validPoint(pointA) || !validPoint(pointB)) {
      return;
    }
    const isActive = highlighted.has(`${a}:${b}`) || highlighted.has(`${b}:${a}`);
    ctx.beginPath();
    ctx.strokeStyle = isActive ? ACTIVE_CHAIN_COLOR : BODY_CHAIN_COLOR;
    ctx.lineWidth = isActive ? 5 : 3;
    ctx.moveTo(pointA.x, pointA.y);
    ctx.lineTo(pointB.x, pointB.y);
    ctx.stroke();
  });

  Object.entries(imageMap).forEach(([name, point]) => {
    if (!validPoint(point) || isFacePoint(name) || !name.startsWith("left_") && !name.startsWith("right_")) {
      return;
    }
    const currentProfile = profile();
    const activeJoint = currentProfile?.chain.some((joint) => name.endsWith(`_${joint}`));
    ctx.beginPath();
    ctx.fillStyle = activeJoint ? ACTIVE_JOINT_COLOR : JOINT_COLOR;
    ctx.arc(point.x, point.y, activeJoint ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function boundsFromImage(imageMap) {
  const bodyPoints = Object.entries(imageMap)
    .filter(([name, point]) => validPoint(point, 0.2) && !isFacePoint(name))
    .map(([, point]) => point);

  if (bodyPoints.length < 10) {
    return null;
  }

  const xs = bodyPoints.map((point) => point.x);
  const ys = bodyPoints.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
}

function coverageForProfile(imageMap) {
  const required = [
    "left_shoulder",
    "right_shoulder",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle"
  ];
  const visible = required.filter((name) => validPoint(imageMap[name] || imageMap[pointKey(name)], 0.25)).length;
  return visible / required.length;
}

function orientationHint(imageMap) {
  const currentProfile = profile();
  if (!currentProfile) {
    return null;
  }
  const leftShoulder = imageMap.left_shoulder;
  const rightShoulder = imageMap.right_shoulder;
  const leftHip = imageMap.left_hip;
  const rightHip = imageMap.right_hip;
  if (!validPoint(leftShoulder, 0.25) || !validPoint(rightShoulder, 0.25) || !validPoint(leftHip, 0.25) || !validPoint(rightHip, 0.25)) {
    return null;
  }

  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
  const hipWidth = Math.abs(rightHip.x - leftHip.x);
  const torsoHeight = average([
    Math.abs(leftHip.y - leftShoulder.y),
    Math.abs(rightHip.y - rightShoulder.y)
  ]) || 1;
  const widthRatio = average([shoulderWidth, hipWidth]) / torsoHeight;

  if (currentProfile.bestView === "side" && widthRatio > 0.62) {
    return "Turn your body more to the side for cleaner angle tracking.";
  }
  if (currentProfile.bestView === "front" && widthRatio < 0.36) {
    return "Turn a little more toward the camera for better left/right comparison.";
  }
  return null;
}

function positioningFeedback(bounds, imageMap) {
  const currentProfile = profile();
  if (!currentProfile) {
    return {
      message: "Select an exercise before starting the camera.",
      quality: 0
    };
  }
  const coverage = coverageForProfile(imageMap);
  if (coverage < 0.75) {
    return {
      message: "Step back until shoulders, hips, knees, and ankles are all visible.",
      quality: 0.3
    };
  }

  if (liveAngle.value !== "three-quarter" && liveAngle.value !== currentProfile.bestView) {
    return {
      message: `Switch to a ${currentProfile.bestView} camera view for cleaner ${currentProfile.label.toLowerCase()} tracking.`,
      quality: 0.6
    };
  }

  if (!bounds) {
    return {
      message: "Move back and make sure your full body is visible.",
      quality: 0.25
    };
  }

  const width = liveOverlay.width || 1;
  const height = liveOverlay.height || 1;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const bodyWidth = bounds.maxX - bounds.minX;
  const bodyHeight = bounds.maxY - bounds.minY;

  if (centerX < width * 0.35) {
    return { message: "Move slightly right.", quality: 0.5 };
  }
  if (centerX > width * 0.65) {
    return { message: "Move slightly left.", quality: 0.5 };
  }
  if (bodyHeight < height * 0.56) {
    return { message: "Move closer to the camera.", quality: 0.55 };
  }
  if (bodyHeight > height * 0.96 || bodyWidth > width * 0.84) {
    return { message: "Move a little back.", quality: 0.55 };
  }
  if (bounds.minY < height * POSITION_MARGIN || bounds.maxY > height * (1 - POSITION_MARGIN)) {
    return { message: "Step back until your full body fits in frame.", quality: 0.5 };
  }

  const orientationMessage = orientationHint(imageMap);
  if (orientationMessage) {
    return { message: orientationMessage, quality: 0.68 };
  }

  return { message: "Good position", quality: 1 };
}

function depthProgress(angle) {
  const currentProfile = profile();
  if (!currentProfile || !Number.isFinite(angle) || currentProfile.top === currentProfile.bottom) {
    return null;
  }
  return clamp((currentProfile.top - angle) / (currentProfile.top - currentProfile.bottom), 0, 1);
}

function determinePhase(angle, delta) {
  const currentProfile = profile();
  if (!currentProfile) {
    return "Ready";
  }
  if (!Number.isFinite(angle)) {
    return "Tracking...";
  }
  if (currentProfile.top === currentProfile.bottom) {
    return "Hold";
  }
  const topWindow = currentProfile.top - 6;
  const bottomWindow = currentProfile.bottom + 6;

  if (angle >= topWindow) {
    return "Lockout";
  }
  if (angle <= bottomWindow) {
    return "Depth";
  }
  if (delta < -0.7) {
    return "Descending";
  }
  if (delta > 0.7) {
    return "Ascending";
  }
  return lastPhase === "Descending" ? "Descending" : "Ascending";
}

function updateRepCounter(angle, confidence, positionOk) {
  const currentProfile = profile();
  if (!currentProfile || !Number.isFinite(angle) || currentProfile.top === currentProfile.bottom || confidence < 0.5 || !positionOk) {
    return;
  }

  if (repState === "top" && angle <= currentProfile.bottom + 5) {
    repState = "bottom";
  } else if (repState === "bottom" && angle >= currentProfile.top - 5) {
    repState = "top";
    repCounter += 1;
  }
}

function formatPercent(value) {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}

function scoreForm(angles, positionQuality, phase, depthRatio) {
  const currentProfile = profile();
  if (!currentProfile || !Number.isFinite(angles.average)) {
    return {
      score: WAITING_TEXT,
      cue: "Hold the target joints in view so the model can lock onto the movement."
    };
  }

  const symmetryGap =
    Number.isFinite(angles.left) && Number.isFinite(angles.right)
      ? Math.abs(angles.left - angles.right)
      : 18;

  const confidenceQuality = clamp(angles.confidence, 0, 1);
  const symmetryQuality = clamp(1 - symmetryGap / 18, 0, 1);
  const rangeQuality =
    currentProfile.top === currentProfile.bottom
      ? clamp(1 - Math.abs(angles.average - currentProfile.top) / 16, 0, 1)
      : clamp(depthRatio ?? 0, 0, 1);

  const weighted =
    confidenceQuality * 0.34 +
    symmetryQuality * 0.28 +
    rangeQuality * 0.24 +
    positionQuality * 0.14;

  let cue = "Stable tracking.";
  if (positionQuality < 0.9) {
    cue = liveStatus.textContent;
  } else if (confidenceQuality < 0.55) {
    cue = "Keep the full joint chain visible so the tracker can stay locked.";
  } else if (symmetryGap > 10) {
    cue = "Left and right sides are moving unevenly. Slow down and level them out.";
  } else if (currentProfile.top !== currentProfile.bottom && (depthRatio ?? 0) < 0.82) {
    cue = currentProfile.cue;
  } else if (phase === "Depth") {
    cue = "Depth looks on target. Stay braced through the turnaround.";
  } else if (phase === "Lockout") {
    cue = "Top position looks strong. Control the next rep down.";
  }

  return {
    score: (weighted * 10).toFixed(1),
    cue
  };
}

function updateDigest(angles, depthRatio, positionQuality) {
  const symmetryGap =
    Number.isFinite(angles.left) && Number.isFinite(angles.right)
      ? Math.abs(angles.left - angles.right)
      : null;

  if (angles.confidence >= 0.55 && positionQuality >= 0.9) {
    stableFrames += 1;
  }
  totalFrames += 1;

  setReadout(liveDepth, depthRatio == null ? WAITING_TEXT : formatPercent(depthRatio), depthRatio == null);
  setReadout(liveSymmetry, symmetryGap == null ? WAITING_TEXT : `${Math.round(symmetryGap)}° gap`, symmetryGap == null);
  setReadout(liveStable, totalFrames ? formatPercent(stableFrames / totalFrames) : WAITING_TEXT, !totalFrames);
  if (stableFrames > 0) {
    sessionHasData = true;
    setClaudeReportEnabled(true);
  }
}

function updateSummary(angles, phase, depthRatio, positionResult, form) {
  if (!Number.isFinite(angles.average)) {
    liveSummary.textContent = "Tracking is waiting for a clearer full-body view before judging the rep.";
    return;
  }

  const depthText =
    depthRatio == null
      ? "hold quality"
      : `${Math.round(clamp(depthRatio, 0, 1) * 100)}% of target depth`;
  const symmetryGap =
    Number.isFinite(angles.left) && Number.isFinite(angles.right)
      ? `${Math.round(Math.abs(angles.left - angles.right))}°`
      : "n/a";

  if (positionResult.message !== "Good position") {
    liveSummary.textContent = `${positionResult.message} Once framing is clean, the system will score ${depthText} and left/right balance.`;
    return;
  }

  liveSummary.textContent = `Live read: ${phase.toLowerCase()} with ${depthText}, ${symmetryGap} left/right gap, and form score ${form.score}/10.`;
}

function formatChain(chain) {
  return chain.map((joint) => CHAIN_LABELS[joint] || joint).join(" -> ");
}

function formatView(view) {
  if (view === "three-quarter") {
    return "45°";
  }
  return view.charAt(0).toUpperCase() + view.slice(1);
}

function formatRange(currentProfile) {
  if (currentProfile.top === currentProfile.bottom) {
    return `Hold near ${currentProfile.top}°`;
  }
  return `${currentProfile.top}° to ${currentProfile.bottom}°`;
}

function updateAngleLabels() {
  const currentProfile = profile();
  if (!currentProfile) {
    leftAngleLabel.textContent = "Left angle";
    rightAngleLabel.textContent = "Right angle";
    liveModelBadge.textContent = liveModel.value.charAt(0).toUpperCase() + liveModel.value.slice(1);
    exerciseCategory.textContent = WAITING_TEXT;
    exerciseEquipment.textContent = WAITING_TEXT;
    exerciseJoint.textContent = WAITING_TEXT;
    exerciseRange.textContent = WAITING_TEXT;
    exerciseView.textContent = WAITING_TEXT;
    exerciseChain.textContent = WAITING_TEXT;
    return;
  }
  const label = currentProfile.label;
  leftAngleLabel.textContent = `Left ${label}`;
  rightAngleLabel.textContent = `Right ${label}`;
  liveModelBadge.textContent = liveModel.value.charAt(0).toUpperCase() + liveModel.value.slice(1);
  exerciseCategory.textContent = currentProfile.category;
  exerciseEquipment.textContent = currentProfile.equipment;
  exerciseJoint.textContent = currentProfile.label;
  exerciseRange.textContent = formatRange(currentProfile);
  exerciseView.textContent = formatView(currentProfile.bestView);
  exerciseChain.textContent = formatChain(currentProfile.chain);
}

function resetLiveReadout() {
  const currentProfile = profile();
  setReadout(liveReps, "0");
  setReadout(livePhase, currentProfile ? "Ready" : "Select exercise");
  setFormScore(null);
  setConfidence(null);
  liveCue.textContent = currentProfile ? `${currentProfile.cue}` : "Select an exercise.";
  setReadout(leftAngleEl, WAITING_TEXT, true);
  setReadout(rightAngleEl, WAITING_TEXT, true);
  setReadout(liveDepth, WAITING_TEXT, true);
  setReadout(liveSymmetry, WAITING_TEXT, true);
  setReadout(liveStable, WAITING_TEXT, true);
  liveSummary.textContent = currentProfile
    ? "Start the camera and stand fully inside frame to begin live kinematic tracking."
    : "Select an exercise, align your body in frame, then press Start.";
  setOverlayBadge("Align full body inside frame");
  setCameraButtons(Boolean(liveStream));
}

async function destroyDetector() {
  if (!detector) {
    return;
  }
  if (typeof detector.dispose === "function") {
    detector.dispose();
  } else if (typeof detector.reset === "function") {
    detector.reset();
  }
  detector = null;
}

async function ensureDetector() {
  if (detector) {
    return detector;
  }

  setLiveStatus("Loading pose model. This may take a moment on older devices.", "loading");
  setOverlayBadge("Loading pose model", "neutral");
  await tf.setBackend("webgl");
  detector = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, {
    runtime: "mediapipe",
    modelType: liveModel.value,
    solutionPath: BLAZEPOSE_SOLUTION_PATH,
    enableSmoothing: true
  });
  return detector;
}

async function estimatePoseLoop() {
  if (!detector || !liveStream) {
    return;
  }

  let poses;
  try {
    poses = await detector.estimatePoses(liveVideo, { flipHorizontal: false });
  } catch (error) {
    console.error(error);
    setLiveStatus("Pose tracking paused because the browser model raised an error.");
    setOverlayBadge("Tracking paused", "warn");
    animationFrameId = window.requestAnimationFrame(estimatePoseLoop);
    return;
  }

  const pose = poses[0];

  resizeOverlay();

  if (!pose?.keypoints?.length) {
    ctx.clearRect(0, 0, liveOverlay.width, liveOverlay.height);
    setLiveStatus("No person detected. Step back and keep your full body visible.");
    setOverlayBadge("Find full body", "warn");
    animationFrameId = window.requestAnimationFrame(estimatePoseLoop);
    return;
  }

  const imageMap = getKeypointMap(pose.keypoints);
  const worldMap = getKeypointMap(pose.keypoints3D || []);
  drawSkeleton(imageMap);

  const bounds = boundsFromImage(imageMap);
  const positionResult = positioningFeedback(bounds, imageMap);
  const angles = computePrimaryAngles(imageMap, worldMap);
  const nextAverage = angles.average;
  const previousAngle = smoothedAngle;
  smoothedAngle = Number.isFinite(nextAverage) ? lerp(previousAngle, nextAverage, ANGLE_SMOOTHING) : null;
  const delta = Number.isFinite(smoothedAngle) && Number.isFinite(previousAngle) ? smoothedAngle - previousAngle : 0;
  const phase = determinePhase(smoothedAngle, delta);
  const depthRatio = depthProgress(smoothedAngle);
  const positionOk = positionResult.message === "Good position";

  updateRepCounter(smoothedAngle, angles.confidence, positionOk);

  const form = scoreForm(angles, positionResult.quality, phase, depthRatio);
  updateDigest(angles, depthRatio, positionResult.quality);
  updateSummary(angles, phase, depthRatio, positionResult, form);

  setReadout(liveReps, String(repCounter));
  setReadout(livePhase, phase);
  setFormScore(form.score);
  setConfidence(angles.confidence);
  liveCue.textContent = form.cue;
  setReadout(leftAngleEl, Number.isFinite(angles.left) ? `${angles.left}°` : WAITING_TEXT, !Number.isFinite(angles.left));
  setReadout(rightAngleEl, Number.isFinite(angles.right) ? `${angles.right}°` : WAITING_TEXT, !Number.isFinite(angles.right));

  if (positionOk) {
    setLiveStatus(
      `Tracking ${liveExercise.options[liveExercise.selectedIndex].text} | ${profile().label} | Preferred view: ${profile().bestView}`
    );
    setOverlayBadge(`${phase} | ${profile().label} ${Number.isFinite(smoothedAngle) ? `${Math.round(smoothedAngle)}°` : WAITING_TEXT}`, "good");
  } else {
    setLiveStatus(positionResult.message);
    setOverlayBadge(positionResult.message, "warn");
  }

  lastPhase = phase;
  animationFrameId = window.requestAnimationFrame(estimatePoseLoop);
}

async function startLiveMode() {
  if (!profile()) {
    setLiveStatus(DEFAULT_STATUS);
    liveCue.textContent = "Select an exercise.";
    return;
  }
  try {
    hideLiveError();
    if (liveStream) {
      stopLiveMode();
    }
    await destroyDetector();
    await ensureDetector();
    liveStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    liveVideo.srcObject = liveStream;
    await liveVideo.play();
    livePreviewEmpty.style.display = "none";
    liveVideo.closest(".live-preview")?.classList.add("is-tracking");
    resetSessionState();
    resetLiveReadout();
    updateAngleLabels();
    setCameraButtons(true);
    setLiveStatus("Camera started. Stand where your full body is visible and hold still for a moment.");
    setOverlayBadge("Hold still while model locks on", "neutral");
    animationFrameId = window.requestAnimationFrame(estimatePoseLoop);
  } catch (error) {
    console.error(error);
    const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
    const message = denied
      ? "Camera access denied. Please allow webcam permissions in your browser settings and refresh."
      : "Camera or MediaPipe pose initialization failed. Check camera permissions and make sure the model scripts can load.";
    showLiveError(message);
    setLiveStatus(message);
    setOverlayBadge(denied ? "Camera access denied" : "Model failed to load", "warn");
    setCameraButtons(false);
  }
}

function stopLiveMode(preserveSession = false) {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (liveStream) {
    liveStream.getTracks().forEach((track) => track.stop());
    liveStream = null;
  }
  ctx.clearRect(0, 0, liveOverlay.width, liveOverlay.height);
  liveVideo.srcObject = null;
  liveVideo.closest(".live-preview")?.classList.remove("is-tracking");
  livePreviewEmpty.style.display = "grid";
  if (preserveSession && sessionHasData) {
    liveCue.textContent = "Session ended. Review the digest or generate a Claude report.";
    liveSummary.textContent = `${liveSummary.textContent} Camera stopped. Review this digest or generate a Claude report.`;
    setOverlayBadge("Session ended", "neutral");
    setClaudeReportEnabled(true);
  } else {
    resetSessionState();
    resetLiveReadout();
  }
  setLiveStatus("Camera stopped. Real joint tracking is paused.");
  setCameraButtons(false);
}

async function refreshDetectorIfRunning() {
  updateAngleLabels();
  hideLiveError();
  resetLiveReadout();
  setCameraButtons(Boolean(liveStream));
  if (!liveStream) {
    return;
  }
  stopLiveMode(false);
  await startLiveMode();
}

function syncSegmentButtons(controlId, value) {
  segmentButtons.forEach((button) => {
    if (button.dataset.control !== controlId) {
      return;
    }
    button.classList.toggle("is-active", button.dataset.value === value);
  });
}

function setSegmentValue(button) {
  const control = document.querySelector(`#${button.dataset.control}`);
  if (!control) {
    return;
  }
  control.value = button.dataset.value;
  syncSegmentButtons(button.dataset.control, control.value);
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

startLiveButton.addEventListener("click", startLiveMode);
stopLiveButton.addEventListener("click", () => stopLiveMode(true));
liveExercise.addEventListener("change", refreshDetectorIfRunning);
liveAngle.addEventListener("change", () => {
  syncSegmentButtons("live-angle", liveAngle.value);
  refreshDetectorIfRunning();
});
liveModel.addEventListener("change", () => {
  syncSegmentButtons("live-model", liveModel.value);
  refreshDetectorIfRunning();
});
segmentButtons.forEach((button) => {
  button.addEventListener("click", () => setSegmentValue(button));
});
generateClaudeReport.addEventListener("click", () => {
  if (!sessionHasData) {
    return;
  }
  setLiveStatus("Claude report generation is ready for backend wiring. Send saved clips, sampled frames, or movement metrics through /api/analyze.");
});

updateAngleLabels();
resetLiveReadout();
setLiveStatus(DEFAULT_STATUS);
setCameraButtons(false);
syncSegmentButtons("live-angle", liveAngle.value);
syncSegmentButtons("live-model", liveModel.value);
