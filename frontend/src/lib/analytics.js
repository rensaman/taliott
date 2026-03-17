export function track(event, props) {
  window.umami?.track(event, props);
}
