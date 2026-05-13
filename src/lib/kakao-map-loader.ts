"use client";

const KAKAO_MAP_SCRIPT_ID = "kakao-map-sdk";

export function loadKakaoMapSdk(appKey: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.kakao?.maps?.services) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(KAKAO_MAP_SCRIPT_ID);

    if (existingScript) {
      const scriptElement = existingScript as HTMLScriptElement;

      if (scriptElement.dataset.loaded === "true") {
        scriptElement.remove();
        delete window.kakao;
      } else {
        existingScript.addEventListener("load", () => {
          scriptElement.dataset.loaded = "true";

          if (window.kakao?.maps?.services) {
            resolve();
            return;
          }

          scriptElement.remove();
          delete window.kakao;
          loadKakaoMapSdk(appKey).then(resolve).catch(reject);
        }, { once: true });
        existingScript.addEventListener("error", reject, { once: true });
        return;
      }
    }

    const existingLoadedScript = document.querySelector<HTMLScriptElement>(
      'script[src*="dapi.kakao.com/v2/maps/sdk.js"]',
    );

    if (existingLoadedScript) {
      existingLoadedScript.remove();
      delete window.kakao;
    }

    const script = document.createElement("script");
    script.id = KAKAO_MAP_SCRIPT_ID;
    script.async = true;
    script.dataset.loaded = "false";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}&autoload=false&libraries=services`;
    script.onload = () => {
      script.dataset.loaded = "true";

      if (window.kakao?.maps) {
        resolve();
        return;
      }

      reject(new Error("Kakao Maps SDK loaded without maps namespace."));
    };
    script.onerror = () => {
      reject(new Error("Kakao Maps SDK failed to load."));
    };
    document.head.appendChild(script);
  });
}
