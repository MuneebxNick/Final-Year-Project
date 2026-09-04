import { createElement, useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { Severity } from '../models/report';
import { colors, radii } from '../theme';

export type LeafletHeatPoint = {
  id?: string;
  lat: number;
  lng: number;
  severity: Severity;
};

type HeatPoint = {
  id: string;
  lat: number;
  lng: number;
  weight: number;
  severity: Severity;
};

type Props = {
  points: LeafletHeatPoint[];
  interactive?: boolean;
  onSelectReport?: (reportId: string) => void;
  fillHeight?: boolean;
};

/** Severity → leaflet.heat intensity. Small=1, Medium=2, Large=3 */
const SEVERITY_WEIGHT: Record<Severity, number> = {
  small: 1,
  medium: 2,
  large: 3,
};

function toHeatPoints(points: LeafletHeatPoint[]): HeatPoint[] {
  return points.map((point, index) => ({
    id: point.id ?? `p-${index}`,
    lat: point.lat,
    lng: point.lng,
    weight: SEVERITY_WEIGHT[point.severity],
    severity: point.severity,
  }));
}

function parseSelectMessage(raw: string): string | null {
  try {
    const payload = JSON.parse(raw) as { type?: string; reportId?: string };
    if (payload?.type === 'selectReport' && typeof payload.reportId === 'string') {
      return payload.reportId;
    }
  } catch {
    // Ignore malformed messages
  }
  return null;
}

function buildMapHtml(interactive: boolean, showCircles: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #D7E4E8; }
    .leaflet-container { font: 12px/1.4 system-ui, sans-serif; }
    #empty {
      display: none;
      position: absolute;
      z-index: 500;
      left: 50%;
      top: 12px;
      transform: translateX(-50%);
      background: rgba(255,255,255,0.92);
      color: #5F7178;
      padding: 6px 12px;
      border-radius: 8px;
      font: 600 13px/1.3 system-ui, sans-serif;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(15,58,67,0.12);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="empty">No located reports</div>
  <script>
    (function () {
      var INTERACTIVE = ${interactive ? 'true' : 'false'};
      var SHOW_CIRCLES = ${showCircles ? 'true' : 'false'};

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
      }).setView([30.0, 69.0], 5);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      var heat = null;
      var circleLayer = null;
      var points = [];
      var emptyEl = document.getElementById('empty');

      function postSelect(reportId) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'selectReport', reportId: reportId })
        );
      }

      function nearestPoint(latlng, maxMeters) {
        var best = null;
        var bestDist = Infinity;
        for (var i = 0; i < points.length; i++) {
          var p = points[i];
          var d = map.distance(latlng, L.latLng(p.lat, p.lng));
          if (d < bestDist) {
            bestDist = d;
            best = p;
          }
        }
        if (best && bestDist <= maxMeters) return best;
        return null;
      }

      function severityColor(severity) {
        if (severity === 'large') return '#E24B4A';
        if (severity === 'medium') return '#E08A1E';
        return '#1B9A5B';
      }

      if (INTERACTIVE) {
        map.on('click', function (e) {
          var zoom = map.getZoom();
          var threshold = Math.max(80, 4000 / Math.pow(2, Math.max(0, zoom - 5)));
          var hit = nearestPoint(e.latlng, threshold);
          if (hit && hit.id) postSelect(hit.id);
        });
      }

      window.__rahscanSetPoints = function (pointsJson) {
        try {
          points = typeof pointsJson === 'string' ? JSON.parse(pointsJson) : pointsJson;
        } catch (err) {
          points = [];
        }
        if (!Array.isArray(points)) points = [];

        if (heat) {
          map.removeLayer(heat);
          heat = null;
        }
        if (circleLayer) {
          map.removeLayer(circleLayer);
          circleLayer = null;
        }

        if (points.length === 0) {
          emptyEl.style.display = 'block';
          map.setView([30.0, 69.0], 5);
          return;
        }

        emptyEl.style.display = 'none';
        // Intensity = severity weight (Small=1, Medium=2, Large=3); density stacks nearby points.
        var heatData = points.map(function (p) {
          return [p.lat, p.lng, p.weight];
        });
        heat = L.heatLayer(heatData, {
          radius: 28,
          blur: 22,
          maxZoom: 17,
          max: 3,
          minOpacity: 0.35,
        }).addTo(map);

        if (SHOW_CIRCLES) {
          circleLayer = L.layerGroup();
          for (var i = 0; i < points.length; i++) {
            var p = points[i];
            var color = severityColor(p.severity);
            L.circleMarker([p.lat, p.lng], {
              radius: 4 + (p.weight || 1) * 3,
              color: color,
              fillColor: color,
              fillOpacity: 0.65,
              weight: 1,
              opacity: 0.9,
              interactive: false,
            }).addTo(circleLayer);
          }
          circleLayer.addTo(map);
        }

        var bounds = L.latLngBounds(points.map(function (p) {
          return [p.lat, p.lng];
        }));
        map.fitBounds(bounds.pad(0.25), { maxZoom: 14, animate: false });
      };

      window.__rahscanSetPoints('[]');
    })();
  </script>
</body>
</html>`;
}

function WebLeafletHeatmap({
  points: inputPoints,
  interactive,
  onSelectReport,
  fillHeight,
  html,
}: Props & { interactive: boolean; html: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const onSelectRef = useRef(onSelectReport);
  onSelectRef.current = onSelectReport;

  const points = useMemo(() => toHeatPoints(inputPoints), [inputPoints]);
  const pointsJson = useMemo(() => JSON.stringify(points), [points]);

  const pushPoints = useCallback((json: string) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      // Same contract as WebView injectJavaScript: call __rahscanSetPoints with the JSON string.
      const setPoints = (
        win as Window & { __rahscanSetPoints?: (pointsJson: string) => void }
      ).__rahscanSetPoints;
      if (typeof setPoints === 'function') {
        setPoints(json);
      }
    } catch {
      // Cross-origin or not ready yet
    }
  }, []);

  useEffect(() => {
    if (!interactive) return;
    const onWindowMessage = (event: MessageEvent) => {
      // Only accept messages from our iframe (srcDoc → about:srcdoc / null origin).
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
        return;
      }
      const raw = typeof event.data === 'string' ? event.data : null;
      if (!raw) return;
      const reportId = parseSelectMessage(raw);
      if (reportId) onSelectRef.current?.(reportId);
    };

    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
  }, [interactive]);

  useEffect(() => {
    if (!readyRef.current) return;
    pushPoints(pointsJson);
  }, [pointsJson, pushPoints]);

  return (
    <View style={[styles.wrap, fillHeight && styles.wrapFill]}>
      {createElement('iframe', {
        ref: iframeRef,
        srcDoc: html,
        title: 'RahScan city heatmap',
        style: {
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          backgroundColor: 'transparent',
        },
        onLoad: () => {
          readyRef.current = true;
          pushPoints(pointsJson);
        },
      })}
    </View>
  );
}

function NativeLeafletHeatmap({
  points: inputPoints,
  interactive,
  onSelectReport,
  fillHeight,
  html,
}: Props & { interactive: boolean; html: string }) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const points = useMemo(() => toHeatPoints(inputPoints), [inputPoints]);
  const pointsJson = useMemo(() => JSON.stringify(points), [points]);

  const pushPoints = (json: string) => {
    webRef.current?.injectJavaScript(
      `window.__rahscanSetPoints && window.__rahscanSetPoints(${JSON.stringify(json)}); true;`,
    );
  };

  useEffect(() => {
    if (!readyRef.current) return;
    pushPoints(pointsJson);
  }, [pointsJson]);

  const onMessage = (event: WebViewMessageEvent) => {
    if (!interactive) return;
    const reportId = parseSelectMessage(event.nativeEvent.data);
    if (reportId) onSelectReport?.(reportId);
  };

  return (
    <View style={[styles.wrap, fillHeight && styles.wrapFill]}>
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
          pushPoints(pointsJson);
        }}
        setSupportMultipleWindows={false}
        mixedContentMode="compatibility"
      />
    </View>
  );
}

export function AdminLeafletHeatmap({
  points,
  interactive = true,
  onSelectReport,
  fillHeight = false,
}: Props) {
  const showCircles = !interactive;
  const html = useMemo(
    () => buildMapHtml(interactive, showCircles),
    [interactive, showCircles],
  );
  const shared = { points, interactive, onSelectReport, fillHeight, html };
  if (Platform.OS === 'web') {
    return <WebLeafletHeatmap {...shared} />;
  }
  return <NativeLeafletHeatmap {...shared} />;
}

const styles = StyleSheet.create({
  wrap: {
    height: 360,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: '#D7E4E8',
  },
  wrapFill: {
    height: 560,
    minHeight: 520,
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
