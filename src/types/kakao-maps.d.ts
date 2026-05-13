export {};

type KakaoMapNode = HTMLElement;
type KakaoMapCallback = () => void;
type KakaoMapClickEvent = { latLng: KakaoLatLng };
type KakaoMapListener = (() => void) | ((event: KakaoMapClickEvent) => void);
type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};
type KakaoMap = {
  setCenter: (latLng: KakaoLatLng) => void;
};
type KakaoMarker = {
  setMap: (map: KakaoMap | null) => void;
  setPosition: (position: KakaoLatLng) => void;
};
type KakaoInfoWindow = {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
};
type KakaoPlaceSearchResult = {
  id: string;
  place_name: string;
  road_address_name?: string;
  address_name?: string;
  x: string;
  y: string;
};
type KakaoPlacesStatus = "OK" | "ZERO_RESULT" | "ERROR";

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (callback: KakaoMapCallback) => void;
        LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
        Map: new (
          container: KakaoMapNode,
          options: { center: KakaoLatLng; level: number },
        ) => KakaoMap;
        Marker: new (options: { map: KakaoMap; position: KakaoLatLng }) => KakaoMarker;
        InfoWindow: new (options: { content: string }) => KakaoInfoWindow;
        event: {
          addListener: (
            target: KakaoMarker | KakaoMap,
            eventName: string,
            listener: KakaoMapListener,
          ) => void;
        };
        services: {
          Status: {
            OK: "OK";
            ZERO_RESULT: "ZERO_RESULT";
            ERROR: "ERROR";
          };
          Places: new () => {
            keywordSearch: (
              keyword: string,
              callback: (
                result: KakaoPlaceSearchResult[],
                status: KakaoPlacesStatus,
              ) => void,
              options?: { category_group_code?: string; size?: number },
            ) => void;
          };
        };
      };
    };
  }
}
