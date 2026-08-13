"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type TeamTheme = "men" | "women";

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
};

type LoadedImage = {
  img: HTMLImageElement;
  src: string;
  fileName?: string;
};

const WIDTH = 1920;
const HEIGHT = 1080;
const DEFAULT_PROJECT: Project = {
  id: "jeju-open",
  name: "제주오픈대회",
  logoUrl: "/assets/jeju-open-logo.png",
  tournamentLine1: "제10회 제주오픈",
  tournamentLine2: "국제플로어볼대회",
};
const DEFAULT_OPPONENTS: Opponent[] = [
  { id: "incheon-sniper", name: "인천 스나이퍼", logoUrl: "/assets/incheon-sniper-logo.png", circularFrame: true },
  { id: "seoul-haechis", name: "서울 해치스", logoUrl: "/assets/seoul-haechis-logo.png", circularFrame: true },
  { id: "seoul-ares", name: "서울 아레스", logoUrl: "/assets/seoul-ares-logo.png", circularFrame: true },
  { id: "gyeryong-onekill-dragons", name: "계룡 원킬 드래곤즈", logoUrl: "/assets/gyeryong-onekill-dragons-logo.png", circularFrame: true },
  { id: "gwangju-team-leopard", name: "광주 Team-Leopard", logoUrl: "/assets/gwangju-team-leopard-logo.png", circularFrame: true },
  { id: "jeju-blue-dolphins", name: "제주 블루돌핀스", logoUrl: "/assets/jeju-blue-dolphins-logo.png", circularFrame: true },
  { id: "gangwon-blue-knights", name: "강원 블루나이츠", logoUrl: "/assets/gangwon-blue-knights-logo.png", circularFrame: true },
  { id: "jeonbuk-overflow", name: "전북 오버플로", logoUrl: "/assets/jeonbuk-overflow-logo.png", circularFrame: true },
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

function drawSportText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  align: CanvasTextAlign = "center",
) {
  ctx.save();
  ctx.font = `900 ${size}px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Arial Black", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.strokeStyle = "rgba(5, 5, 18, .3)";
  ctx.lineWidth = Math.max(3, size * 0.035);
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
  const splitTop = 900;
  const splitBottom = 760;
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

  const splitTop = 900;
  const splitBottom = 760;
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
  const vikingsLogo = logoImages["/assets/vikings-logo.png"];
  const opponentLogo = logoImages[opponent.logoUrl];

  if (projectLogo) drawLogoCircle(ctx, projectLogo, 445, 150, 190, false);
  drawSportText(ctx, project.tournamentLine1, 420, 350, 76);
  drawSportText(ctx, project.tournamentLine2, 420, 438, 76);
  drawSportText(ctx, stageText || "[예선 4경기]", 425, 640, 88);

  if (vikingsLogo) drawLogoCircle(ctx, vikingsLogo, 190, 865, 250, false);
  ctx.save();
  ctx.font = 'italic 900 84px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Arial Black", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,.34)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.fillText("vs", 365, 895);
  ctx.restore();
  if (opponentLogo) drawLogoCircle(ctx, opponentLogo, 640, 865, 250, true);
}

export default function ThumbnailStudio() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState<"home" | "editor">("home");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [openProjectMenuId, setOpenProjectMenuId] = useState<string | null>(null);
  const [showOpponentManager, setShowOpponentManager] = useState(false);
  const [projects, setProjects] = useState<Project[]>([DEFAULT_PROJECT]);
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
  const [projectLine1, setProjectLine1] = useState(DEFAULT_PROJECT.tournamentLine1);
  const [projectLine2, setProjectLine2] = useState(DEFAULT_PROJECT.tournamentLine2);
  const [projectLogoFile, setProjectLogoFile] = useState<File | null>(null);
  const [opponentName, setOpponentName] = useState("");
  const [opponentLogoFile, setOpponentLogoFile] = useState<File | null>(null);
  const [logoImages, setLogoImages] = useState<Record<string, HTMLImageElement>>({});
  const [status, setStatus] = useState("준비 완료");

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? DEFAULT_PROJECT,
    [projects, selectedProjectId],
  );
  const selectedOpponent = useMemo(
    () => opponents.find((opponent) => opponent.id === selectedOpponentId) ?? opponents[0] ?? DEFAULT_OPPONENTS[0],
    [opponents, selectedOpponentId],
  );

  const logoUrls = useMemo(() => {
    const urls = new Set(["/assets/vikings-logo.png", selectedProject.logoUrl, selectedOpponent.logoUrl]);
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
        const data = (await opponentRes.json()) as { opponents: Opponent[] };
        if (data.opponents.length) {
          setOpponents(data.opponents);
          setSelectedOpponentId((current) => data.opponents.some((opponent) => opponent.id === current) ? current : data.opponents[0].id);
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
  }, [gamePhoto, logoImages, offsetX, offsetY, selectedOpponent, selectedProject, stageText, theme, view, zoom]);

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
    setProjectLine1(DEFAULT_PROJECT.tournamentLine1);
    setProjectLine2(DEFAULT_PROJECT.tournamentLine2);
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
        body: JSON.stringify({ name: opponentName, logoUrl, circularFrame: true }),
      });
      if (!response.ok) throw new Error("상대팀 저장 실패");
      const data = (await response.json()) as { opponent: Opponent };
      setOpponents((items) => [data.opponent, ...items.filter((item) => item.id !== data.opponent.id)]);
      setSelectedOpponentId(data.opponent.id);
      setOpponentName("");
      setOpponentLogoFile(null);
      setStatus("상대팀 저장 완료");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "상대팀 저장 실패");
    }
  };

  const loadOpponentForEdit = (opponent: Opponent) => {
    setSelectedOpponentId(opponent.id);
    setOpponentName(opponent.name);
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
      const next = {
        ...selectedOpponent,
        name: opponentName.trim() || selectedOpponent.name,
        logoUrl,
        circularFrame: true,
      };
      const response = await fetch(`/api/opponents/${selectedOpponent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("상대팀 수정 실패");
      setOpponents((items) => items.map((item) => item.id === selectedOpponent.id ? next : item));
      setOpponentName("");
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
    const link = document.createElement("a");
    const safeName = `${selectedProject.name}-${stageText || "thumbnail"}`.replace(/[\\/:*?"<>|]/g, "_");
    link.download = `${safeName}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
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
    setStatus("1920x1080 PNG 다운로드 생성 완료");
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
            <span>{opponent.name}</span>
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
            {opponents.map((opponent) => (
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
