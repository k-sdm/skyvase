/** Safari / page chrome — kept white on sky and vase for consistency. */

let themeMeta: HTMLMetaElement | null = null;

export function applyPageChrome() {
  const root = document.documentElement;
  root.style.setProperty("--page-chrome", "#ffffff");
  root.style.background = "#ffffff";

  if (!themeMeta) {
    themeMeta = document.querySelector('meta[name="theme-color"]');
  }
  if (themeMeta) themeMeta.setAttribute("content", "#ffffff");
}
