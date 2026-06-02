/** Safari / page chrome. theme-color is transparent so the iOS status-bar /
 *  toolbar strips reveal the shader behind them instead of a solid white bar.
 *  The white page background stays as the canvas fallback. */

let themeMeta: HTMLMetaElement | null = null;

export function applyPageChrome() {
  const root = document.documentElement;
  root.style.setProperty("--page-chrome", "#ffffff");
  root.style.background = "#ffffff";

  if (!themeMeta) {
    themeMeta = document.querySelector('meta[name="theme-color"]');
  }
  if (themeMeta) themeMeta.setAttribute("content", "transparent");
}
