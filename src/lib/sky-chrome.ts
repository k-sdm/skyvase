/** Approximate sky colours for page chrome (Safari URL bar, html background). */

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function rgb(r: number, g: number, b: number) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function rgbToHex(r: number, g: number, b: number) {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** t = 0 winter solstice sky, t = 1 summer solstice sky (matches page dateToT). */
export function skyChromeFromT(t: number) {
  const topR = lerp(38, 118, t);
  const topG = lerp(52, 168, t);
  const topB = lerp(82, 198, t);
  const botR = lerp(12, 42, t);
  const botG = lerp(18, 72, t);
  const botB = lerp(38, 108, t);

  const top = rgbToHex(topR, topG, topB);
  const bottom = rgbToHex(botR, botG, botB);
  const gradient = `linear-gradient(180deg, ${rgb(topR, topG, topB)} 0%, ${rgb(botR, botG, botB)} 100%)`;

  return { top, bottom, gradient };
}

let themeMeta: HTMLMetaElement | null = null;

export function applySkyChrome(t: number) {
  const { top, bottom, gradient } = skyChromeFromT(t);
  const root = document.documentElement;
  root.style.setProperty("--sky-chrome-top", top);
  root.style.setProperty("--sky-chrome-bottom", bottom);
  root.style.setProperty("--sky-chrome-gradient", gradient);
  root.style.background = gradient;

  if (!themeMeta) {
    themeMeta = document.querySelector('meta[name="theme-color"]');
  }
  if (themeMeta) themeMeta.setAttribute("content", top);
}

export function applyWhiteChrome() {
  const root = document.documentElement;
  root.style.setProperty("--sky-chrome-gradient", "#ffffff");
  root.style.background = "#ffffff";
  if (!themeMeta) {
    themeMeta = document.querySelector('meta[name="theme-color"]');
  }
  if (themeMeta) themeMeta.setAttribute("content", "#ffffff");
}
