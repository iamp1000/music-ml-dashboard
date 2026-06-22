import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";
import * as THREE from "three";

export function initLanding() {
  if (typeof window === "undefined") return () => {};

  gsap.registerPlugin(ScrollTrigger);

  const loadingScreen = document.querySelector("[data-loading-screen]");
  const loadingBar = document.querySelector("[data-loading-bar]");
  const loadingValue = document.querySelector("[data-loading-value]");
  const progressFill = document.querySelector("[data-progress-fill]");
  const hero = document.querySelector("[data-hero]");
  const heroMedia = document.querySelector("[data-hero-media]");
  const heroTitle = document.querySelector("[data-pretext-title]");
  const canvas = document.querySelector("[data-webgl-canvas]");
  if (!canvas) return () => {}; // wait until mounted
  const revealElements = gsap.utils.toArray(".reveal");
  const balancedTextElements = gsap.utils.toArray("[data-pretext-balance]");
  const rotatorElements = gsap.utils.toArray("[data-pretext-rotator]");
  const playgroundElements = gsap.utils.toArray("[data-pretext-playground]");

let scrollProgress = 0;
let titleLoopTimeline;
let heroChars = [];
let pretextRevealTweens = [];
let pretextRotatorTimelines = [];
let pretextPlaygrounds = [];
const titlePointer = {
  x: 0,
  y: 0,
  active: false,
};

const titlePhrases = [
  {
    text: "Boundaries shaped like architecture.",
    accentLine: "last",
  },
  {
    text: "Privacy sculpted in bronze light.",
    accentLine: "last",
  },
];

function getPretextMetrics(element) {
  const computed = window.getComputedStyle(element);

  return {
    font: `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`,
    lineHeight:
      Number.parseFloat(computed.lineHeight) ||
      Number.parseFloat(computed.fontSize) * 0.92,
    maxWidth: element.clientWidth,
  };
}

function appendCharacterSpans(container, text) {
  Array.from(text).forEach((character) => {
    const characterElement = document.createElement("span");
    characterElement.className = "hero-char";

    if (character === " ") {
      characterElement.classList.add("space");
      characterElement.innerHTML = "&nbsp;";
    } else {
      characterElement.textContent = character;
    }

    container.append(characterElement);
  });
}

function createPretextLine(text) {
  const lineElement = document.createElement("span");
  lineElement.className = "pretext-line";
  lineElement.textContent = text.trim();
  return lineElement;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function positionOrb(orb) {
  orb.element.style.transform = `translate3d(${orb.x - orb.radius}px, ${orb.y - orb.radius}px, 0)`;
}

function resetPretextAnimations() {
  pretextRevealTweens.forEach((tween) => {
    tween.scrollTrigger?.kill();
    tween.kill();
  });
  pretextRotatorTimelines.forEach((timeline) => timeline.kill());
  pretextRevealTweens = [];
  pretextRotatorTimelines = [];
  pretextPlaygrounds = [];
}

function buildBalancedTextBlocks() {
  balancedTextElements.forEach((element) => {
    const source =
      element.dataset.pretextSource ||
      element.textContent.replace(/\s+/g, " ").trim();
    const { font, lineHeight, maxWidth } = getPretextMetrics(element);

    element.dataset.pretextSource = source;
    element.textContent = "";

    if (!maxWidth) return;

    const prepared = prepareWithSegments(source, font);
    const { lines, height } = layoutWithLines(prepared, maxWidth, lineHeight);
    const inner = document.createElement("span");
    inner.className = "pretext-balance-inner";

    lines.forEach((line) => {
      inner.append(createPretextLine(line.text));
    });

    element.append(inner);
    element.style.minHeight = `${height}px`;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const tween = gsap.fromTo(
      inner.children,
      {
        opacity: 0,
        yPercent: 105,
        rotateX: -28,
      },
      {
        opacity: 1,
        yPercent: 0,
        rotateX: 0,
        duration: 1.05,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: element,
          start: "top 82%",
          toggleActions: "play none none none",
        },
      }
    );

    pretextRevealTweens.push(tween);
  });
}

function buildPretextRotators() {
  rotatorElements.forEach((element) => {
    const phrases = (element.dataset.pretextPhrases || "")
      .split("||")
      .map((phrase) => phrase.trim())
      .filter(Boolean);

    if (!phrases.length) return;

    const srOnly = document.createElement("span");
    srOnly.className = "hero-title-sr";
    srOnly.textContent = phrases[0];

    const { font, lineHeight, maxWidth } = getPretextMetrics(element);
    element.textContent = "";
    element.append(srOnly);

    if (!maxWidth) return;

    const layers = [];
    const layerHeights = [];

    phrases.forEach((phrase) => {
      const prepared = prepareWithSegments(phrase, font);
      const { lines, height } = layoutWithLines(prepared, maxWidth, lineHeight);
      const layer = document.createElement("span");
      layer.className = "pretext-rotator-layer";
      layer.setAttribute("aria-hidden", "true");

      lines.forEach((line) => {
        layer.append(createPretextLine(line.text));
      });

      element.append(layer);
      layers.push(layer);
      layerHeights.push(height);
    });

    element.style.height = `${Math.max(...layerHeights)}px`;

    gsap.set(layers, { opacity: 0, yPercent: 14, filter: "blur(10px)" });
    gsap.set(layers[0], { opacity: 1, yPercent: 0, filter: "blur(0px)" });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timeline = gsap.timeline({
      repeat: -1,
      defaults: {
        duration: 2.4,
        ease: "sine.inOut",
      },
    });

    layers.forEach((layer, index) => {
      const nextLayer = layers[(index + 1) % layers.length];

      timeline
        .to({}, { duration: 2.8 })
        .to(
          layer,
          {
            opacity: 0,
            yPercent: -8,
            filter: "blur(14px)",
          },
          "<"
        )
        .to(
          nextLayer,
          {
            opacity: 1,
            yPercent: 0,
            filter: "blur(0px)",
          },
          "<"
        );
    });

    pretextRotatorTimelines.push(timeline);
  });
}

function buildPretextTitle() {
  if (!heroTitle) return;

  heroTitle.textContent = "";

  const srOnly = document.createElement("span");
  srOnly.className = "hero-title-sr";
  srOnly.textContent = titlePhrases[0].text;
  heroTitle.append(srOnly);

  const glow = document.createElement("div");
  glow.className = "hero-title-glow";
  heroTitle.append(glow);

  const { font, lineHeight, maxWidth } = getPretextMetrics(heroTitle);

  if (!maxWidth) return;

  const layerHeights = [];
  const layers = [];

  titlePhrases.forEach((phrase, phraseIndex) => {
    const prepared = prepareWithSegments(phrase.text, font);
    const { lines, height } = layoutWithLines(prepared, maxWidth, lineHeight);

    const layer = document.createElement("div");
    layer.className = "hero-title-layer";
    layer.dataset.phrase = String(phraseIndex);

    lines.forEach((line, lineIndex) => {
      const lineElement = document.createElement("span");
      lineElement.className = "hero-title-line";
      appendCharacterSpans(lineElement, line.text.trim());

      if (
        phrase.accentLine === "last" &&
        lineIndex === lines.length - 1
      ) {
        lineElement.classList.add("accent");
      } else if (phraseIndex === 1) {
        lineElement.classList.add("soft");
      }

      layer.append(lineElement);
    });

    heroTitle.append(layer);
    layers.push(layer);
    layerHeights.push(height);
  });

  heroTitle.style.height = `${Math.max(...layerHeights)}px`;
  heroChars = Array.from(heroTitle.querySelectorAll(".hero-char")).map((element, index) => ({
    element,
    index,
    seed: (index % 11) * 0.37 + (index % 5) * 0.19,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    skewX: 0,
    opacity: 1,
  }));

  gsap.set(layers[0], { opacity: 1, yPercent: 0, filter: "blur(0px)" });
  gsap.set(layers[1], { opacity: 0, yPercent: 18, filter: "blur(12px)" });
  gsap.set(glow, { opacity: 0.45, scale: 0.95 });

  titleLoopTimeline?.kill();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  titleLoopTimeline = gsap.timeline({
    repeat: -1,
    defaults: {
      duration: 1.8,
      ease: "sine.inOut",
    },
  });

  titleLoopTimeline
    .to({}, { duration: 5.2 })
    .to(
      layers[0],
      {
        opacity: 0.18,
        yPercent: -6,
        filter: "blur(8px)",
      },
      "<"
    )
    .to(
      layers[1],
      {
        opacity: 1,
        yPercent: 0,
        filter: "blur(0px)",
      },
      "<"
    )
    .to(
      glow,
      {
        opacity: 0.72,
        scale: 1.02,
      },
      "<"
    )
    .to({}, { duration: 5.2 })
    .to(
      layers[1],
      {
        opacity: 0,
        yPercent: 8,
        filter: "blur(8px)",
      },
      "<"
    )
    .to(
      layers[0],
      {
        opacity: 1,
        yPercent: 0,
        filter: "blur(0px)",
      },
      "<"
    )
    .to(
      glow,
      {
        opacity: 0.45,
        scale: 0.95,
      },
      "<"
    );
}

function buildPretextPlaygrounds() {
  pretextPlaygrounds = playgroundElements
    .map((element) => {
      const stage = element.querySelector("[data-pretext-stage]");
      const copy = element.querySelector("[data-pretext-copy]");
      const source = (element.dataset.pretextPlaygroundText || "").trim();

      if (!stage || !copy || !source) return null;

      const { font, lineHeight, maxWidth } = getPretextMetrics(copy);
      copy.textContent = "";

      if (!maxWidth) return null;

      const prepared = prepareWithSegments(source, font);
      const { lines, height } = layoutWithLines(prepared, maxWidth, lineHeight);
      copy.style.height = `${height}px`;

      const lineStates = lines.map((line, index) => {
        const lineElement = createPretextLine(line.text);
        lineElement.classList.add("pretext-playground-line");
        lineElement.style.top = `${index * lineHeight}px`;
        copy.append(lineElement);

        return {
          element: lineElement,
          baseY: index * lineHeight,
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          blur: 0,
          opacity: 1,
        };
      });

      const width = stage.clientWidth;
      const heightPx = stage.clientHeight;
      const copyLeft = copy.offsetLeft;
      const copyTop = copy.offsetTop;
      const copyWidth = copy.clientWidth;
      const orbElements = Array.from(element.querySelectorAll("[data-pretext-orb]"));

      const orbs = orbElements.map((orbElement, index) => {
        const radius = orbElement.offsetWidth / 2;
        const anchorX = width * (index === 0 ? 0.28 : 0.74);
        const anchorY = heightPx * (index === 0 ? 0.34 : 0.72);
        const orb = {
          element: orbElement,
          index,
          radius,
          x: anchorX,
          y: anchorY,
          targetX: anchorX,
          targetY: anchorY,
          anchorX,
          anchorY,
          floatPhase: index * 1.7 + 0.8,
          dragging: false,
          pointerId: null,
          dragOffsetX: 0,
          dragOffsetY: 0,
        };

        positionOrb(orb);
        return orb;
      });

      const playground = {
        element,
        stage,
        copy,
        lineStates,
        lineHeight,
        width,
        height: heightPx,
        copyLeft,
        copyTop,
        copyWidth,
        orbs,
      };

      orbs.forEach((orb) => {
        orb.element.onpointerdown = (event) => {
          event.preventDefault();
          const stageRect = stage.getBoundingClientRect();
          orb.dragging = true;
          orb.pointerId = event.pointerId;
          orb.dragOffsetX = event.clientX - stageRect.left - orb.targetX;
          orb.dragOffsetY = event.clientY - stageRect.top - orb.targetY;
          orb.element.setPointerCapture(event.pointerId);
        };

        orb.element.onpointermove = (event) => {
          if (!orb.dragging || event.pointerId !== orb.pointerId) return;

          const stageRect = stage.getBoundingClientRect();
          orb.targetX = clamp(
            event.clientX - stageRect.left - orb.dragOffsetX,
            orb.radius,
            playground.width - orb.radius
          );
          orb.targetY = clamp(
            event.clientY - stageRect.top - orb.dragOffsetY,
            orb.radius,
            playground.height - orb.radius
          );
        };

        const releaseOrb = () => {
          if (!orb.dragging) return;
          orb.dragging = false;
          orb.pointerId = null;
          orb.anchorX = orb.targetX;
          orb.anchorY = orb.targetY;
        };

        orb.element.onpointerup = releaseOrb;
        orb.element.onpointercancel = releaseOrb;
      });

      return playground;
    })
    .filter(Boolean);
}

function updatePretextPlaygrounds(elapsed) {
  if (!pretextPlaygrounds.length) return;

  pretextPlaygrounds.forEach((playground, playgroundIndex) => {
    playground.orbs.forEach((orb) => {
      const destinationX = orb.dragging
        ? orb.targetX
        : orb.anchorX + Math.sin(elapsed * 0.85 + orb.floatPhase + playgroundIndex) * 16;
      const destinationY = orb.dragging
        ? orb.targetY
        : orb.anchorY + Math.cos(elapsed * 1.05 + orb.floatPhase) * 12;

      orb.x += (destinationX - orb.x) * (orb.dragging ? 0.34 : 0.1);
      orb.y += (destinationY - orb.y) * (orb.dragging ? 0.34 : 0.1);
      positionOrb(orb);
    });

    playground.lineStates.forEach((line, index) => {
      const lineCenterY = playground.copyTop + line.baseY + playground.lineHeight / 2;
      const lineCenterX = playground.copyLeft + playground.copyWidth * 0.5;

      let targetX = 0;
      let targetY = 0;
      let targetRotation = 0;
      let targetScale = 1;
      let targetBlur = 0;
      let targetOpacity = 1;

      playground.orbs.forEach((orb) => {
        const dy = lineCenterY - orb.y;
        const influence = Math.max(0, 1 - Math.abs(dy) / 118);
        const horizontalBias = lineCenterX >= orb.x ? 1 : -1;
        const orbitalWave = Math.sin(elapsed * 3.1 + index * 0.52 + orb.floatPhase);
        const rippleWave = Math.sin(elapsed * 5.4 + dy * 0.05 + orb.index * 1.4);

        targetX += horizontalBias * influence * (24 + orbitalWave * 11);
        targetY += rippleWave * influence * 6;
        targetRotation += (horizontalBias * 3.4 - dy * 0.024) * influence;
        targetScale += influence * 0.03;
        targetBlur = Math.max(targetBlur, influence * 1.6);
        targetOpacity = Math.min(targetOpacity, 1 - influence * 0.12);
      });

      line.x += (targetX - line.x) * 0.12;
      line.y += (targetY - line.y) * 0.12;
      line.rotation += (targetRotation - line.rotation) * 0.12;
      line.scale += (targetScale - line.scale) * 0.12;
      line.blur += (targetBlur - line.blur) * 0.12;
      line.opacity += (targetOpacity - line.opacity) * 0.12;

      line.element.style.transform = `translate3d(${line.x}px, ${line.y}px, 0) rotate(${line.rotation}deg) scale(${line.scale})`;
      line.element.style.filter = `blur(${line.blur}px)`;
      line.element.style.opacity = `${line.opacity}`;
    });
  });
}

function updateTitleRipple(elapsed) {
  if (!heroChars.length) return;

  heroChars.forEach((character) => {
    const rect = character.element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(titlePointer.x - centerX, titlePointer.y - centerY);
    const influence =
      titlePointer.active && distance < 180
        ? 1 - distance / 180
        : 0;
    const primaryWave = Math.sin(distance * 0.11 - elapsed * 6.2 + character.seed);
    const secondaryWave = Math.sin(distance * 0.21 - elapsed * 11.6 + character.index * 0.45);
    const breakPulse = Math.sign(
      Math.sin(distance * 0.18 - elapsed * 14.2 + character.seed * 3.4)
    );
    const targetY = -(primaryWave * 12 + secondaryWave * 9 + breakPulse * 4) * influence;
    const targetX =
      (Math.cos(distance * 0.07 - elapsed * 4.6 + character.seed) * 5 +
        breakPulse * 2.6) *
      influence;
    const targetScale = 1 + influence * 0.24 + Math.abs(secondaryWave) * influence * 0.06;
    const targetRotation = (primaryWave * 7 + breakPulse * 5) * influence;
    const targetSkewX = secondaryWave * 12 * influence;
    const targetOpacity = 0.62 + influence * 0.38;

    character.x += (targetX - character.x) * 0.14;
    character.y += (targetY - character.y) * 0.14;
    character.scale += (targetScale - character.scale) * 0.14;
    character.rotation += (targetRotation - character.rotation) * 0.14;
    character.skewX += (targetSkewX - character.skewX) * 0.14;
    character.opacity += (targetOpacity - character.opacity) * 0.14;

    character.element.style.transform = `translate3d(${character.x}px, ${character.y}px, 0) rotate(${character.rotation}deg) skewX(${character.skewX}deg) scale(${character.scale})`;
    character.element.style.opacity = `${character.opacity}`;
  });
}

const loadingTween = gsap.to(
  { value: 0 },
  {
    value: 100,
    duration: 1.3,
    ease: "power2.out",
    onUpdate() {
      const value = Math.round(this.targets()[0].value);
      loadingBar.style.width = `${value}%`;
      loadingValue.textContent = `${value}%`;
    },
    onComplete() {
      gsap.to(loadingScreen, {
        autoAlpha: 0,
        duration: 0.55,
        ease: "power2.out",
        pointerEvents: "none",
      });
    },
  }
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, window.innerWidth < 768 ? 8 : 5.6);

const ambient = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambient);

const rimLight = new THREE.PointLight(0xc7925c, 1.5, 18);
rimLight.position.set(4, 2, 4);
scene.add(rimLight);

const accentLight = new THREE.PointLight(0xe8cb96, 1.1, 14);
accentLight.position.set(-4, -1, 3);
scene.add(accentLight);

const heroOrb = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.15, 10),
  new THREE.MeshPhysicalMaterial({
    color: 0xc58d5b,
    emissive: 0x3a2412,
    emissiveIntensity: 0.18,
    roughness: 0.26,
    metalness: 0.22,
    wireframe: true,
    transparent: true,
    opacity: 0.72,
  })
);
heroOrb.position.set(1.2, 0.2, 0);
scene.add(heroOrb);

const halo = new THREE.Mesh(
  new THREE.TorusGeometry(1.75, 0.04, 16, 160),
  new THREE.MeshBasicMaterial({
    color: 0xe8cb96,
    transparent: true,
    opacity: 0.8,
  })
);
halo.rotation.x = Math.PI / 2;
scene.add(halo);

const starsGeometry = new THREE.BufferGeometry();
const starCount = 900;
const starPositions = new Float32Array(starCount * 3);

for (let i = 0; i < starCount; i += 1) {
  const i3 = i * 3;
  starPositions[i3] = (Math.random() - 0.5) * 18;
  starPositions[i3 + 1] = (Math.random() - 0.5) * 12;
  starPositions[i3 + 2] = (Math.random() - 0.5) * 10;
}

starsGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(starPositions, 3)
);

const stars = new THREE.Points(
  starsGeometry,
  new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.03,
    transparent: true,
    opacity: 0.7,
  })
);
scene.add(stars);

gsap.to(progressFill, {
  scaleX: 1,
  ease: "none",
  scrollTrigger: {
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    scrub: 0.35,
  },
});

gsap.to(hero, {
  scale: 0.82,
  rotation: -6,
  y: 140,
  ease: "none",
  scrollTrigger: {
    trigger: hero,
    start: "top top",
    end: "bottom top",
    scrub: 1,
    pin: true,
  },
});

gsap.to(heroMedia, {
  y: 90,
  rotation: 4,
  ease: "none",
  scrollTrigger: {
    trigger: hero,
    start: "top top",
    end: "bottom top",
    scrub: 1.15,
  },
});

revealElements.forEach((element, index) => {
  gsap.fromTo(
    element,
    {
      x: index % 2 === 0 ? -80 : 80,
      scale: 0.88,
      rotation: index % 2 === 0 ? 10 : -10,
      opacity: 0,
      y: 40,
    },
    {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      duration: 1.05,
      ease: "power3.out",
      scrollTrigger: {
        trigger: element,
        start: "top 82%",
        end: "top 35%",
        scrub: 1,
      },
    }
  );
});

ScrollTrigger.create({
  trigger: ".content-container",
  start: "top top",
  end: "bottom bottom",
  scrub: 1.5,
  onUpdate: (self) => {
    scrollProgress = self.progress;
  },
});

const pointer = { x: 0, y: 0 };
window.addEventListener("mousemove", (event) => {
  pointer.x = (event.clientX / window.innerWidth - 0.5) * 1.1;
  pointer.y = (event.clientY / window.innerHeight - 0.5) * 0.8;
});

heroTitle?.addEventListener("pointermove", (event) => {
  titlePointer.x = event.clientX;
  titlePointer.y = event.clientY;
  titlePointer.active = true;
});

heroTitle?.addEventListener("pointerleave", () => {
  titlePointer.active = false;
});

function resizeScene() {
  resetPretextAnimations();
  buildBalancedTextBlocks();
  buildPretextRotators();
  buildPretextPlaygrounds();
  buildPretextTitle();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.position.z = window.innerWidth < 768 ? 8 : 5.6;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  ScrollTrigger.refresh();
}

window.addEventListener("resize", resizeScene);

const clock = new THREE.Clock();

let rafId;
function render() {
  const elapsed = clock.getElapsedTime();

  updatePretextPlaygrounds(elapsed);
  updateTitleRipple(elapsed);

  heroOrb.rotation.x = 0.45 + scrollProgress * Math.PI * 1.2 + elapsed * 0.12;
  heroOrb.rotation.y = elapsed * 0.2 + scrollProgress * Math.PI * 0.8;
  heroOrb.position.y = Math.sin(elapsed * 1.2) * 0.12 - scrollProgress * 0.7;
  heroOrb.position.x = 1.2 + pointer.x * 0.7;

  halo.rotation.z = elapsed * 0.3 + scrollProgress * Math.PI * 0.9;
  halo.position.x += (pointer.x * 0.5 - halo.position.x) * 0.05;
  halo.position.y += (-pointer.y * 0.5 - scrollProgress * 0.45 - halo.position.y) * 0.05;

  stars.rotation.y = elapsed * 0.02 + scrollProgress * 0.28;
  stars.position.y = -scrollProgress * 0.8;

  camera.position.x += (pointer.x * 0.35 - camera.position.x) * 0.03;
  camera.position.y += (-pointer.y * 0.25 - scrollProgress * 0.18 - camera.position.y) * 0.03;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  rafId = requestAnimationFrame(render);
}

buildBalancedTextBlocks();
buildPretextRotators();
buildPretextPlaygrounds();
buildPretextTitle();
render();

return () => {
  cancelAnimationFrame(rafId);
  if (loadingTween) loadingTween.kill();
  if (titleLoopTimeline) titleLoopTimeline.kill();
  resetPretextAnimations();
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  window.removeEventListener("resize", resizeScene);
  // dispose threejs context
  renderer.dispose();
};
}
