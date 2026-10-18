import { createElement, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { GeoCoords } from '../models/report';
import { colors, radii } from '../theme';

type Props = {
  coords?: GeoCoords;
  onPick: (coords: GeoCoords) => void;
};

const LAHORE = { lat: 31.5204, lng: 74.3587 };

function parsePick(raw: string): GeoCoords | null {
  try {
    const payload = JSON.parse(raw) as { type?: string; lat?: number; lng?: number };
    if (payload?.type !== 'pickLocation') return null;
    const { lat, lng } = payload;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

function buildMapHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #D7E4E8; }
    .leaflet-container { font: 12px/1.4 system-ui, sans-serif; }
    .pin {
      width: 18px;
      height: 18px;
      background: #E24B4A;
      border: 2px solid #fff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(15, 58, 67, 0.35);
    }
    #hint {
      position: absolute;
      z-index: 500;
      left: 12px;
      right: 12px;
      bottom: 12px;
      background: rgba(255,255,255,0.94);
      color: #13262C;
      padding: 8px 12px;
      border-radius: 10px;
      font: 600 13px/1.3 system-ui, sans-serif;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(15,58,67,0.12);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="hint">Tap the map to drop a pin</div>
  <script>
    (function () {
      if (!window.ReactNativeWebView) {
        window.ReactNativeWebView = {
          postMessage: function (data) {
            window.parent.postMessage(data, '*');
          }
        };
      }

      var map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      }).setView([${LAHORE.lat}, ${LAHORE.lng}], 12);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      var icon = L.divIcon({
        className: '',
        html: '<div class="pin"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 18],
      });
      var marker = null;

      function postPick(lat, lng) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'pickLocation', lat: lat, lng: lng })
        );
      }

      function setPin(lat, lng, pan) {
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng], { icon: icon }).addTo(map);
        if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: false });
      }

      map.on('click', function (e) {
        setPin(e.latlng.lat, e.latlng.lng, false);
        postPick(e.latlng.lat, e.latlng.lng);
      });

      window.__rahscanSetPin = function (lat, lng) {
        if (typeof lat !== 'number' || typeof lng !== 'number') return;
        setPin(lat, lng, true);
      };
    })();
  </script>
</body>
</html>`;
}

function pushPin(target: { __rahscanSetPin?: (lat: number, lng: number) => void } | null | undefined, coords?: GeoCoords) {
  if (!target || !coords || typeof target.__rahscanSetPin !== 'function') return;
  target.__rahscanSetPin(coords.lat, coords.lng);
}

function WebLocationPicker({ coords, onPick, html }: Props & { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const onPickRef = useRef(onPick);
  const coordsRef = useRef(coords);
  onPickRef.current = onPick;
  coordsRef.current = coords;

  useEffect(() => {
    const onWindowMessage = (event: MessageEvent) => {
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      const raw = typeof event.data === 'string' ? event.data : null;
      if (!raw) return;
      const picked = parsePick(raw);
      if (picked) onPickRef.current(picked);
    };
    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
  }, []);

  useEffect(() => {
    if (!readyRef.current) return;
    const win = iframeRef.current?.contentWindow as (Window & { __rahscanSetPin?: (lat: number, lng: number) => void }) | null;
    pushPin(win, coords);
  }, [coords]);

  return (
    <View style={styles.wrap}>
      {createElement('iframe', {
        ref: iframeRef,
        srcDoc: html,
        title: 'Pick a location on the map',
        style: {
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          backgroundColor: 'transparent',
        },
        onLoad: () => {
          readyRef.current = true;
          const win = iframeRef.current?.contentWindow as (Window & { __rahscanSetPin?: (lat: number, lng: number) => void }) | null;
          pushPin(win, coordsRef.current);
        },
      })}
    </View>
  );
}

function NativeLocationPicker({ coords, onPick, html }: Props & { html: string }) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const onPickRef = useRef(onPick);
  const coordsRef = useRef(coords);
  onPickRef.current = onPick;
  coordsRef.current = coords;

  const sendPin = (next?: GeoCoords) => {
    if (!next) return;
    webRef.current?.injectJavaScript(
      `window.__rahscanSetPin && window.__rahscanSetPin(${next.lat}, ${next.lng}); true;`,
    );
  };

  useEffect(() => {
    if (!readyRef.current) return;
    sendPin(coords);
  }, [coords]);

  const onMessage = (event: WebViewMessageEvent) => {
    const picked = parsePick(event.nativeEvent.data);
    if (picked) onPickRef.current(picked);
  };

  return (
    <View style={styles.wrap}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={onMessage}
        onLoadEnd={() => {
          readyRef.current = true;
          sendPin(coordsRef.current);
        }}
        setSupportMultipleWindows={false}
        mixedContentMode="compatibility"
      />
    </View>
  );
}

export function LocationPickerMap({ coords, onPick }: Props) {
  const html = useMemo(() => buildMapHtml(), []);
  if (Platform.OS === 'web') {
    return <WebLocationPicker coords={coords} onPick={onPick} html={html} />;
  }
  return <NativeLocationPicker coords={coords} onPick={onPick} html={html} />;
}

const styles = StyleSheet.create({
  wrap: {
    height: 280,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: '#D7E4E8',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
