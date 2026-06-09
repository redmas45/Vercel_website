(() => {
  console.info("[lab] injection.js loaded");

  if (document.querySelector('script[data-shopbot-loader="1"]')) {
    return;
  }

  const script = document.createElement("script");
  script.src = "/api/shopbot.js";
  script.async = true;
  script.defer = true;
  script.dataset.shopbotLoader = "1";

  script.onload = () => console.info("[lab] shopbot loader attached");
  script.onerror = (err) => console.error("[lab] shopbot loader failed", err);

  document.head.appendChild(script);
})();
