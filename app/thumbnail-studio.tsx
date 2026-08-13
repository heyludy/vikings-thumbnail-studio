"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type TeamTheme = "men" | "women";
type Division = TeamTheme | "both";

const VIKINGS_LOGO_URL = "/assets/vikings-logo-v3.webp";
// globals.css 에 심어둔 Pretendard Black. 기기 폰트에 맡기면 굵기가 기기마다 달라진다.
const CANVAS_FONT_STACK = '"PretendardCanvas", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Arial Black", sans-serif';
const DIVISION_LABELS: Record<Division, string> = { men: "남자부", women: "여자부", both: "공통" };

type Project = {
  id: string;
  name: string;
  logoUrl: string;
  tournamentLine1: string;
  tournamentLine2: string;
};

type Opponent = {
  id: string;
  name: string;
  logoUrl: string;
  circularFrame: boolean;
  division: Division;
};

type LoadedImage = {
  img: HTMLImageElement;
  src: string;
  fileName?: string;
};

const WIDTH = 1920;
const HEIGHT = 1080;
// 왼쪽 패널은 위 900 → 아래 760 으로 좁아지는 사다리꼴이다.
const SPLIT_TOP = 900;
const SPLIT_BOTTOM = 760;
const panelEdgeX = (y: number) => SPLIT_TOP - (SPLIT_TOP - SPLIT_BOTTOM) * (y / HEIGHT);
// 그 높이에서의 패널 가로 중앙. 고정 좌표로 그리면 아래쪽 줄이 오른쪽으로 밀려 보인다.
const panelCenterX = (y: number) => panelEdgeX(y) / 2;
const JEJU_PROJECT: Project = {
  id: "jeju-open-2026",
  name: "2026 제주국제오픈",
  logoUrl: "/assets/jeju/jeju-open-logo.webp",
  tournamentLine1: "2026 제주국제오픈",
  tournamentLine2: "플로어볼 대회",
};
const SAMPLE_PROJECT: Project = {
  id: "sample-project",
  name: "챌린지컵 샘플",
  logoUrl: "/assets/sample-tournament-logo.png",
  tournamentLine1: "대전광역시 플로어볼",
  tournamentLine2: "챌린지컵 대회",
};
const DEFAULT_PROJECTS: Project[] = [JEJU_PROJECT, SAMPLE_PROJECT];
const DEFAULT_PROJECT = DEFAULT_PROJECTS[0];
// 2026 제주국제오픈 참가팀 (출처: https://flovus.info/competitions/6)
const JEJU_OPPONENTS: Opponent[] = [
  { id: "jeju-hong-kong-stars", name: "Hong Kong Stars", logoUrl: "/assets/jeju/hong-kong-stars-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-ntu-men-s-white", name: "NTU Men's White", logoUrl: "/assets/jeju/ntu-men-s-white-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-tamla-devil", name: "Tamla Devil", logoUrl: "/assets/jeju/tamla-devil-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-team-leopard", name: "Team Leopard", logoUrl: "/assets/jeju/team-leopard-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-astra", name: "ASTRA", logoUrl: "/assets/jeju/astra-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-jeju-oceans", name: "Jeju Oceans", logoUrl: "/assets/jeju/jeju-oceans-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-lingfung", name: "LingFung", logoUrl: "/assets/opponent-placeholder.png", circularFrame: true, division: "men" },
  { id: "jeju-pegasus", name: "Pegasus", logoUrl: "/assets/jeju/pegasus-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-jeju-dolphins", name: "Jeju Dolphins", logoUrl: "/assets/jeju/jeju-dolphins-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-merlion-men", name: "Merlion Men", logoUrl: "/assets/jeju/merlion-men-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-shanghai-jingwu", name: "ShangHai Jingwu", logoUrl: "/assets/jeju/shanghai-jingwu-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-shinil-fc", name: "SHINIL FC", logoUrl: "/assets/jeju/shinil-fc-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-daykey", name: "Daykey", logoUrl: "/assets/jeju/daykey-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-mars", name: "Mars", logoUrl: "/assets/jeju/mars-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-ntu-men-s-blue", name: "NTU Men's Blue", logoUrl: "/assets/jeju/ntu-men-s-blue-logo.webp", circularFrame: true, division: "men" },
  { id: "jeju-jeju-blue-dolphins", name: "Jeju Blue Dolphins", logoUrl: "/assets/jeju/jeju-blue-dolphins-logo.webp", circularFrame: true, division: "women" },
  { id: "jeju-keplites", name: "Keplites", logoUrl: "/assets/jeju/keplites-logo.webp", circularFrame: true, division: "women" },
  { id: "jeju-tamla-devil-w", name: "Tamla Devil (W)", logoUrl: "/assets/jeju/tamla-devil-w-logo.webp", circularFrame: true, division: "women" },
  { id: "jeju-pegasus-w", name: "Pegasus (W)", logoUrl: "/assets/jeju/pegasus-w-logo.webp", circularFrame: true, division: "women" },
  { id: "jeju-shanghai-jingwu-w", name: "Shanghai JingWu (W)", logoUrl: "/assets/jeju/shanghai-jingwu-w-logo.webp", circularFrame: true, division: "women" },
  { id: "jeju-sojeju", name: "SoJeju", logoUrl: "/assets/jeju/sojeju-logo.webp", circularFrame: true, division: "women" },
  { id: "jeju-team-leopard-w", name: "Team Leopard (W)", logoUrl: "/assets/jeju/team-leopard-w-logo.webp", circularFrame: true, division: "women" },
  { id: "jeju-fed-fat", name: "FED FAT", logoUrl: "/assets/jeju/fed-fat-logo.webp", circularFrame: true, division: "women" },
  { id: "jeju-ntu-women-s", name: "NTU Women's", logoUrl: "/assets/jeju/ntu-women-s-logo.webp", circularFrame: true, division: "women" },
  { id: "jeju-overflow", name: "Overflow", logoUrl: "/assets/jeju/overflow-logo.webp", circularFrame: true, division: "women" },
  { id: "jeju-t-allies", name: "T_Allies", logoUrl: "/assets/jeju/t-allies-logo.webp", circularFrame: true, division: "women" },
  { id: "jeju-team-shinseong", name: "Team Shinseong", logoUrl: "/assets/jeju/team-shinseong-logo.webp", circularFrame: true, division: "women" },
];
const DEFAULT_OPPONENTS: Opponent[] = [
  ...JEJU_OPPONENTS,
  { id: "incheon-sniper", name: "인천 스나이퍼", logoUrl: "/assets/incheon-sniper-logo.png", circularFrame: true, division: "both" },
  { id: "seoul-haechis", name: "서울 해치스", logoUrl: "/assets/seoul-haechis-logo.png", circularFrame: true, division: "both" },
  { id: "seoul-ares", name: "서울 아레스", logoUrl: "/assets/seoul-ares-logo.png", circularFrame: true, division: "both" },
  { id: "gyeryong-onekill-dragons", name: "계룡 원킬 드래곤즈", logoUrl: "/assets/gyeryong-onekill-dragons-logo.png", circularFrame: true, division: "both" },
  { id: "gwangju-team-leopard", name: "광주 Team-Leopard", logoUrl: "/assets/gwangju-team-leopard-logo.png", circularFrame: true, division: "both" },
  { id: "jeju-blue-dolphins", name: "제주 블루돌핀스", logoUrl: "/assets/jeju-blue-dolphins-logo.png", circularFrame: true, division: "both" },
  { id: "gangwon-blue-knights", name: "강원 블루나이츠", logoUrl: "/assets/gangwon-blue-knights-logo.png", circularFrame: true, division: "both" },
  { id: "jeonbuk-overflow", name: "전북 오버플로", logoUrl: "/assets/jeonbuk-overflow-logo.png", circularFrame: true, division: "both" },
];

const readImageFromFile = (file: File): Promise<LoadedImage> =>
  new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, src, fileName: file.name });
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("이미지를 불러오지 못했습니다."));
    };
    img.src = src;
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지를 불러오지 못했습니다: ${src}`));
    img.src = src;
  });

async function compressLogoFile(file: File) {
  const loaded = await readImageFromFile(file);
  try {
    const maxSide = 512;
    const ratio = Math.min(1, maxSide / Math.max(loaded.img.naturalWidth, loaded.img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(loaded.img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(loaded.img.naturalHeight * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(loaded.img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "logo"}.webp`, { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(loaded.src);
  }
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: { x: number; y: number; w: number; h: number },
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * zoom;
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const dx = box.x + (box.w - drawW) / 2 + offsetX;
  const dy = box.y + (box.h - drawH) / 2 + offsetY;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

// 로고를 원형으로 자르지 않고 비율 그대로 보이게 그린다.
function drawContainImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  maxWidth: number,
  maxHeight: number,
) {
  const scale = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.45)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 7;
  ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  ctx.restore();
}

const sportFont = (size: number) => `900 ${size}px ${CANVAS_FONT_STACK}`;

// 영문 대회명처럼 긴 문구는 패널을 넘지 않도록 글자 크기를 줄인다.
function fitSportFontSize(ctx: CanvasRenderingContext2D, text: string, size: number, maxWidth: number) {
  let fitted = size;
  while (fitted > 28) {
    ctx.font = sportFont(fitted);
    if (ctx.measureText(text).width <= maxWidth) break;
    fitted -= 2;
  }
  return fitted;
}

function drawSportText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  align: CanvasTextAlign = "center",
  maxWidth?: number,
) {
  ctx.save();
  const fontSize = maxWidth ? fitSportFontSize(ctx, text, size, maxWidth) : size;
  ctx.font = sportFont(fontSize);
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.strokeStyle = "rgba(5, 5, 18, .3)";
  ctx.lineWidth = Math.max(3, fontSize * 0.035);
  ctx.shadowColor = "rgba(0,0,0,.32)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawSilkRibbon(
  ctx: CanvasRenderingContext2D,
  color: string,
  shadow: string,
  startX: number,
  width: number,
  alpha: number,
  lean: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(startX, -80);
  ctx.bezierCurveTo(startX + width * 1.4, 150, startX - width * 0.2, 410, startX + width + lean, HEIGHT + 80);
  ctx.lineTo(startX + width * 1.55 + lean, HEIGHT + 80);
  ctx.bezierCurveTo(startX + width * 0.4, 420, startX + width * 1.9, 150, startX + width * 0.55, -80);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.globalAlpha = alpha * 0.58;
  ctx.beginPath();
  ctx.moveTo(startX + width * 0.92, -60);
  ctx.bezierCurveTo(startX + width * 1.8, 150, startX + width * 0.28, 430, startX + width * 1.28 + lean, HEIGHT + 60);
  ctx.lineWidth = Math.max(18, width * 0.18);
  ctx.strokeStyle = shadow;
  ctx.stroke();
  ctx.restore();
}

function drawLogoCircle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  size: number,
  frame: boolean,
) {
  ctx.save();
  if (frame) {
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 + 10, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(10,10,14,.22)";
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.shadowColor = "rgba(0,0,0,.5)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.clip();
  drawCoverImage(ctx, img, { x: cx - size / 2, y: cy - size / 2, w: size, h: size }, 1, 0, 0);
  ctx.restore();
}

function drawThemePanel(ctx: CanvasRenderingContext2D, theme: TeamTheme) {
  const splitTop = SPLIT_TOP;
  const splitBottom = SPLIT_BOTTOM;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(splitTop, 0);
  ctx.lineTo(splitBottom, HEIGHT);
  ctx.lineTo(0, HEIGHT);
  ctx.closePath();
  ctx.clip();

  const gradient = ctx.createLinearGradient(0, 0, splitTop, HEIGHT);
  if (theme === "men") {
    gradient.addColorStop(0, "#100058");
    gradient.addColorStop(0.32, "#17106d");
    gradient.addColorStop(0.64, "#0b074a");
    gradient.addColorStop(1, "#050022");
  } else {
    gradient.addColorStop(0, "#9c064c");
    gradient.addColorStop(0.38, "#d9156d");
    gradient.addColorStop(0.7, "#8b073e");
    gradient.addColorStop(1, "#3f061f");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, splitTop, HEIGHT);

  const shine = ctx.createRadialGradient(245, 210, 20, 290, 260, 620);
  shine.addColorStop(0, theme === "men" ? "rgba(116, 88, 255, .38)" : "rgba(255, 118, 180, .34)");
  shine.addColorStop(0.48, theme === "men" ? "rgba(46, 31, 155, .16)" : "rgba(208, 30, 110, .18)");
  shine.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, splitTop, HEIGHT);

  const ribbonColor = theme === "men" ? "rgba(89, 68, 223, .26)" : "rgba(255, 82, 165, .22)";
  const ribbonShadow = theme === "men" ? "rgba(0, 0, 42, .34)" : "rgba(76, 0, 34, .32)";
  drawSilkRibbon(ctx, ribbonColor, ribbonShadow, -120, 120, 0.65, 80);
  drawSilkRibbon(ctx, ribbonColor, ribbonShadow, 110, 135, 0.52, 95);
  drawSilkRibbon(ctx, ribbonColor, ribbonShadow, 360, 155, 0.42, 105);
  drawSilkRibbon(ctx, theme === "men" ? "rgba(126, 97, 255, .18)" : "rgba(255, 126, 190, .18)", ribbonShadow, 620, 150, 0.36, 90);

  ctx.globalAlpha = 0.32;
  ctx.globalCompositeOperation = "screen";
  for (let i = -80; i < 880; i += 165) {
    const fold = ctx.createLinearGradient(i, 0, i + 130, HEIGHT);
    fold.addColorStop(0, "rgba(255,255,255,0)");
    fold.addColorStop(0.48, theme === "men" ? "rgba(105,87,255,.2)" : "rgba(255,104,177,.2)");
    fold.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath();
    ctx.moveTo(i, -40);
    ctx.bezierCurveTo(i + 115, 210, i + 20, 460, i + 180, HEIGHT + 40);
    ctx.lineWidth = 32;
    ctx.strokeStyle = fold;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  const vignette = ctx.createLinearGradient(0, 0, splitTop, 0);
  vignette.addColorStop(0, "rgba(0,0,0,.22)");
  vignette.addColorStop(0.48, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,.28)");
  ctx.fillStyle = vignette;
  ctx.globalAlpha = 1;
  ctx.fillRect(0, 0, splitTop, HEIGHT);

  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#ffffff";
  for (let y = 0; y < HEIGHT; y += 5) {
    ctx.fillRect(0, y, splitTop, 1);
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(splitTop, 0);
  ctx.lineTo(splitBottom, HEIGHT);
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(0,0,0,.44)";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(splitTop + 8, 0);
  ctx.lineTo(splitBottom + 8, HEIGHT);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.stroke();
  ctx.restore();
}

type RenderInputs = {
  canvas: HTMLCanvasElement;
  theme: TeamTheme;
  project: Project;
  opponent: Opponent;
  stageText: string;
  gamePhoto?: HTMLImageElement;
  logoImages: Record<string, HTMLImageElement>;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

function renderThumbnail({
  canvas,
  theme,
  project,
  opponent,
  stageText,
  gamePhoto,
  logoImages,
  zoom,
  offsetX,
  offsetY,
}: RenderInputs) {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#f0eadb";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const splitTop = SPLIT_TOP;
  const splitBottom = SPLIT_BOTTOM;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(splitTop, 0);
  ctx.lineTo(WIDTH, 0);
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.lineTo(splitBottom, HEIGHT);
  ctx.closePath();
  ctx.clip();
  if (gamePhoto) {
    drawCoverImage(ctx, gamePhoto, { x: splitBottom, y: 0, w: WIDTH - splitBottom, h: HEIGHT }, zoom, offsetX, offsetY);
  } else {
    const emptyPhotoGradient = ctx.createLinearGradient(splitBottom, 0, WIDTH, HEIGHT);
    emptyPhotoGradient.addColorStop(0, "#272331");
    emptyPhotoGradient.addColorStop(0.55, "#1b1922");
    emptyPhotoGradient.addColorStop(1, "#111017");
    ctx.fillStyle = emptyPhotoGradient;
    ctx.fillRect(splitBottom, 0, WIDTH - splitBottom, HEIGHT);
    ctx.fillStyle = "rgba(255,255,255,.34)";
    ctx.font = '700 46px Arial, "Apple SD Gothic Neo", sans-serif';
    ctx.fillText("경기 사진 업로드", 1120, 540);
  }
  ctx.restore();

  drawThemePanel(ctx, theme);

  const projectLogo = logoImages[project.logoUrl];
  const vikingsLogo = logoImages[VIKINGS_LOGO_URL];
  const opponentLogo = logoImages[opponent.logoUrl];

  // 대회 로고와 우리 팀 로고는 원형으로 자르지 않고 원본 비율 그대로 중앙에 그린다.
  if (projectLogo) drawContainImage(ctx, projectLogo, panelCenterX(155), 155, 230, 210);

  // 각 줄을 그 높이의 패널 중앙에 맞춘다. 글자 덩어리의 가운데가 기준이라
  // 기준선에서 글자 높이의 절반쯤 올린 위치로 계산한다.
  const lineCenterX = (baseline: number, size: number) => panelCenterX(baseline - size * 0.35);
  const lineMaxWidth = (baseline: number, size: number) => panelEdgeX(baseline - size * 0.35) - 96;

  // 두 줄은 같은 크기로 보이도록 더 작게 맞춰지는 쪽을 함께 쓴다.
  const titleSize = Math.min(
    fitSportFontSize(ctx, project.tournamentLine1, 76, lineMaxWidth(350, 76)),
    fitSportFontSize(ctx, project.tournamentLine2, 76, lineMaxWidth(438, 76)),
  );
  drawSportText(ctx, project.tournamentLine1, lineCenterX(350, titleSize), 350, titleSize);
  drawSportText(ctx, project.tournamentLine2, lineCenterX(438, titleSize), 438, titleSize);
  const stage = stageText || "[예선 4경기]";
  drawSportText(ctx, stage, lineCenterX(640, 88), 640, 88, "center", lineMaxWidth(640, 88));

  if (vikingsLogo) drawContainImage(ctx, vikingsLogo, 190, 865, 265, 265);
  ctx.save();
  ctx.font = `italic 900 84px ${CANVAS_FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,.34)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  // 우리 팀 로고(오른쪽 끝 ≈323)와 상대 로고 원(왼쪽 끝 ≈463) 사이 가운데.
  ctx.fillText("vs", 393, 895);
  ctx.restore();
  // 분할선(y=865 에서 x≈788)과 겹치지 않도록 상대팀 로고를 왼쪽으로 당긴다.
  if (opponentLogo) drawLogoCircle(ctx, opponentLogo, 598, 865, 250, true);
}

export default function ThumbnailStudio() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState<"home" | "editor">("home");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [openProjectMenuId, setOpenProjectMenuId] = useState<string | null>(null);
  const [showOpponentManager, setShowOpponentManager] = useState(false);
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [opponents, setOpponents] = useState<Opponent[]>(DEFAULT_OPPONENTS);
  const [selectedProjectId, setSelectedProjectId] = useState(DEFAULT_PROJECT.id);
  const [selectedOpponentId, setSelectedOpponentId] = useState(DEFAULT_OPPONENTS[0].id);
  const [theme, setTheme] = useState<TeamTheme>("men");
  const [stageText, setStageText] = useState("[5,6위 결정전]");
  const [gamePhoto, setGamePhoto] = useState<LoadedImage | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [projectLine1, setProjectLine1] = useState("대전광역시 플로어볼");
  const [projectLine2, setProjectLine2] = useState("챌린지컵 대회");
  const [projectLogoFile, setProjectLogoFile] = useState<File | null>(null);
  const [opponentName, setOpponentName] = useState("");
  const [opponentDivision, setOpponentDivision] = useState<Division>("both");
  const [opponentLogoFile, setOpponentLogoFile] = useState<File | null>(null);
  const [logoImages, setLogoImages] = useState<Record<string, HTMLImageElement>>({});
  const [fontsVersion, setFontsVersion] = useState(0);
  const [status, setStatus] = useState("준비 완료");

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? DEFAULT_PROJECT,
    [projects, selectedProjectId],
  );
  // 남자팀 테마에서는 남자부, 여자팀 테마에서는 여자부 상대팀만 고를 수 있게 한다.
  const visibleOpponents = useMemo(() => {
    const matching = opponents.filter((opponent) => opponent.division === "both" || opponent.division === theme);
    return matching.length ? matching : opponents;
  }, [opponents, theme]);
  const selectedOpponent = useMemo(
    () => visibleOpponents.find((opponent) => opponent.id === selectedOpponentId)
      ?? visibleOpponents[0]
      ?? DEFAULT_OPPONENTS[0],
    [selectedOpponentId, visibleOpponents],
  );

  const logoUrls = useMemo(() => {
    const urls = new Set([VIKINGS_LOGO_URL, selectedProject.logoUrl, selectedOpponent.logoUrl]);
    projects.forEach((project) => urls.add(project.logoUrl));
    opponents.forEach((opponent) => urls.add(opponent.logoUrl));
    return [...urls].filter(Boolean);
  }, [opponents, projects, selectedOpponent.logoUrl, selectedProject.logoUrl]);

  const refreshData = useCallback(async () => {
    try {
      const [projectRes, opponentRes] = await Promise.all([fetch("/api/projects"), fetch("/api/opponents")]);
      if (projectRes.ok) {
        const data = (await projectRes.json()) as { projects: Project[] };
        if (data.projects.length) {
          setProjects(data.projects);
          setSelectedProjectId((current) => data.projects.some((project) => project.id === current) ? current : data.projects[0].id);
        }
      }
      if (opponentRes.ok) {
        const data = (await opponentRes.json()) as { opponents: Array<Omit<Opponent, "division"> & { division?: Division }> };
        if (data.opponents.length) {
          const loaded = data.opponents.map((opponent) => ({ ...opponent, division: opponent.division ?? "both" }));
          setOpponents(loaded);
          setSelectedOpponentId((current) => loaded.some((opponent) => opponent.id === current) ? current : loaded[0].id);
        }
      }
    } catch {
      setStatus("로컬 샘플 데이터로 미리보기 중");
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      logoUrls.map(async (url) => {
        try {
          return [url, await loadImage(url)] as const;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setLogoImages(Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, HTMLImageElement]>));
    });
    return () => {
      cancelled = true;
    };
  }, [logoUrls]);

  // 웹폰트가 준비되기 전에 그리면 기기 기본 폰트로 한 번 그려진다.
  // 로드가 끝나면 버전을 올려 같은 문구를 제대로 된 굵기로 다시 그린다.
  useEffect(() => {
    const text = `${selectedProject.tournamentLine1}${selectedProject.tournamentLine2}${stageText}vs`;
    let cancelled = false;
    Promise.all([
      document.fonts.load(sportFont(76), text),
      document.fonts.load(`italic 900 84px ${CANVAS_FONT_STACK}`, "vs"),
    ])
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setFontsVersion((version) => version + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProject.tournamentLine1, selectedProject.tournamentLine2, stageText]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || view !== "editor") return;
    renderThumbnail({
      canvas,
      theme,
      project: selectedProject,
      opponent: selectedOpponent,
      stageText,
      gamePhoto: gamePhoto?.img,
      logoImages,
      zoom,
      offsetX,
      offsetY,
    });
  }, [fontsVersion, gamePhoto, logoImages, offsetX, offsetY, selectedOpponent, selectedProject, stageText, theme, view, zoom]);

  const uploadStoredImage = async (file: File, folder: string) => {
    const form = new FormData();
    const uploadFile = await compressLogoFile(file);
    form.append("file", uploadFile);
    form.append("folder", folder);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    if (!response.ok) {
      const detail = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(detail?.error ?? "이미지 업로드에 실패했습니다.");
    }
    const data = (await response.json()) as { url: string };
    return data.url;
  };

  const resetProjectForm = () => {
    setProjectName("");
    setProjectLine1("대전광역시 플로어볼");
    setProjectLine2("챌린지컵 대회");
    setProjectLogoFile(null);
    setEditingProjectId(null);
  };

  const openNewProjectForm = () => {
    if (showProjectForm && !editingProjectId) {
      setShowProjectForm(false);
      return;
    }
    resetProjectForm();
    setShowProjectForm(true);
    setOpenProjectMenuId(null);
  };

  const editProject = (project: Project) => {
    setEditingProjectId(project.id);
    setProjectName(project.name);
    setProjectLine1(project.tournamentLine1);
    setProjectLine2(project.tournamentLine2);
    setProjectLogoFile(null);
    setShowProjectForm(true);
    setOpenProjectMenuId(null);
    setStatus(`${project.name} 프로젝트를 수정 중입니다.`);
  };

  const saveProject = async (event: FormEvent) => {
    event.preventDefault();
    const editingProject = editingProjectId
      ? projects.find((project) => project.id === editingProjectId)
      : null;
    if (!projectName.trim() || (!projectLogoFile && !editingProject)) {
      setStatus("프로젝트명과 대회 로고를 입력하세요.");
      return;
    }
    try {
      setStatus("프로젝트 저장 중");
      const logoUrl = projectLogoFile
        ? await uploadStoredImage(projectLogoFile, "project-logos")
        : editingProject!.logoUrl;
      const projectPayload = {
        name: projectName.trim(),
        logoUrl,
        tournamentLine1: projectLine1,
        tournamentLine2: projectLine2,
      };
      const response = await fetch(editingProject ? `/api/projects/${editingProject.id}` : "/api/projects", {
        method: editingProject ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectPayload),
      });
      if (!response.ok) throw new Error("프로젝트 저장 실패");
      if (editingProject) {
        const updatedProject = { ...editingProject, ...projectPayload };
        setProjects((items) => items.map((project) => project.id === editingProject.id ? updatedProject : project));
        resetProjectForm();
        setShowProjectForm(false);
        setStatus("프로젝트 수정 완료");
        return;
      }
      const data = (await response.json()) as { project: Project };
      setProjects((items) => [data.project, ...items.filter((item) => item.id !== data.project.id)]);
      setSelectedProjectId(data.project.id);
      resetProjectForm();
      setShowProjectForm(false);
      setView("editor");
      setStatus("프로젝트 저장 완료");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "프로젝트 저장 실패");
    }
  };

  const deleteProject = async (project: Project) => {
    setOpenProjectMenuId(null);
    if (!window.confirm(`“${project.name}” 프로젝트를 삭제할까요?`)) return;
    try {
      setStatus("프로젝트 삭제 중");
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("프로젝트 삭제 실패");
      const remainingProjects = projects.filter((item) => item.id !== project.id);
      setProjects(remainingProjects);
      if (selectedProjectId === project.id) {
        setSelectedProjectId(remainingProjects[0]?.id ?? DEFAULT_PROJECT.id);
      }
      if (editingProjectId === project.id) {
        resetProjectForm();
        setShowProjectForm(false);
      }
      setStatus("프로젝트 삭제 완료");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "프로젝트 삭제 실패");
    }
  };

  const createOpponent = async (event: FormEvent) => {
    event.preventDefault();
    if (!opponentName.trim() || !opponentLogoFile) {
      setStatus("상대팀명과 로고를 입력하세요.");
      return;
    }
    try {
      setStatus("상대팀 저장 중");
      const logoUrl = await uploadStoredImage(opponentLogoFile, "opponent-logos");
      const response = await fetch("/api/opponents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: opponentName, logoUrl, circularFrame: true, division: opponentDivision }),
      });
      if (!response.ok) throw new Error("상대팀 저장 실패");
      const data = (await response.json()) as { opponent: Opponent };
      setOpponents((items) => [data.opponent, ...items.filter((item) => item.id !== data.opponent.id)]);
      setSelectedOpponentId(data.opponent.id);
      setOpponentName("");
      setOpponentDivision("both");
      setOpponentLogoFile(null);
      setStatus("상대팀 저장 완료");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "상대팀 저장 실패");
    }
  };

  const loadOpponentForEdit = (opponent: Opponent) => {
    setSelectedOpponentId(opponent.id);
    setOpponentName(opponent.name);
    setOpponentDivision(opponent.division);
    setOpponentLogoFile(null);
    setStatus("선택 상대팀을 편집 폼에 불러왔습니다.");
  };

  const updateSelectedOpponent = async () => {
    if (!opponentName.trim() && !opponentLogoFile) {
      setStatus("수정할 상대팀명 또는 로고를 입력하세요.");
      return;
    }
    try {
      setStatus("상대팀 수정 중");
      const logoUrl = opponentLogoFile
        ? await uploadStoredImage(opponentLogoFile, "opponent-logos")
        : selectedOpponent.logoUrl;
      const next: Opponent = {
        ...selectedOpponent,
        name: opponentName.trim() || selectedOpponent.name,
        logoUrl,
        circularFrame: true,
        division: opponentDivision,
      };
      const response = await fetch(`/api/opponents/${selectedOpponent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("상대팀 수정 실패");
      setOpponents((items) => items.map((item) => item.id === selectedOpponent.id ? next : item));
      setOpponentName("");
      setOpponentDivision("both");
      setOpponentLogoFile(null);
      setStatus("상대팀 수정 완료");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "상대팀 수정 실패");
    }
  };

  const deleteOpponent = async (id: string) => {
    const response = await fetch(`/api/opponents/${id}`, { method: "DELETE" });
    if (response.ok) {
      const next = opponents.filter((opponent) => opponent.id !== id);
      setOpponents(next.length ? next : DEFAULT_OPPONENTS);
      setSelectedOpponentId(next[0]?.id ?? DEFAULT_OPPONENTS[0].id);
      setStatus("상대팀 삭제 완료");
    }
  };

  const onGamePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const loaded = await readImageFromFile(file);
    if (gamePhoto) URL.revokeObjectURL(gamePhoto.src);
    setGamePhoto(loaded);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setStatus(`${file.name} 원본 bitmap 로드 완료`);
  };

  const downloadPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // 저장 직전에 다시 그리므로 웹폰트가 확실히 준비된 뒤에 그린다.
    await document.fonts.ready;
    renderThumbnail({
      canvas,
      theme,
      project: selectedProject,
      opponent: selectedOpponent,
      stageText,
      gamePhoto: gamePhoto?.img,
      logoImages,
      zoom,
      offsetX,
      offsetY,
    });
    const safeName = `${selectedProject.name}-${stageText || "thumbnail"}`.replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `${safeName}.png`;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      setStatus("PNG 생성에 실패했습니다.");
      return;
    }

    // iOS Safari 는 큰 data:/blob: 다운로드를 막기 때문에 공유 시트로 저장하게 한다.
    const file = new File([blob], fileName, { type: "image/png" });
    const canShareFile = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
    const isAppleMobile = /iP(hone|ad|od)/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    let saved = false;
    if (isAppleMobile && canShareFile) {
      try {
        await navigator.share({ files: [file], title: fileName });
        saved = true;
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          setStatus("저장을 취소했습니다.");
          return;
        }
      }
    }
    if (!saved) {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = fileName;
      link.href = objectUrl;
      link.rel = "noopener";
      document.body.append(link);
      link.click();
      link.remove();
      // 다운로드가 막힌 브라우저에서도 이미지를 길게 눌러 저장할 수 있도록 새 탭으로 띄운다.
      if (isAppleMobile) window.open(objectUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    }
    void fetch("/api/thumbnails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: selectedProject.id,
        opponentId: selectedOpponent.id,
        theme,
        stageText,
        photoName: gamePhoto?.fileName ?? null,
      }),
    });
    setStatus(saved ? "1920x1080 PNG 저장 완료" : "1920x1080 PNG 다운로드 생성 완료");
  };

  const openProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setView("editor");
    setStatus(`${project.name} 프로젝트를 열었습니다.`);
  };

  const goHome = () => {
    setView("home");
    setStatus("프로젝트 목록");
  };

  const opponentManager = (
    <section className="manager-panel" aria-label="상대팀 관리">
      <div className="section-title">
        <h2>상대팀 관리</h2>
        <button type="button" onClick={() => setShowOpponentManager(false)}>닫기</button>
      </div>
      <form className="control-grid" onSubmit={createOpponent}>
        <input value={opponentName} onChange={(event) => setOpponentName(event.target.value)} placeholder="상대팀명" />
        <select
          aria-label="상대팀 소속"
          value={opponentDivision}
          onChange={(event) => setOpponentDivision(event.target.value as Division)}
        >
          <option value="men">{DIVISION_LABELS.men}</option>
          <option value="women">{DIVISION_LABELS.women}</option>
          <option value="both">{DIVISION_LABELS.both}</option>
        </select>
        <label className="file-button">
          <span>{opponentLogoFile ? opponentLogoFile.name : "상대 로고"}</span>
          <input type="file" accept="image/*" onChange={(event) => setOpponentLogoFile(event.target.files?.[0] ?? null)} />
        </label>
        <button type="submit">상대팀 저장</button>
        <button type="button" onClick={updateSelectedOpponent}>수정 저장</button>
      </form>

      <div className="opponent-list">
        {opponents.map((opponent) => (
          <div key={opponent.id} className="opponent-row">
            <img src={opponent.logoUrl} alt="" />
            <span>{opponent.name}<em className="opponent-division"> · {DIVISION_LABELS[opponent.division]}</em></span>
            <div className="opponent-actions">
              <button type="button" onClick={() => loadOpponentForEdit(opponent)}>편집</button>
              <button type="button" onClick={() => deleteOpponent(opponent.id)}>삭제</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  if (view === "home") {
    return (
      <main className="home-shell">
        <header className="home-header">
          <div>
            <p className="eyebrow">SEOUL VIKINGS</p>
            <h1>경기 썸네일 스튜디오</h1>
            <p className="home-subtitle">대회를 선택하고 경기 썸네일을 만들어보세요.</p>
          </div>
          <div className="home-actions">
            <button type="button" onClick={() => setShowOpponentManager((value) => !value)}>상대팀 관리</button>
          </div>
        </header>

        {showOpponentManager ? opponentManager : null}

        <section className="project-gallery" aria-label="대회 프로젝트 목록">
          {projects.map((project) => (
            <article key={project.id} className="project-card-shell">
              <button className="project-card project-card-open" type="button" onClick={() => openProject(project)}>
                <img src={project.logoUrl} alt="" />
                <strong>{project.name}</strong>
                <span>{project.tournamentLine1}</span>
                <span>{project.tournamentLine2}</span>
              </button>
              <button
                className="project-menu-trigger"
                type="button"
                aria-label={`${project.name} 메뉴`}
                aria-expanded={openProjectMenuId === project.id}
                onClick={() => setOpenProjectMenuId((current) => current === project.id ? null : project.id)}
              >
                <span aria-hidden="true">•••</span>
              </button>
              {openProjectMenuId === project.id ? (
                <div className="project-menu" role="menu" aria-label={`${project.name} 관리`}>
                  <button type="button" role="menuitem" onClick={() => editProject(project)}>수정</button>
                  <button className="danger-action" type="button" role="menuitem" onClick={() => deleteProject(project)}>삭제</button>
                </div>
              ) : null}
            </article>
          ))}

          <button className="project-card create-card" type="button" onClick={openNewProjectForm}>
            <strong>+ 새 대회 프로젝트</strong>
            <span>대회 로고와 기본 문구를 저장</span>
          </button>
        </section>

        {showProjectForm ? (
          <form className="create-project-panel" onSubmit={saveProject}>
            <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="프로젝트명" />
            <input value={projectLine1} onChange={(event) => setProjectLine1(event.target.value)} placeholder="대회명 1줄" />
            <input value={projectLine2} onChange={(event) => setProjectLine2(event.target.value)} placeholder="대회명 2줄" />
            <label className="file-button">
              <span>{projectLogoFile ? projectLogoFile.name : editingProjectId ? "새 로고 선택 (선택)" : "대회 로고 업로드"}</span>
              <input type="file" accept="image/*" onChange={(event) => setProjectLogoFile(event.target.files?.[0] ?? null)} />
            </label>
            <button type="submit">{editingProjectId ? "수정 저장" : "프로젝트 만들기"}</button>
            {editingProjectId ? (
              <button className="secondary-action" type="button" onClick={() => { resetProjectForm(); setShowProjectForm(false); }}>취소</button>
            ) : null}
          </form>
        ) : null}

        <p className="status">{status}</p>
      </main>
    );
  }

  return (
    <main className={`studio-shell theme-${theme}`}>
      <section className="controls" aria-label="썸네일 설정">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Seoul Vikings</p>
            <h1>{selectedProject.name}</h1>
          </div>
          <button className="ghost-button" type="button" onClick={goHome}>프로젝트 목록</button>
        </div>

        <div className="control-block">
          <label>팀 테마</label>
          <div className="segmented">
            <button className={theme === "men" ? "active" : ""} type="button" onClick={() => setTheme("men")}>남자팀</button>
            <button className={theme === "women" ? "active" : ""} type="button" onClick={() => setTheme("women")}>여자팀</button>
          </div>
        </div>

        <div className="control-block">
          <label htmlFor="stage">경기명</label>
          <input id="stage" value={stageText} onChange={(event) => setStageText(event.target.value)} placeholder="[예선 4경기]" />
        </div>

        <div className="control-block">
          <label htmlFor="opponent">상대팀</label>
          <select id="opponent" value={selectedOpponent.id} onChange={(event) => setSelectedOpponentId(event.target.value)}>
            {visibleOpponents.map((opponent) => (
              <option key={opponent.id} value={opponent.id}>{opponent.name}</option>
            ))}
          </select>
        </div>

        <div className="control-block">
          <label className="file-button main-file">
            <span>오른쪽 경기 사진 업로드</span>
            <input type="file" accept="image/*" onChange={onGamePhotoChange} />
          </label>
        </div>

        <div className="slider-grid">
          <label>Zoom <input type="range" min="1" max="2.4" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
          <label>X <input type="range" min="-420" max="420" step="1" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} /></label>
          <label>Y <input type="range" min="-320" max="320" step="1" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} /></label>
        </div>

        <button className="download" type="button" onClick={downloadPng}>PNG 다운로드</button>
        <p className="status">{status}</p>
      </section>

      <section className="preview-wrap" aria-label="썸네일 미리보기">
        <div className="canvas-frame">
          <canvas ref={canvasRef} aria-label="1920x1080 썸네일 미리보기" />
        </div>
      </section>
    </main>
  );
}
